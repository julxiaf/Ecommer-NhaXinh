package vn.nhaxinh.payment;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.regex.Pattern;
import org.slf4j.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.MultiValueMap;
import vn.nhaxinh.audit.AuditLogService;
import vn.nhaxinh.cart.*;
import vn.nhaxinh.coupon.Coupon;
import vn.nhaxinh.coupon.CouponService;
import vn.nhaxinh.inventory.*;
import vn.nhaxinh.order.*;
import vn.nhaxinh.risk.*;
import vn.nhaxinh.security.*;
import vn.nhaxinh.user.*;

@Service
@Transactional
public class CheckoutService {

    private static final Logger log = LoggerFactory.getLogger(CheckoutService.class);
    private static final BigDecimal ZERO = BigDecimal.ZERO;

    // Pattern số điện thoại di động Việt Nam (10 số, đầu 03, 05, 07, 08, 09)
    private static final Pattern VN_PHONE_PATTERN = Pattern.compile("^(0[35789])[0-9]{8}$");

    // Danh sách từ khóa địa chỉ rác / ảo
    private static final Set<String> JUNK_ADDRESS_KEYWORDS = Set.of(
            "test", "demo", "dia chi ao", "khong co", "asdf", "qwer", "null", "undefined",
            "abcxyz", "xxxx", "123456", "nhatao", "khongbiet", "khong biet", "diachi", "aoao"
    );

    private final CartService cartService;
    private final UserService userService;
    private final OrderService orderService;
    private final OrderRepository orderRepository;
    private final PaymentRepository paymentRepository;
    private final PaymentWebhookEventRepository webhookRepository;
    private final InventoryService inventoryService;
    private final AuditLogService auditLogService;
    private final VnPayService vnPayService;
    private final OrderRiskService orderRiskService;
    private final ObjectMapper objectMapper;
    private final CouponService couponService;

    // Lưu tạm các phiên thanh toán VNPay chờ callback thành công mới tạo Order & Payment
    private final Map<String, PendingVnPayCheckout> pendingVnPayCheckouts = new ConcurrentHashMap<>();
    private final Map<String, Order> completedVnPayOrders = new ConcurrentHashMap<>();

    public CheckoutService(
            CartService cartService,
            UserService userService,
            OrderService orderService,
            OrderRepository orderRepository,
            PaymentRepository paymentRepository,
            PaymentWebhookEventRepository webhookRepository,
            InventoryService inventoryService,
            AuditLogService auditLogService,
            VnPayService vnPayService,
            OrderRiskService orderRiskService,
            ObjectMapper objectMapper
    ) {
        this(
                cartService,
                userService,
                orderService,
                orderRepository,
                paymentRepository,
                webhookRepository,
                inventoryService,
                auditLogService,
                vnPayService,
                orderRiskService,
                objectMapper,
                null
        );
    }

    @Autowired
    public CheckoutService(
            CartService cartService,
            UserService userService,
            OrderService orderService,
            OrderRepository orderRepository,
            PaymentRepository paymentRepository,
            PaymentWebhookEventRepository webhookRepository,
            InventoryService inventoryService,
            AuditLogService auditLogService,
            VnPayService vnPayService,
            OrderRiskService orderRiskService,
            ObjectMapper objectMapper,
            CouponService couponService
    ) {
        this.cartService = cartService;
        this.userService = userService;
        this.orderService = orderService;
        this.orderRepository = orderRepository;
        this.paymentRepository = paymentRepository;
        this.webhookRepository = webhookRepository;
        this.inventoryService = inventoryService;
        this.auditLogService = auditLogService;
        this.vnPayService = vnPayService;
        this.orderRiskService = orderRiskService;
        this.objectMapper = objectMapper;
        this.couponService = couponService;
    }

    public CheckoutResponse checkout(
            CheckoutRequest request,
            String username,
            String cartToken,
            String clientIp
    ) {
        // 1. Kiểm tra tính hợp lệ của địa chỉ, SĐT và cấu hình thanh toán trước khi truy vấn/khóa DB
        validateRecipientInfo(request.shippingAddress(), request.recipientPhone(), request.recipientName());

        if ("VNPAY".equals(request.paymentMethod()) && !vnPayService.isConfigured()) {
            throw new ApiException(ApiErrorCode.PAYMENT_FAILED, "Cổng thanh toán VNPay tạm thời chưa sẵn sàng. Vui lòng chọn phương thức khác.");
        }

        // 2. Kiểm tra tài khoản và giỏ hàng (đã JOIN FETCH variant + product để tránh N+1)
        User user = username == null
                ? null
                : userService.findByUsername(username)
                        .orElseThrow(() -> new ApiException(ApiErrorCode.AUTH_UNAUTHENTICATED, "Không tìm thấy tài khoản người dùng"));
        Cart cart = user != null
                ? cartService.getOrCreateCart(user, null)
                : cartService.getActiveCartBySession(requireCartToken(cartToken))
                        .orElseThrow(() -> new ApiException(ApiErrorCode.CART_EMPTY, "Không tìm thấy giỏ hàng đang hoạt động"));
        List<CartItem> cartItems = cartService.getItems(cart.getId());
        if (cartItems.isEmpty()) {
            throw new ApiException(ApiErrorCode.CART_EMPTY, "Giỏ hàng của bạn đang trống");
        }

        // 3. Kiểm tra nhanh trạng thái, số lượng, đơn giá các mặt hàng trên bộ nhớ trước khi khóa tồn kho
        List<Long> variantIds = new ArrayList<>(cartItems.size());
        for (CartItem cartItem : cartItems) {
            var variant = cartItem.getVariant();
            if (variant == null || variant.getProduct() == null) {
                throw new ApiException(ApiErrorCode.PRODUCT_NOT_FOUND, "Có sản phẩm trong giỏ không còn tồn tại trên hệ thống");
            }
            if (!"ACTIVE".equalsIgnoreCase(variant.getStatus())
                    || !"ACTIVE".equalsIgnoreCase(variant.getProduct().getStatus())) {
                throw new ApiException(ApiErrorCode.PRODUCT_NOT_FOUND,
                        "Sản phẩm '" + variant.getProduct().getName() + " (" + variant.getName() + ")' đã ngừng kinh doanh.");
            }
            if (cartItem.getQuantity() == null || cartItem.getQuantity() <= 0) {
                throw new ApiException(ApiErrorCode.VALIDATION_FAILED,
                        "Số lượng đặt mua của sản phẩm '" + variant.getName() + "' không hợp lệ.");
            }
            if (variant.getPrice() == null || variant.getPrice().compareTo(ZERO) <= 0) {
                throw new ApiException(ApiErrorCode.VALIDATION_FAILED,
                        "Đơn giá của sản phẩm '" + variant.getName() + "' không hợp lệ (phải lớn hơn 0).");
            }
            variantIds.add(variant.getId());
        }

        // 4. Đánh giá rủi ro, phát hiện spam đặt đơn nhiều tỉnh thành trong thời gian ngắn
        RiskEvaluation riskEvaluation = assessRiskAndMultiProvinceSpam(request, clientIp);

        String normalizedMethod = request.paymentMethod() != null ? request.paymentMethod().trim().toUpperCase() : "";

        // 5. Khóa bi quan PESSIMISTIC_WRITE toàn bộ tồn kho cần thiết trong 1 câu truy vấn duy nhất (theo thứ tự ID tăng dần để chống Deadlock)
        Map<Long, Inventory> lockedInventories = inventoryService.findAllByVariantIdsForUpdate(variantIds);

        BigDecimal subtotal = ZERO;
        for (CartItem cartItem : cartItems) {
            var variant = cartItem.getVariant();
            Inventory inventory = lockedInventories.get(variant.getId());
            if (inventory == null) {
                throw new ApiException(ApiErrorCode.PRODUCT_OUT_OF_STOCK,
                        "Sản phẩm '" + variant.getName() + "' (SKU: " + variant.getSku() + ") hiện chưa sẵn sàng xuất kho.");
            }
            int availableQuantity = inventory.getAvailableQuantity();
            if (availableQuantity < cartItem.getQuantity()) {
                throw new ApiException(ApiErrorCode.PRODUCT_INSUFFICIENT_STOCK,
                        String.format("Sản phẩm '%s' (SKU: %s) không đủ tồn kho (Còn: %d, yêu cầu: %d). Vui lòng cập nhật lại giỏ hàng.",
                                variant.getName(), variant.getSku(), Math.max(0, availableQuantity), cartItem.getQuantity()));
            }
            BigDecimal lineTotal = variant.getPrice().multiply(BigDecimal.valueOf(cartItem.getQuantity()));
            subtotal = subtotal.add(lineTotal);
        }

        if (subtotal.compareTo(ZERO) <= 0) {
            throw new ApiException(ApiErrorCode.VALIDATION_FAILED, "Tổng giá trị đơn hàng không hợp lệ (phải lớn hơn 0).");
        }

        BigDecimal shippingFee = request.shippingFee() != null && request.shippingFee().compareTo(ZERO) >= 0
                ? request.shippingFee()
                : ZERO;
        CouponEvaluation couponEval = evaluateCoupon(
                request.couponCode(),
                subtotal,
                shippingFee,
                user != null ? user.getId() : null
        );
        BigDecimal discountAmount = couponEval.discountAmount();
        BigDecimal totalAmount = subtotal.add(shippingFee).subtract(discountAmount).max(ZERO);
        if (totalAmount.compareTo(ZERO) <= 0) {
            throw new ApiException(ApiErrorCode.VALIDATION_FAILED, "Tổng tiền thanh toán sau giảm giá phải lớn hơn 0.");
        }

        String generatedOrderCode = "NX" + UUID.randomUUID().toString().replace("-", "").substring(0, 20).toUpperCase();

        // NẾU LÀ VNPAY: Chưa lưu vào Order và Payment cho đến khi VNPay trả về thanh toán thành công
        if ("VNPAY".equals(normalizedMethod)) {
            String transactionCode = UUID.randomUUID().toString().replace("-", "");
            PendingVnPayCheckout pending = new PendingVnPayCheckout(
                    transactionCode,
                    generatedOrderCode,
                    user != null ? user.getId() : null,
                    cart.getId(),
                    request,
                    clientIp,
                    subtotal,
                    shippingFee,
                    discountAmount,
                    couponEval.couponCode(),
                    totalAmount,
                    riskEvaluation,
                    LocalDateTime.now()
            );
            pendingVnPayCheckouts.put(transactionCode, pending);

            String paymentUrl = vnPayService.createPaymentUrl(transactionCode, generatedOrderCode, totalAmount, clientIp);
            log.info("[CHECKOUT-VNPAY-INIT] Chờ xác nhận VNPay cho orderCode={} txnRef={} subtotal={} shippingFee={} discount={} coupon={} totalAmount={} user={} paymentUrl={}",
                    generatedOrderCode, transactionCode, subtotal, shippingFee, discountAmount, couponEval.couponCode(), totalAmount,
                    user != null ? user.getId() : "guest", paymentUrl);

            return new CheckoutResponse(
                    null,
                    generatedOrderCode,
                    "PENDING_PAYMENT",
                    "UNPAID",
                    totalAmount,
                    null,
                    "VNPAY",
                    "PENDING",
                    paymentUrl
            );
        }

        Order order = new Order();
        order.setOrderCode(generatedOrderCode);
        order.setUser(user);
        order.setRecipientName(request.recipientName().trim());
        order.setRecipientPhone(request.recipientPhone().trim());
        order.setRecipientEmail(request.recipientEmail() != null ? request.recipientEmail().trim() : null);
        order.setShippingAddress(request.shippingAddress().trim());
        order.setCouponCode(couponEval.couponCode());
        order.setDiscountAmount(discountAmount);
        order.setShippingFee(shippingFee);
        order.setCustomerNote(request.customerNote());
        order.setOrderStatus("PENDING");
        order.setPaymentStatus("UNPAID");

        List<InventoryMovement> movements = new ArrayList<>(cartItems.size());

        // Giữ hàng và khởi tạo OrderItem cho phương thức COD / BANK_TRANSFER
        for (CartItem cartItem : cartItems) {
            var variant = cartItem.getVariant();
            Inventory inventory = lockedInventories.get(variant.getId());
            inventory.setQuantityReserved(inventory.getQuantityReserved() + cartItem.getQuantity());
            movements.add(buildInventoryMovement(variant, "RESERVE", cartItem.getQuantity(), null, "Giữ hàng khi checkout đơn hàng"));

            BigDecimal lineTotal = variant.getPrice().multiply(BigDecimal.valueOf(cartItem.getQuantity()));

            OrderItem orderItem = new OrderItem();
            orderItem.setOrder(order);
            orderItem.setVariant(variant);
            orderItem.setProductName(variant.getProduct().getName());
            orderItem.setSku(variant.getSku());
            orderItem.setVariantName(variant.getName());
            orderItem.setOptionValues(variant.getOptionValues());
            orderItem.setUnitPrice(variant.getPrice());
            orderItem.setQuantity(cartItem.getQuantity());
            orderItem.setDiscountAmount(ZERO);
            orderItem.setLineTotal(lineTotal);
            order.getItems().add(orderItem);
        }

        // Lưu tồn kho theo lô (batch) thay vì lưu lẻ từng dòng trong vòng lặp
        inventoryService.saveAll(lockedInventories.values());

        // 6. Lưu đơn hàng và ghi nhật ký biến động tồn kho theo lô (kèm mã ID đơn hàng)
        order.setSubtotal(subtotal);
        order.setTotalAmount(totalAmount);
        order = orderService.createOrder(order);

        Long createdOrderId = order.getId();
        movements.forEach(m -> m.setReferenceId(createdOrderId));
        inventoryService.recordMovements(movements);

        // Ghi nhận lượt sử dụng mã giảm giá vào bảng coupon_usages (nếu là mã trong DB)
        if (couponEval.dbCoupon() != null && couponService != null) {
            couponService.recordUsage(couponEval.dbCoupon(), user, createdOrderId, discountAmount);
        }

        // 7. Khởi tạo bản ghi thanh toán / Hóa đơn (Payment)
        Payment payment = new Payment();
        payment.setOrder(order);
        payment.setPaymentType("FULL_PAYMENT");
        payment.setPaymentMethod(request.paymentMethod());
        payment.setAmount(order.getTotalAmount());
        payment.setPaymentStatus("PENDING");
        payment.setTransactionCode(UUID.randomUUID().toString().replace("-", ""));
        payment = paymentRepository.saveAndFlush(payment);

        // 8. Ghi nhận đánh giá rủi ro & Cảnh báo (nếu phát hiện nghi vấn)
        recordRiskIfSuspicious(order, riskEvaluation);

        cart.setStatus("CONVERTED");
        cartService.save(cart);

        log.info("[CHECKOUT] orderCode={} paymentId={} method={} amount={} riskScore={} user={}",
                order.getOrderCode(), payment.getId(), payment.getPaymentMethod(),
                payment.getAmount(), riskEvaluation.riskScore(), user != null ? user.getId() : "guest");
        auditLogService.record(user, "CHECKOUT_CREATED", "ORDER", order.getId().toString(),
                json(Map.of(
                        "orderCode", order.getOrderCode(),
                        "paymentId", payment.getId(),
                        "paymentMethod", payment.getPaymentMethod(),
                        "amount", payment.getAmount(),
                        "itemCount", cartItems.size()
                )), clientIp);

        return new CheckoutResponse(
                order.getId(),
                order.getOrderCode(),
                order.getOrderStatus(),
                order.getPaymentStatus(),
                order.getTotalAmount(),
                payment.getId(),
                payment.getPaymentMethod(),
                payment.getPaymentStatus(),
                null
        );
    }

    @Transactional(readOnly = true)
    public Page<Payment> listPayments(Pageable pageable) {
        return paymentRepository.findAll(pageable);
    }

    @Transactional(readOnly = true)
    public Payment getPayment(Long paymentId) {
        return paymentRepository.findById(paymentId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy giao dịch thanh toán"));
    }

    @Transactional(readOnly = true)
    public List<Payment> getPaymentsForOrder(String orderCode, String username, String phone) {
        Order order = findOwnedOrder(orderCode, username, phone);
        return paymentRepository.findByOrderId(order.getId());
    }

    public CheckoutResponse retryPayment(
            String orderCode,
            RetryPaymentRequest request,
            String username,
            String phone,
            String clientIp
    ) {
        Order order = findOwnedOrder(orderCode, username, phone);
        if (!"PENDING".equals(order.getOrderStatus())
                || "PAID".equals(order.getPaymentStatus())
                || paymentRepository.findByOrderId(order.getId()).stream()
                        .anyMatch(payment -> "PENDING".equals(payment.getPaymentStatus()))) {
            throw new IllegalStateException("Đơn hàng hiện không thể thanh toán lại");
        }
        if ("VNPAY".equals(request.paymentMethod()) && !vnPayService.isConfigured()) {
            throw new IllegalStateException("VNPay chưa được cấu hình");
        }

        List<OrderItem> orderItems = orderService.getOrderItems(order.getId());
        List<Long> variantIds = orderItems.stream()
                .map(OrderItem::getVariant)
                .filter(Objects::nonNull)
                .map(vn.nhaxinh.catalog.ProductVariant::getId)
                .toList();
        Map<Long, Inventory> lockedInventories = inventoryService.findAllByVariantIdsForUpdate(variantIds);
        List<InventoryMovement> movements = new ArrayList<>(orderItems.size());

        for (var item : orderItems) {
            if (item.getVariant() == null) {
                continue;
            }
            Inventory inventory = lockedInventories.get(item.getVariant().getId());
            if (inventory == null) {
                throw new IllegalArgumentException("Không tìm thấy tồn kho cho đơn hàng");
            }
            if (inventory.getAvailableQuantity() < item.getQuantity()) {
                throw new IllegalArgumentException("Không đủ tồn kho để thanh toán lại đơn hàng");
            }
            inventory.setQuantityReserved(inventory.getQuantityReserved() + item.getQuantity());
            movements.add(buildInventoryMovement(item.getVariant(), "RESERVE", item.getQuantity(), order.getId(),
                    "Giữ hàng khi thanh toán lại đơn " + order.getOrderCode()));
        }
        inventoryService.saveAll(lockedInventories.values());
        inventoryService.recordMovements(movements);

        Payment payment = new Payment();
        payment.setOrder(order);
        payment.setPaymentType("FULL_PAYMENT");
        payment.setPaymentMethod(request.paymentMethod());
        payment.setAmount(order.getTotalAmount());
        payment.setPaymentStatus("PENDING");
        payment.setTransactionCode(UUID.randomUUID().toString().replace("-", ""));
        payment = paymentRepository.saveAndFlush(payment);
        order.setPaymentStatus("UNPAID");
        orderRepository.save(order);

        String paymentUrl = "VNPAY".equals(request.paymentMethod())
                ? vnPayService.createPaymentUrl(payment, clientIp)
                : null;
        auditLogService.record(order.getUser(), "PAYMENT_RETRY_CREATED", "ORDER", order.getId().toString(),
                json(Map.of(
                        "orderCode", order.getOrderCode(),
                        "paymentId", payment.getId(),
                        "paymentMethod", payment.getPaymentMethod(),
                        "amount", payment.getAmount()
                )), clientIp);
        log.info("[PAYMENT-RETRY] orderCode={} paymentId={} method={} amount={}",
                order.getOrderCode(), payment.getId(), payment.getPaymentMethod(), payment.getAmount());
        return new CheckoutResponse(
                order.getId(), order.getOrderCode(), order.getOrderStatus(), order.getPaymentStatus(),
                order.getTotalAmount(), payment.getId(), payment.getPaymentMethod(),
                payment.getPaymentStatus(), paymentUrl);
    }

    public Payment updatePaymentStatus(Long paymentId, String newStatus, String actorIp, User actor) {
        Payment payment = getPayment(paymentId);
        String oldStatus = payment.getPaymentStatus();
        if (!"PENDING".equals(oldStatus)) {
            throw new IllegalStateException("Chỉ giao dịch đang chờ mới được cập nhật");
        }
        if (!List.of("PAID", "SUCCESS", "FAILED", "CANCELLED").contains(newStatus)) {
            throw new IllegalArgumentException("Trạng thái thanh toán không hợp lệ");
        }
        if ("VNPAY".equals(payment.getPaymentMethod()) && ("PAID".equalsIgnoreCase(newStatus) || "SUCCESS".equalsIgnoreCase(newStatus))) {
            throw new IllegalArgumentException("Thanh toán VNPay chỉ được xác nhận qua callback đã ký");
        }
        updatePaymentAndOrder(payment, newStatus, "ADMIN", null);
        auditLogService.record(actor, "PAYMENT_STATUS_CHANGED", "PAYMENT", paymentId.toString(),
                json(Map.of("oldStatus", oldStatus, "newStatus", newStatus)), actorIp);
        log.info("[PAYMENT-STATUS] paymentId={} orderCode={} oldStatus={} newStatus={} actor={}",
                paymentId, payment.getOrder().getOrderCode(), oldStatus, newStatus,
                actor != null ? actor.getId() : "system");
        return payment;
    }

    public CallbackResult processVnPayNotification(MultiValueMap<String, String> parameters) {
        if (!vnPayService.verify(parameters)) {
            log.warn("[VNPAY-IPN] Rejected invalid signature");
            return new CallbackResult("97", "Invalid signature");
        }
        String transactionCode = parameters.getFirst("vnp_TxnRef");
        String transactionId = parameters.getFirst("vnp_TransactionNo");
        String responseCode = parameters.getFirst("vnp_ResponseCode");
        String transactionStatus = parameters.getFirst("vnp_TransactionStatus");
        String eventId = transactionId == null || transactionId.isBlank()
                ? transactionCode
                : transactionId;
        if (transactionCode == null || eventId == null) {
            return new CallbackResult("01", "Missing transaction reference");
        }
        if (completedVnPayOrders.containsKey(transactionCode)
                || webhookRepository.findByProviderAndEventId("VNPAY", eventId).isPresent()) {
            return new CallbackResult("00", "Confirm Success");
        }

        String amountValue = parameters.getFirst("vnp_Amount");
        String terminalCode = parameters.getFirst("vnp_TmnCode");

        // 1. Xử lý phiên thanh toán VNPay mới (chỉ khi thành công mới tạo Order & Payment)
        PendingVnPayCheckout pending = pendingVnPayCheckouts.get(transactionCode);
        if (pending != null) {
            if (!vnPayService.isConfigured()
                    || !pending.totalAmount().movePointRight(2).toBigInteger().toString().equals(amountValue)
                    || !terminalCodeIsExpected(terminalCode)) {
                return new CallbackResult("04", "Invalid payment amount or merchant");
            }

            boolean isSuccess = "00".equals(responseCode) && (transactionStatus == null || "00".equals(transactionStatus));
            pendingVnPayCheckouts.remove(transactionCode);

            if (!isSuccess) {
                log.info("[VNPAY-RETURN] Giao dịch không thành công hoặc bị hủy (responseCode={}), KHÔNG tạo Order & Payment cho orderCode={}",
                        responseCode, pending.orderCode());
                return new CallbackResult("00", "Payment Cancelled or Failed");
            }

            User user = pending.userId() != null ? userService.findById(pending.userId()).orElse(null) : null;
            Cart cart = cartService.getCartById(pending.cartId());
            List<CartItem> cartItems = cartService.getItems(cart.getId());
            List<Long> variantIds = cartItems.stream()
                    .map(CartItem::getVariant)
                    .filter(Objects::nonNull)
                    .map(vn.nhaxinh.catalog.ProductVariant::getId)
                    .toList();
            Map<Long, Inventory> lockedInventories = inventoryService.findAllByVariantIdsForUpdate(variantIds);

            Order order = new Order();
            order.setOrderCode(pending.orderCode());
            order.setUser(user);
            order.setRecipientName(pending.request().recipientName().trim());
            order.setRecipientPhone(pending.request().recipientPhone().trim());
            order.setRecipientEmail(pending.request().recipientEmail() != null ? pending.request().recipientEmail().trim() : null);
            order.setShippingAddress(pending.request().shippingAddress().trim());
            order.setSubtotal(pending.subtotal());
            order.setCouponCode(pending.couponCode());
            order.setDiscountAmount(pending.discountAmount());
            order.setShippingFee(pending.shippingFee());
            order.setTotalAmount(pending.totalAmount());
            order.setCustomerNote(pending.request().customerNote());
            order.setOrderStatus("CONFIRMED");
            order.setPaymentStatus("PAID");

            List<InventoryMovement> movements = new ArrayList<>(cartItems.size());
            for (CartItem cartItem : cartItems) {
                var variant = cartItem.getVariant();
                Inventory inventory = lockedInventories.get(variant.getId());
                if (inventory != null) {
                    inventory.setQuantityOnHand(Math.max(0, inventory.getQuantityOnHand() - cartItem.getQuantity()));
                    movements.add(buildInventoryMovement(variant, "OUT", cartItem.getQuantity(), null,
                            "Xác nhận thanh toán VNPay đơn " + pending.orderCode()));
                }

                BigDecimal lineTotal = variant.getPrice().multiply(BigDecimal.valueOf(cartItem.getQuantity()));
                OrderItem orderItem = new OrderItem();
                orderItem.setOrder(order);
                orderItem.setVariant(variant);
                orderItem.setProductName(variant.getProduct().getName());
                orderItem.setSku(variant.getSku());
                orderItem.setVariantName(variant.getName());
                orderItem.setOptionValues(variant.getOptionValues());
                orderItem.setUnitPrice(variant.getPrice());
                orderItem.setQuantity(cartItem.getQuantity());
                orderItem.setDiscountAmount(ZERO);
                orderItem.setLineTotal(lineTotal);
                order.getItems().add(orderItem);
            }

            inventoryService.saveAll(lockedInventories.values());
            order = orderService.createOrder(order);

            Long createdOrderId = order.getId();
            movements.forEach(m -> m.setReferenceId(createdOrderId));
            inventoryService.recordMovements(movements);

            if (pending.couponCode() != null && couponService != null) {
                couponService.findByCode(pending.couponCode())
                        .ifPresent(c -> couponService.recordUsage(c, user, createdOrderId, pending.discountAmount()));
            }

            Payment payment = new Payment();
            payment.setOrder(order);
            payment.setPaymentType("FULL_PAYMENT");
            payment.setPaymentMethod("VNPAY");
            payment.setAmount(order.getTotalAmount());
            payment.setPaymentStatus("SUCCESS");
            payment.setPaidAt(LocalDateTime.now());
            payment.setTransactionCode(transactionCode);
            payment.setProviderReference(transactionId);
            payment = paymentRepository.saveAndFlush(payment);

            recordRiskIfSuspicious(order, pending.riskEvaluation());

            cart.setStatus("CONVERTED");
            cartService.save(cart);

            PaymentWebhookEvent event = new PaymentWebhookEvent();
            event.setProvider("VNPAY");
            event.setEventId(eventId);
            event.setEventType(responseCode == null ? "00" : responseCode);
            event.setPayload(json(parameters.toSingleValueMap()));
            event.setProcessingStatus("PROCESSED");
            event.setProcessedAt(LocalDateTime.now());
            webhookRepository.save(event);

            completedVnPayOrders.put(transactionCode, order);

            auditLogService.record(user, "CHECKOUT_CREATED", "ORDER", order.getId().toString(),
                    json(Map.of(
                            "orderCode", order.getOrderCode(),
                            "paymentId", payment.getId(),
                            "paymentMethod", "VNPAY",
                            "amount", payment.getAmount(),
                            "providerReference", transactionId == null ? "" : transactionId
                    )), pending.clientIp());
            log.info("[VNPAY-SUCCESS] Đã tạo Order & Payment sau khi thanh toán thành công: orderCode={} paymentId={} transactionId={}",
                    order.getOrderCode(), payment.getId(), transactionId);
            return new CallbackResult("00", "Confirm Success");
        }

        // 2. Fallback cho các đơn hàng đã tạo trước đó (ví dụ retryPayment)
        Payment payment = paymentRepository.findByTransactionCode(transactionCode).orElse(null);
        if (payment == null) {
            return new CallbackResult("01", "Order not found");
        }
        if (!vnPayService.isConfigured()
                || !payment.getAmount().movePointRight(2).toBigInteger().toString().equals(amountValue)
                || !terminalCodeIsExpected(terminalCode)) {
            return new CallbackResult("04", "Invalid payment amount or merchant");
        }

        PaymentWebhookEvent event = new PaymentWebhookEvent();
        event.setProvider("VNPAY");
        event.setEventId(eventId);
        event.setEventType(responseCode == null ? "UNKNOWN" : responseCode);
        event.setPayload(json(parameters.toSingleValueMap()));
        event.setProcessingStatus("PROCESSING");
        webhookRepository.save(event);

        if ("PENDING".equals(payment.getPaymentStatus())) {
            String nextStatus = "00".equals(responseCode) && "00".equals(transactionStatus)
                    ? "SUCCESS"
                    : "FAILED";
            updatePaymentAndOrder(payment, nextStatus, "VNPAY", transactionId);
            event.setProcessingStatus("PROCESSED");
            event.setProcessedAt(LocalDateTime.now());
            auditLogService.record(payment.getOrder().getUser(), "VNPAY_CALLBACK_PROCESSED",
                    "PAYMENT", payment.getId().toString(),
                    json(Map.of("status", nextStatus, "providerReference", transactionId == null ? "" : transactionId)),
                    null);
            log.info("[VNPAY-IPN] paymentId={} orderCode={} status={} transactionId={}",
                    payment.getId(), payment.getOrder().getOrderCode(), nextStatus, transactionId);
        } else {
            event.setProcessingStatus("IGNORED");
            event.setErrorMessage("Payment already processed");
        }
        return new CallbackResult("00", "Confirm Success");
    }

    public Optional<String> findOrderCodeByTransactionCode(String txnRef) {
        if (txnRef == null || txnRef.isBlank()) {
            return Optional.empty();
        }
        Order completed = completedVnPayOrders.get(txnRef);
        if (completed != null) {
            return Optional.of(completed.getOrderCode());
        }
        PendingVnPayCheckout pending = pendingVnPayCheckouts.get(txnRef);
        if (pending != null) {
            return Optional.of(pending.orderCode());
        }
        return paymentRepository.findByTransactionCode(txnRef)
                .map(p -> p.getOrder() != null ? p.getOrder().getOrderCode() : null);
    }

    public Optional<Order> findOrderByTransactionCode(String txnRef) {
        if (txnRef == null || txnRef.isBlank()) {
            return Optional.empty();
        }
        Order completed = completedVnPayOrders.get(txnRef);
        if (completed != null) {
            return Optional.of(completed);
        }
        return paymentRepository.findByTransactionCode(txnRef)
                .map(Payment::getOrder);
    }

    private void updatePaymentAndOrder(
            Payment payment,
            String status,
            String referenceSource,
            String providerReference
    ) {
        String paymentStatus = ("PAID".equalsIgnoreCase(status) || "SUCCESS".equalsIgnoreCase(status))
                ? "SUCCESS"
                : ("CANCELLED".equalsIgnoreCase(status) ? "CANCELLED" : "FAILED");
        payment.setPaymentStatus(paymentStatus);
        if ("VNPAY".equals(referenceSource)) {
            payment.setProviderReference(providerReference);
        }
        if ("SUCCESS".equals(paymentStatus)) {
            payment.setPaidAt(LocalDateTime.now());
            payment.getOrder().setPaymentStatus("PAID");
            settleReservedInventory(payment.getOrder());
            orderService.updateStatus(
                    payment.getOrder().getId(),
                    "CONFIRMED",
                    "Payment SUCCESS",
                    null);
        } else if ("FAILED".equals(paymentStatus) || "CANCELLED".equals(paymentStatus)) {
            payment.getOrder().setPaymentStatus(paymentStatus);
            if ("CANCELLED".equals(paymentStatus)) {
                orderService.updateStatus(
                        payment.getOrder().getId(),
                        "CANCELLED",
                        "Payment " + paymentStatus,
                        null);
            } else {
                orderRepository.save(payment.getOrder());
            }
            releaseReservedInventory(payment.getOrder());
        }
        paymentRepository.save(payment);
    }

    private void settleReservedInventory(Order order) {
        List<OrderItem> orderItems = orderService.getOrderItems(order.getId());
        List<Long> variantIds = orderItems.stream()
                .map(OrderItem::getVariant)
                .filter(Objects::nonNull)
                .map(vn.nhaxinh.catalog.ProductVariant::getId)
                .toList();
        Map<Long, Inventory> lockedInventories = inventoryService.findAllByVariantIdsForUpdate(variantIds);
        List<InventoryMovement> movements = new ArrayList<>(orderItems.size());

        for (var item : orderItems) {
            if (item.getVariant() == null) {
                continue;
            }
            Inventory inventory = lockedInventories.get(item.getVariant().getId());
            if (inventory == null) {
                throw new IllegalStateException("Không tìm thấy tồn kho khi xác nhận thanh toán");
            }
            if (inventory.getQuantityReserved() < item.getQuantity()
                    || inventory.getQuantityOnHand() < item.getQuantity()) {
                throw new IllegalStateException("Tồn kho giữ chỗ không hợp lệ khi xác nhận thanh toán");
            }
            inventory.setQuantityReserved(inventory.getQuantityReserved() - item.getQuantity());
            inventory.setQuantityOnHand(inventory.getQuantityOnHand() - item.getQuantity());
            movements.add(buildInventoryMovement(item.getVariant(), "OUT", item.getQuantity(), order.getId(),
                    "Xác nhận thanh toán đơn " + order.getOrderCode()));
        }
        inventoryService.saveAll(lockedInventories.values());
        inventoryService.recordMovements(movements);
    }

    private void releaseReservedInventory(Order order) {
        List<OrderItem> orderItems = orderService.getOrderItems(order.getId());
        List<Long> variantIds = orderItems.stream()
                .map(OrderItem::getVariant)
                .filter(Objects::nonNull)
                .map(vn.nhaxinh.catalog.ProductVariant::getId)
                .toList();
        Map<Long, Inventory> lockedInventories = inventoryService.findAllByVariantIdsForUpdate(variantIds);
        List<InventoryMovement> movements = new ArrayList<>(orderItems.size());

        for (var item : orderItems) {
            if (item.getVariant() == null) {
                continue;
            }
            Inventory inventory = lockedInventories.get(item.getVariant().getId());
            if (inventory != null) {
                inventory.setQuantityReserved(Math.max(0, inventory.getQuantityReserved() - item.getQuantity()));
                movements.add(buildInventoryMovement(item.getVariant(), "RELEASE", item.getQuantity(), order.getId(),
                        "Hủy giữ hàng đơn " + order.getOrderCode()));
            }
        }
        inventoryService.saveAll(lockedInventories.values());
        inventoryService.recordMovements(movements);
    }

    private InventoryMovement buildInventoryMovement(
            vn.nhaxinh.catalog.ProductVariant variant,
            String movementType,
            int quantity,
            Long orderId,
            String note
    ) {
        InventoryMovement movement = new InventoryMovement();
        movement.setVariant(variant);
        movement.setMovementType(movementType);
        movement.setQuantity(quantity);
        movement.setReferenceType("ORDER");
        movement.setReferenceId(orderId);
        movement.setNote(note);
        return movement;
    }

    private boolean terminalCodeIsExpected(String terminalCode) {
        return vnPayService.isExpectedTerminalCode(terminalCode);
    }

    private Order findOwnedOrder(String orderCode, String username, String phone) {
        if (username != null) {
            User user = userService.findByUsername(username)
                    .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy tài khoản"));
            return orderRepository.findByOrderCodeAndUserId(orderCode, user.getId())
                    .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy đơn hàng"));
        }
        if (phone == null || phone.isBlank()) {
            throw new IllegalArgumentException("Cần số điện thoại nhận hàng để tra cứu đơn");
        }
        return orderRepository.findByOrderCodeAndRecipientPhone(orderCode, phone.trim())
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy đơn hàng"));
    }

    private String requireCartToken(String cartToken) {
        if (cartToken == null || cartToken.length() < 40 || cartToken.length() > 128) {
            throw new IllegalArgumentException("Thiếu hoặc sai X-Cart-Token");
        }
        return cartToken;
    }

    private String json(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException ex) {
            throw new IllegalStateException("Không thể tạo audit payload", ex);
        }
    }

    private void validateRecipientInfo(String address, String phone, String name) {
        if (name == null || name.trim().length() < 2) {
            throw new ApiException(ApiErrorCode.VALIDATION_FAILED, "Họ tên người nhận không hợp lệ (tối thiểu 2 ký tự).");
        }

        if (phone == null || !VN_PHONE_PATTERN.matcher(phone.trim()).matches()) {
            throw new ApiException(ApiErrorCode.VALIDATION_FAILED,
                    "Số điện thoại người nhận không hợp lệ. Vui lòng nhập số di động 10 số (bắt đầu bằng 03, 05, 07, 08, 09).");
        }

        // Chặn các số rác ảo đặc trưng (dãy số trùng lặp hoặc tăng dần)
        String p = phone.trim();
        if (p.equals("0000000000") || p.equals("0123456789") || p.equals("0987654321") || p.matches("^(0[35789])(\\d)\\2{7}$")) {
            throw new ApiException(ApiErrorCode.VALIDATION_FAILED, "Số điện thoại người nhận nằm trong danh sách nghi vấn không hợp lệ.");
        }

        if (address == null || address.trim().length() < 12) {
            throw new ApiException(ApiErrorCode.VALIDATION_FAILED,
                    "Địa chỉ giao hàng quá ngắn. Vui lòng nhập chi tiết số nhà, tên đường, phường/xã, quận/huyện, tỉnh/thành phố.");
        }

        String normAddress = address.trim().toLowerCase();
        for (String junk : JUNK_ADDRESS_KEYWORDS) {
            if (normAddress.contains(junk)) {
                throw new ApiException(ApiErrorCode.VALIDATION_FAILED, "Địa chỉ giao hàng chứa thông tin không hợp lệ: '" + junk + "'.");
            }
        }
    }

    private RiskEvaluation assessRiskAndMultiProvinceSpam(CheckoutRequest request, String clientIp) {
        int riskScore = 0;
        StringBuilder reasons = new StringBuilder();

        // 1. Kiểm tra tần suất đặt hàng theo số điện thoại trong vòng 1 giờ qua (chỉ ghi nhận điểm rủi ro, không chặn cứng khi đặt đơn)
        LocalDateTime oneHourAgo = LocalDateTime.now().minusHours(1);
        List<Order> recentOrders = orderRepository.findByRecipientPhoneAndCreatedAtAfter(request.recipientPhone().trim(), oneHourAgo);

        // 2. Kiểm tra xuất đơn nhiều tỉnh thành trong thời gian ngắn (Distributed Spam)
        if (!recentOrders.isEmpty()) {
            riskScore += recentOrders.size() * 15;
            reasons.append("Tần suất đặt hàng cao (").append(recentOrders.size()).append(" đơn trong 1h); ");

            String currentAddress = request.shippingAddress().trim().toLowerCase();
            long differentProvinces = recentOrders.stream()
                    .map(o -> o.getShippingAddress().toLowerCase())
                    .filter(addr -> !isSameLocation(addr, currentAddress))
                    .count();

            if (differentProvinces >= 2) {
                // Đặt đơn xuất đến từ 2 địa phương/tỉnh thành khác nhau hoàn toàn trong 1 giờ
                riskScore += 45;
                reasons.append("Nghi vấn spam đơn ảo: địa chỉ giao hàng xuất tới nhiều tỉnh/thành khác nhau trong thời gian ngắn; ");
            }
        }

        // 3. Nếu là phương thức COD và điểm rủi ro cao, ghi cảnh báo để Admin kiểm duyệt (không chặn cứng luồng đặt hàng)
        if ("CASH_ON_DELIVERY".equals(request.paymentMethod()) && riskScore >= 60) {
            log.warn("[ANTI_FRAUD] Cảnh báo COD rủi ro cao cho phone={} ip={} riskScore={} lý do={}",
                    request.recipientPhone(), clientIp, riskScore, reasons);
        }

        String level = riskScore >= 60 ? "HIGH" : (riskScore >= 30 ? "MEDIUM" : "LOW");
        return new RiskEvaluation(riskScore, level, reasons.toString());
    }

    private void recordRiskIfSuspicious(Order order, RiskEvaluation eval) {
        if (eval.riskScore() >= 30 && orderRiskService != null) {
            try {
                OrderRiskAssessment assessment = new OrderRiskAssessment();
                assessment.setOrder(order);
                assessment.setRiskScore(eval.riskScore());
                assessment.setRiskLevel(eval.riskLevel());
                assessment.setAssessmentReason("{\"details\": \"" + eval.reason().replace("\"", "'") + "\"}");
                OrderRiskAssessment savedAssessment = orderRiskService.saveAssessment(assessment);

                OrderAlert alert = new OrderAlert();
                alert.setOrder(order);
                alert.setAssessment(savedAssessment);
                alert.setAlertType("SUSPICIOUS_ORDER");
                alert.setSeverity(eval.riskLevel());
                alert.setDescription("Đơn hàng có điểm rủi ro " + eval.riskScore() + "đ. Lý do: " + eval.reason());
                alert.setStatus("NEW");
                orderRiskService.saveAlert(alert);
            } catch (Exception ex) {
                log.warn("[RISK] Không thể lưu đánh giá rủi ro cho đơn {}: {}", order.getOrderCode(), ex.getMessage());
            }
        }
    }

    private boolean isSameLocation(String addr1, String addr2) {
        if (addr1 == null || addr2 == null) return false;
        String[] words1 = addr1.split("[,\\-\\s]+");
        int matchCount = 0;
        for (String w : words1) {
            if (w.length() > 3 && addr2.contains(w)) {
                matchCount++;
            }
        }
        return matchCount >= 2;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> previewCoupon(String rawCouponCode, BigDecimal subtotal, BigDecimal shippingFee, String username) {
        User user = username == null ? null : userService.findByUsername(username).orElse(null);
        BigDecimal safeSubtotal = subtotal != null && subtotal.compareTo(ZERO) > 0 ? subtotal : ZERO;
        BigDecimal safeShipping = shippingFee != null && shippingFee.compareTo(ZERO) >= 0 ? shippingFee : ZERO;
        CouponEvaluation eval = evaluateCoupon(rawCouponCode, safeSubtotal, safeShipping, user != null ? user.getId() : null);
        if (eval.couponCode() == null) {
            throw new ApiException(ApiErrorCode.ORDER_COUPON_INVALID, "Vui lòng nhập mã giảm giá.");
        }
        return Map.of(
                "valid", true,
                "code", eval.couponCode(),
                "discountAmount", eval.discountAmount(),
                "finalTotal", safeSubtotal.add(safeShipping).subtract(eval.discountAmount()).max(ZERO)
        );
    }

    private CouponEvaluation evaluateCoupon(
            String rawCouponCode,
            BigDecimal subtotal,
            BigDecimal shippingFee,
            Long userId
    ) {
        if (rawCouponCode == null || rawCouponCode.isBlank()) {
            return new CouponEvaluation(null, ZERO, null);
        }
        String code = rawCouponCode.trim().toUpperCase(Locale.ROOT);

        // 1. Kiểm tra trong bảng coupons (nếu có)
        if (couponService != null) {
            Optional<Coupon> dbCouponOpt = couponService.findByCode(code);
            if (dbCouponOpt.isPresent()) {
                Coupon validCoupon = couponService.validateCoupon(code, subtotal, userId)
                        .orElseThrow(() -> new ApiException(
                                ApiErrorCode.ORDER_COUPON_INVALID,
                                "Mã giảm giá '" + code + "' không hợp lệ, chưa đủ giá trị đơn tối thiểu hoặc đã hết lượt sử dụng."));

                BigDecimal discount;
                String type = validCoupon.getDiscountType() != null ? validCoupon.getDiscountType().toUpperCase(Locale.ROOT) : "";
                if ("PERCENT".equals(type) || "PERCENTAGE".equals(type)) {
                    discount = subtotal.multiply(validCoupon.getDiscountValue())
                            .divide(BigDecimal.valueOf(100), 0, java.math.RoundingMode.HALF_UP);
                    if (validCoupon.getMaxDiscountAmount() != null
                            && discount.compareTo(validCoupon.getMaxDiscountAmount()) > 0) {
                        discount = validCoupon.getMaxDiscountAmount();
                    }
                } else if ("FREESHIP".equals(type)) {
                    discount = shippingFee.compareTo(ZERO) > 0 ? shippingFee : validCoupon.getDiscountValue();
                } else {
                    discount = validCoupon.getDiscountValue();
                }
                BigDecimal maxApplicable = subtotal.add(shippingFee);
                return new CouponEvaluation(code, discount.min(maxApplicable).max(ZERO), validCoupon);
            }
        }

        // 2. Hỗ trợ các mã khuyến mãi mặc định của cửa hàng (NHAXINH10, FREESHIP, VIP500)
        BigDecimal maxApplicable = subtotal.add(shippingFee);
        return switch (code) {
            case "NHAXINH10" -> {
                BigDecimal discount = subtotal.multiply(BigDecimal.TEN)
                        .divide(BigDecimal.valueOf(100), 0, java.math.RoundingMode.HALF_UP);
                yield new CouponEvaluation(code, discount.min(maxApplicable), null);
            }
            case "FREESHIP" -> {
                BigDecimal discount = shippingFee.compareTo(ZERO) > 0 ? shippingFee : new BigDecimal("150000");
                yield new CouponEvaluation(code, discount.min(maxApplicable), null);
            }
            case "VIP500" -> {
                BigDecimal discount = new BigDecimal("500000");
                yield new CouponEvaluation(code, discount.min(maxApplicable), null);
            }
            default -> throw new ApiException(
                    ApiErrorCode.ORDER_COUPON_INVALID,
                    "Mã giảm giá '" + code + "' không hợp lệ hoặc đã hết hạn.");
        };
    }

    public record CouponEvaluation(
            String couponCode,
            BigDecimal discountAmount,
            Coupon dbCoupon
    ) {
    }

    public record RiskEvaluation(int riskScore, String riskLevel, String reason) {
    }

    public record CallbackResult(String responseCode, String message) {
    }

    public record PendingVnPayCheckout(
            String transactionCode,
            String orderCode,
            Long userId,
            Long cartId,
            CheckoutRequest request,
            String clientIp,
            BigDecimal subtotal,
            BigDecimal shippingFee,
            BigDecimal discountAmount,
            String couponCode,
            BigDecimal totalAmount,
            RiskEvaluation riskEvaluation,
            LocalDateTime createdAt
    ) {
    }
}
