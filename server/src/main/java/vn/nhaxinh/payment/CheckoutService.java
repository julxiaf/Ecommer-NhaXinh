package vn.nhaxinh.payment;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ConcurrentHashMap;
import java.util.regex.Pattern;
import java.util.stream.Collectors;
import org.slf4j.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.MultiValueMap;
import vn.nhaxinh.audit.AuditLogService;
import vn.nhaxinh.cart.*;
import vn.nhaxinh.catalog.Category;
import vn.nhaxinh.catalog.CollectionRepository;
import vn.nhaxinh.catalog.ProductVariant;
import vn.nhaxinh.coupon.Coupon;
import vn.nhaxinh.coupon.CouponService;
import vn.nhaxinh.coupon.CouponValidationResult;
import vn.nhaxinh.inventory.*;
import vn.nhaxinh.notification.NotificationService;
import vn.nhaxinh.order.*;
import vn.nhaxinh.security.*;
import vn.nhaxinh.user.*;

/**
 * Dịch vụ xử lý trung tâm cho quy trình Đặt hàng (Checkout) & Thanh toán (Payment).
 *
 * <h3>Các trách nhiệm chính:</h3>
 * <ol>
 *   <li><b>Đặt hàng (Checkout)</b>: Kiểm tra thông tin người nhận, chống gian lận (Anti-Fraud),
 *       khóa bi quan tồn kho ({@code PESSIMISTIC_WRITE}), tính mã giảm giá, tạo đơn hàng/thanh toán,
 *       đóng giỏ hàng cũ và giải phóng {@code session_token}.</li>
 *   <li><b>Xử lý cổng thanh toán VNPay</b>: Khởi tạo URL thanh toán, xác thực chữ ký callback/IPN,
 *       đảm bảo tính bất biến (Idempotency) và khớp lệnh trừ kho khi thanh toán thành công.</li>
 *   <li><b>Quản lý vòng đời tồn kho theo thanh toán</b>:
 *       <ul>
 *         <li>{@code RESERVE}: Giữ chỗ tồn kho khi tạo đơn COD / Chuyển khoản hoặc thanh toán lại.</li>
 *         <li>{@code OUT}: Khấu trừ tồn kho thực tế khi giao dịch thanh toán thành công.</li>
 *         <li>{@code RELEASE}: Hoàn trả tồn kho giữ chỗ khi thanh toán thất bại hoặc bị hủy.</li>
 *       </ul>
 *   </li>
 *   <li><b>Tính toán & Kiểm tra Mã giảm giá (Coupon)</b>: Hỗ trợ mã trong DB theo phạm vi
 *       ({@code ALL}, {@code PRODUCT}, {@code COLLECTION}, {@code CATEGORY}) và các mã mặc định.</li>
 * </ol>
 */
@Service
@Transactional
public class CheckoutService {

    private static final Logger log = LoggerFactory.getLogger(CheckoutService.class);
    private static final BigDecimal ZERO = BigDecimal.ZERO;

    /** Pattern số điện thoại di động Việt Nam (10 chữ số, bắt đầu bằng 03, 05, 07, 08, 09). */
    private static final Pattern VN_PHONE_PATTERN = Pattern.compile("^(0[35789])[0-9]{8}$");

    /** Danh sách từ khóa địa chỉ rác / ảo dùng trong bộ lọc chống đơn hàng ảo. */
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
    private final ObjectMapper objectMapper;
    private final CouponService couponService;
    private final NotificationService notificationService;

    @Autowired(required = false)
    private CollectionRepository collectionRepository;

    /**
     * Dùng để chẩn đoán lỗi {@code CART_EMPTY} (đếm số lượng giỏ theo từng trạng thái).
     * Khai báo {@code required = false} để giữ tương thích ngược với các unit test khởi tạo qua constructor cũ.
     */
    @Autowired(required = false)
    private CartRepository cartRepository;

    /** Lưu tạm các phiên thanh toán VNPay chờ callback thành công mới tạo Order & Payment trong DB. */
    private final Map<String, PendingVnPayCheckout> pendingVnPayCheckouts = new ConcurrentHashMap<>();

    /** Cache các đơn hàng VNPay đã hoàn tất theo mã giao dịch để chống xử lý trùng lặp (Idempotency). */
    private final Map<String, Order> completedVnPayOrders = new ConcurrentHashMap<>();

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
            ObjectMapper objectMapper,
            CouponService couponService,
            NotificationService notificationService
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
        this.objectMapper = objectMapper;
        this.couponService = couponService;
        this.notificationService = notificationService;
    }

    // ====================================================================
    // 1. LUỒNG ĐẶT HÀNG CHÍNH (CHECKOUT)
    // ====================================================================

    /**
     * Điểm vào (Entry point) xử lý yêu cầu đặt hàng từ khách hàng hoặc khách vãng lai.
     * Bọc ngoài {@link #doCheckout} để theo dõi bước đang chạy ({@code step}) và ghi log {@code ERROR}
     * chi tiết nếu xảy ra lỗi hệ thống bất ngờ.
     */
    public CheckoutResponse checkout(
            CheckoutRequest request,
            String username,
            String cartToken,
            String clientIp
    ) {
        // step[0] lưu bước đang chạy để log ERROR chỉ rõ lỗi bất ngờ xảy ra ở đâu
        String[] step = {"1-validate"};
        try {
            return doCheckout(request, username, cartToken, clientIp, step);
        } catch (ApiException | IllegalArgumentException ex) {
            // Lỗi nghiệp vụ đã được ApiExceptionHandler xử lý/log (WARN), ném lại nguyên vẹn
            throw ex;
        } catch (RuntimeException ex) {
            log.error("[CHECKOUT] Lỗi bất ngờ ở bước '{}' (tokenMasked={})", step[0],
                    CartLoggingHelper.maskToken(cartToken), ex);
            throw ex;
        }
    }

    /**
     * Thực thi chi tiết luồng checkout theo 8 bước tuần tự:
     * <ol>
     *   <li>Validate thông tin người nhận & cấu hình cổng thanh toán.</li>
     *   <li>Nạp thông tin tài khoản (nếu đăng nhập) và giỏ hàng {@code ACTIVE}.</li>
     *   <li>Validate từng sản phẩm trong giỏ (trạng thái kinh doanh, số lượng, đơn giá).</li>
     *   <li>Đánh giá rủi ro gian lận / spam đơn hàng đa tỉnh thành.</li>
     *   <li>Khóa bi quan tồn kho ({@code PESSIMISTIC_WRITE}), kiểm tra đủ hàng và tính tổng tiền.</li>
     *   <li>Nếu chọn VNPay: lưu phiên chờ vào bộ nhớ và trả về URL thanh toán (chưa tạo Order).
     *       Nếu chọn COD / Chuyển khoản: giữ chỗ tồn kho và lưu Order vào DB.</li>
     *   <li>Tạo bản ghi giao dịch {@link Payment} ở trạng thái {@code PENDING}.</li>
     *   <li>Đóng giỏ hàng cũ ({@code CONVERTED}), nhả {@code session_token = null} và gửi email xác nhận.</li>
     * </ol>
     */
    private CheckoutResponse doCheckout(
            CheckoutRequest request,
            String username,
            String cartToken,
            String clientIp,
            String[] step
    ) {
        // Bước 1: Kiểm tra tính hợp lệ của địa chỉ, SĐT, họ tên và cấu hình cổng thanh toán trước khi khóa DB
        validateCheckoutRequest(request);

        // Bước 2: Nạp tài khoản và giỏ hàng ACTIVE (kèm chẩn đoán nếu giỏ trống)
        step[0] = "2-load-cart";
        User user = resolveUser(username);
        Long userId = user != null ? user.getId() : null;
        String guestToken = username == null ? requireCartToken(cartToken) : null;
        Cart cart = loadActiveCart(user, guestToken);
        List<CartItem> cartItems = loadNonEmptyCartItems(cart, userId, guestToken);
        log.info("[CHECKOUT] Bắt đầu checkout: cartId={}, userId={}, tokenMasked={}, itemCount={}, totalAmount={}",
                cart.getId(), userId, CartLoggingHelper.maskToken(guestToken),
                cartItems.size(), estimateCartTotal(cartItems));

        // Bước 3: Kiểm tra nhanh trạng thái, số lượng, đơn giá các mặt hàng trên bộ nhớ trước khi khóa tồn kho
        List<Long> variantIds = validateCartItems(cartItems);

        // Bước 4: Đánh giá rủi ro, phát hiện spam đặt đơn nhiều tỉnh thành trong thời gian ngắn
        RiskEvaluation riskEvaluation = assessRiskAndMultiProvinceSpam(request, clientIp);
        String normalizedMethod = request.paymentMethod() != null ? request.paymentMethod().trim().toUpperCase() : "";

        // Bước 5: Khóa bi quan PESSIMISTIC_WRITE toàn bộ tồn kho cần thiết trong 1 query (theo thứ tự ID tăng dần để chống Deadlock)
        step[0] = "5-lock-inventory";
        Map<Long, Inventory> lockedInventories = inventoryService.findAllByVariantIdsForUpdate(variantIds);
        BigDecimal subtotal = checkStockAndCalculateSubtotal(cartItems, lockedInventories);

        BigDecimal shippingFee = request.shippingFee() != null && request.shippingFee().compareTo(ZERO) >= 0
                ? request.shippingFee()
                : ZERO;
        CouponEvaluation couponEval = evaluateCoupon(
                request.couponCode(),
                subtotal,
                shippingFee,
                userId,
                request.recipientPhone(),
                cart.getItems()
        );
        BigDecimal discountAmount = couponEval.discountAmount();
        BigDecimal totalAmount = subtotal.add(shippingFee).subtract(discountAmount).max(ZERO);
        if (totalAmount.compareTo(ZERO) <= 0) {
            throw new ApiException(ApiErrorCode.VALIDATION_FAILED, "Tổng tiền thanh toán sau giảm giá phải lớn hơn 0.");
        }

        String generatedOrderCode = "NX" + UUID.randomUUID().toString().replace("-", "").substring(0, 20).toUpperCase();

        // Bước 6a: Nhánh VNPay — chưa lưu Order và Payment vào DB cho đến khi VNPay callback báo thanh toán thành công
        if ("VNPAY".equals(normalizedMethod)) {
            return startVnPayCheckout(request, user, cart, clientIp, generatedOrderCode,
                    subtotal, shippingFee, discountAmount, couponEval, totalAmount, riskEvaluation);
        }

        // Bước 6b: Nhánh COD / BANK_TRANSFER — giữ chỗ tồn kho (quantityReserved) và tạo Order ngay
        Order order = buildOrderHeader(request, user, generatedOrderCode, couponEval, discountAmount, shippingFee);
        List<InventoryMovement> movements = reserveStockAndBuildOrderItems(order, cartItems, lockedInventories);

        // Lưu tồn kho theo lô (batch) thay vì lưu lẻ từng dòng trong vòng lặp
        inventoryService.saveAll(lockedInventories.values());

        order.setSubtotal(subtotal);
        order.setTotalAmount(totalAmount);
        order = orderService.createOrder(order);

        // Gắn ID đơn hàng vừa tạo vào nhật ký biến động tồn kho và lưu batch
        Long createdOrderId = order.getId();
        movements.forEach(m -> m.setReferenceId(createdOrderId));
        inventoryService.recordMovements(movements);

        // Ghi nhận lượt sử dụng mã giảm giá vào bảng coupon_usages (nếu là mã trong DB)
        if (couponEval.dbCoupon() != null && couponService != null) {
            couponService.recordUsage(couponEval.dbCoupon(), user, createdOrderId, discountAmount);
        }

        // Bước 7: Khởi tạo bản ghi thanh toán (Payment) ở trạng thái PENDING
        step[0] = "7-create-payment";
        log.info("[CHECKOUT] Tạo order thành công: orderId={}, cartId={}", order.getId(), cart.getId());
        Payment payment = createPendingPayment(order, request.paymentMethod());

        // Bước 8: Đóng giỏ hàng cũ và nhả session_token để khách có thể mua sắm lần 2 mà không bị lỗi trùng token
        step[0] = "8-close-cart";
        closeCartAndReleaseToken(cart, "[CHECKOUT] Đóng giỏ cũ");

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

        // Gửi email xác nhận đơn hàng (nếu là COD thì chờ Admin duyệt CONFIRMED mới gửi)
        sendOrderConfirmationIfApplicable(order, order.getItems(), payment.getPaymentMethod());

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

    // ====================================================================
    // 2. CÁC HÀM HỖ TRỢ TRONG LUỒNG CHECKOUT
    // ====================================================================

    /** Ước tính tổng tiền giỏ hàng chỉ để phục vụ ghi log chẩn đoán (không dùng để tính tiền đơn hàng). */
    private BigDecimal estimateCartTotal(List<CartItem> cartItems) {
        BigDecimal total = ZERO;
        for (CartItem item : cartItems) {
            if (item.getVariant() != null && item.getVariant().getPrice() != null) {
                total = total.add(item.getVariant().getPrice().multiply(BigDecimal.valueOf(item.getQuantity())));
            }
        }
        return total;
    }

    /**
     * Ghi log {@code WARN} khi gặp lỗi {@code CART_EMPTY} kèm thống kê số lượng giỏ theo từng trạng thái
     * của user hoặc session token đó (ví dụ: {@code ACTIVE=0, CONVERTED=1}) để phân biệt rõ
     * trường hợp "chưa từng có giỏ" với "giỏ đã bị đóng nhưng chưa tạo giỏ mới".
     */
    private void logCartEmptyDiagnostics(Long userId, String sessionToken) {
        Map<String, Long> countByStatus = new TreeMap<>();
        for (CartStatus status : CartStatus.values()) {
            countByStatus.put(status.name(), 0L);
        }
        if (cartRepository != null) {
            List<Cart> carts = userId != null
                    ? cartRepository.findByUserId(userId)
                    : (sessionToken != null ? cartRepository.findBySessionToken(sessionToken) : List.of());
            for (Cart c : carts) {
                countByStatus.merge(String.valueOf(c.getStatus()), 1L, Long::sum);
            }
        }
        log.warn("[CHECKOUT] CART_EMPTY: userId={}, tokenMasked={}, cartStatusCounts={}",
                userId, CartLoggingHelper.maskToken(sessionToken), countByStatus);
    }

    /** Kiểm tra thông tin người nhận (địa chỉ, SĐT, họ tên) và kiểm tra cấu hình VNPay nếu khách chọn VNPay. */
    private void validateCheckoutRequest(CheckoutRequest request) {
        validateRecipientInfo(request.shippingAddress(), request.recipientPhone(), request.recipientName());
        if ("VNPAY".equals(request.paymentMethod()) && !vnPayService.isConfigured()) {
            throw new ApiException(ApiErrorCode.PAYMENT_FAILED, "Cổng thanh toán VNPay tạm thời chưa sẵn sàng. Vui lòng chọn phương thức khác.");
        }
    }

    /** Tra cứu tài khoản từ {@code username}; trả về {@code null} nếu khách mua vãng lai (chưa đăng nhập). */
    private User resolveUser(String username) {
        if (username == null) {
            return null;
        }
        return userService.findByUsername(username)
                .orElseThrow(() -> new ApiException(ApiErrorCode.AUTH_UNAUTHENTICATED, "Không tìm thấy tài khoản người dùng"));
    }

    /**
     * Tìm giỏ hàng {@code ACTIVE} cho phiên mua sắm:
     * <ul>
     *   <li>Nếu đã đăng nhập: lấy hoặc khởi tạo giỏ theo {@code user}.</li>
     *   <li>Nếu khách vãng lai: tìm giỏ {@code ACTIVE} theo {@code guestToken}; nếu không thấy thì log chẩn đoán và ném {@code CART_EMPTY}.</li>
     * </ul>
     */
    private Cart loadActiveCart(User user, String guestToken) {
        if (user != null) {
            return cartService.getOrCreateCart(user, null);
        }
        return cartService.getActiveCartBySession(guestToken)
                .orElseThrow(() -> {
                    logCartEmptyDiagnostics(null, guestToken);
                    return new ApiException(ApiErrorCode.CART_EMPTY, "Không tìm thấy giỏ hàng đang hoạt động");
                });
    }

    /** Nạp danh sách sản phẩm trong giỏ; nếu giỏ rỗng thì ghi log chẩn đoán và ném lỗi {@code CART_EMPTY}. */
    private List<CartItem> loadNonEmptyCartItems(Cart cart, Long userId, String guestToken) {
        List<CartItem> cartItems = cartService.getItems(cart.getId());
        if (cartItems.isEmpty()) {
            logCartEmptyDiagnostics(userId, guestToken);
            throw new ApiException(ApiErrorCode.CART_EMPTY, "Giỏ hàng của bạn đang trống");
        }
        return cartItems;
    }

    /**
     * Kiểm tra tính hợp lệ của từng mặt hàng trong giỏ:
     * biến thể và sản phẩm phải tồn tại, đang ở trạng thái {@code ACTIVE}, số lượng > 0 và đơn giá > 0.
     *
     * @return danh sách {@code variantId} cần khóa tồn kho ở bước tiếp theo
     */
    private List<Long> validateCartItems(List<CartItem> cartItems) {
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
        return variantIds;
    }

    /**
     * Kiểm tra số lượng tồn kho khả dụng (bỏ qua nếu là hàng đặt trước {@code isPreorder})
     * trên các bản ghi {@link Inventory} đã khóa bi quan, đồng thời tính tổng tiền hàng ({@code subtotal}).
     */
    private BigDecimal checkStockAndCalculateSubtotal(List<CartItem> cartItems, Map<Long, Inventory> lockedInventories) {
        BigDecimal subtotal = ZERO;
        for (CartItem cartItem : cartItems) {
            var variant = cartItem.getVariant();
            boolean isPreorder = variant.getProduct() != null && Boolean.TRUE.equals(variant.getProduct().getIsPreorder());
            Inventory inventory = lockedInventories.get(variant.getId());
            if (!isPreorder && inventory == null) {
                throw new ApiException(ApiErrorCode.PRODUCT_OUT_OF_STOCK,
                        "Sản phẩm '" + variant.getName() + "' (SKU: " + variant.getSku() + ") hiện chưa sẵn sàng xuất kho.");
            }
            int availableQuantity = inventory != null ? inventory.getAvailableQuantity() : 0;
            if (!isPreorder && availableQuantity < cartItem.getQuantity()) {
                throw new ApiException(ApiErrorCode.PRODUCT_INSUFFICIENT_STOCK,
                        String.format("Sản phẩm '%s' (SKU: %s) không đủ tồn kho (Còn: %d, yêu cầu: %d). Vui lòng cập nhật lại giỏ hàng.",
                                variant.getName(), variant.getSku(), Math.max(0, availableQuantity), cartItem.getQuantity()));
            }
            subtotal = subtotal.add(variant.getPrice().multiply(BigDecimal.valueOf(cartItem.getQuantity())));
        }
        if (subtotal.compareTo(ZERO) <= 0) {
            throw new ApiException(ApiErrorCode.VALIDATION_FAILED, "Tổng giá trị đơn hàng không hợp lệ (phải lớn hơn 0).");
        }
        return subtotal;
    }

    /**
     * Khởi tạo phiên thanh toán VNPay tạm thời trong bộ nhớ ({@link #pendingVnPayCheckouts})
     * và sinh URL chuyển hướng sang cổng VNPay. Đơn hàng chỉ thực sự được lưu vào DB khi callback báo thành công.
     */
    private CheckoutResponse startVnPayCheckout(
            CheckoutRequest request,
            User user,
            Cart cart,
            String clientIp,
            String orderCode,
            BigDecimal subtotal,
            BigDecimal shippingFee,
            BigDecimal discountAmount,
            CouponEvaluation couponEval,
            BigDecimal totalAmount,
            RiskEvaluation riskEvaluation
    ) {
        String transactionCode = UUID.randomUUID().toString().replace("-", "");
        PendingVnPayCheckout pending = new PendingVnPayCheckout(
                transactionCode,
                orderCode,
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

        String paymentUrl = vnPayService.createPaymentUrl(transactionCode, orderCode, totalAmount, clientIp);
        log.info("[CHECKOUT-VNPAY-INIT] Chờ xác nhận VNPay cho orderCode={} txnRef={} subtotal={} shippingFee={} discount={} coupon={} totalAmount={} user={} paymentUrl={}",
                orderCode, transactionCode, subtotal, shippingFee, discountAmount, couponEval.couponCode(), totalAmount,
                user != null ? user.getId() : "guest", paymentUrl);

        return new CheckoutResponse(
                null,
                orderCode,
                "PENDING_PAYMENT",
                "UNPAID",
                totalAmount,
                null,
                "VNPAY",
                "PENDING",
                paymentUrl
        );
    }

    /** Khởi tạo thông tin chung (Header) của đối tượng {@link Order} ở trạng thái {@code PENDING} / {@code UNPAID}. */
    private Order buildOrderHeader(
            CheckoutRequest request,
            User user,
            String orderCode,
            CouponEvaluation couponEval,
            BigDecimal discountAmount,
            BigDecimal shippingFee
    ) {
        Order order = new Order();
        order.setOrderCode(orderCode);
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
        return order;
    }

    /**
     * Tăng số lượng giữ chỗ ({@code quantityReserved}) cho từng sản phẩm trong giỏ
     * và tạo danh sách {@link OrderItem} gắn vào đơn hàng.
     *
     * @return danh sách biến động kho loại {@code RESERVE} (sẽ được gán {@code referenceId} sau khi lưu Order)
     */
    private List<InventoryMovement> reserveStockAndBuildOrderItems(
            Order order,
            List<CartItem> cartItems,
            Map<Long, Inventory> lockedInventories
    ) {
        List<InventoryMovement> movements = new ArrayList<>(cartItems.size());
        for (CartItem cartItem : cartItems) {
            var variant = cartItem.getVariant();
            Inventory inventory = lockedInventories.get(variant.getId());
            // Tăng số lượng giữ chỗ (quantityReserved) để khách khác không mua trùng
            inventory.setQuantityReserved(inventory.getQuantityReserved() + cartItem.getQuantity());
            movements.add(buildInventoryMovement(variant, "RESERVE", cartItem.getQuantity(), null, "Giữ hàng khi checkout đơn hàng"));

            order.getItems().add(buildOrderItemSnapshot(order, cartItem));
        }
        return movements;
    }

    /**
     * Chụp lại (Snapshot) thông tin sản phẩm/biến thể (tên, SKU, tùy chọn, đơn giá) tại thời điểm đặt hàng
     * thành một {@link OrderItem}, đảm bảo lịch sử đơn hàng không bị biến đổi khi Admin sửa giá/tên sản phẩm sau này.
     */
    private OrderItem buildOrderItemSnapshot(Order order, CartItem cartItem) {
        ProductVariant variant = cartItem.getVariant();
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
        return orderItem;
    }

    /** Tạo và lưu bản ghi {@link Payment} mới ở trạng thái {@code PENDING} cho toàn bộ giá trị đơn hàng. */
    private Payment createPendingPayment(Order order, String paymentMethod) {
        Payment payment = new Payment();
        payment.setOrder(order);
        payment.setPaymentType("FULL_PAYMENT");
        payment.setPaymentMethod(paymentMethod);
        payment.setAmount(order.getTotalAmount());
        payment.setPaymentStatus("PENDING");
        payment.setTransactionCode(UUID.randomUUID().toString().replace("-", ""));
        return paymentRepository.saveAndFlush(payment);
    }

    /**
     * Đóng giỏ hàng cũ ({@code status = CONVERTED}) và xóa {@code session_token = null}
     * để giải phóng unique constraint {@code uq_carts_session_token} cho lần mua sắm tiếp theo của khách.
     */
    private void closeCartAndReleaseToken(Cart cart, String logPrefix) {
        cart.setStatus(CartStatus.CONVERTED.name());
        cart.setSessionToken(null);
        cartService.save(cart);
        log.info("{}: cartId={}, status={}, sessionToken released", logPrefix, cart.getId(), cart.getStatus());
    }

    /**
     * Gửi email xác nhận đơn hàng bất đồng bộ (Async):
     * <ul>
     *   <li>Nếu là đơn COD: chưa gửi ngay ở bước tạo đơn (chờ Admin xác nhận {@code CONFIRMED} mới gửi).</li>
     *   <li>Nếu là phương thức khác: gửi bất đồng bộ qua {@link CompletableFuture}; nếu lỗi chỉ ghi {@code WARN}.</li>
     * </ul>
     */
    private void sendOrderConfirmationIfApplicable(Order order, List<OrderItem> items, String paymentMethod) {
        boolean isCod = "CASH_ON_DELIVERY".equalsIgnoreCase(paymentMethod)
                || "COD".equalsIgnoreCase(paymentMethod);
        if (isCod) {
            log.info("[CHECKOUT-COD] Đơn hàng COD #{} ở trạng thái PENDING — chờ xác nhận đơn (CONFIRMED) mới gửi email cho khách hàng.",
                    order.getOrderCode());
        } else if (notificationService != null) {
            final Order orderSnapshot = order;
            final List<OrderItem> itemsSnapshot = List.copyOf(items);
            final String methodSnapshot = paymentMethod;
            CompletableFuture.runAsync(() -> {
                try {
                    notificationService.sendOrderConfirmationEmail(orderSnapshot, itemsSnapshot, methodSnapshot);
                } catch (Exception emailEx) {
                    log.warn("[CHECKOUT-EMAIL] Không thể gửi email xác nhận đơn hàng #{}: {}", orderSnapshot.getOrderCode(), emailEx.getMessage());
                }
            });
        }
    }

    // ====================================================================
    // 3. TRA CỨU, THANH TOÁN LẠI (RETRY) & CẬP NHẬT TRẠNG THÁI THANH TOÁN
    // ====================================================================

    /** Phân trang danh sách toàn bộ giao dịch thanh toán (dành cho Admin). */
    @Transactional(readOnly = true)
    public Page<Payment> listPayments(Pageable pageable) {
        return paymentRepository.findAll(pageable);
    }

    /** Tìm giao dịch thanh toán theo ID; ném lỗi nếu không tồn tại. */
    @Transactional(readOnly = true)
    public Payment getPayment(Long paymentId) {
        return paymentRepository.findById(paymentId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy giao dịch thanh toán"));
    }

    /** Lấy lịch sử các lần thanh toán của một đơn hàng (kiểm tra quyền sở hữu theo tài khoản hoặc SĐT người nhận). */
    @Transactional(readOnly = true)
    public List<Payment> getPaymentsForOrder(String orderCode, String username, String phone) {
        Order order = findOwnedOrder(orderCode, username, phone);
        return paymentRepository.findByOrderId(order.getId());
    }

    /**
     * Thanh toán lại (Retry Payment) cho đơn hàng đang ở trạng thái {@code PENDING} và chưa thanh toán ({@code UNPAID})
     * cũng như không còn giao dịch {@code PENDING} nào đang chờ.
     *
     * <p>Hàm sẽ khóa lại tồn kho, giữ chỗ ({@code RESERVE}) cho các mặt hàng của đơn,
     * tạo bản ghi {@link Payment} mới và sinh URL thanh toán nếu khách chọn VNPay.</p>
     */
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

        // Khóa tồn kho và giữ chỗ lại cho các sản phẩm trong đơn
        List<OrderItem> orderItems = orderService.getOrderItems(order.getId());
        List<Long> variantIds = extractVariantIdsFromOrderItems(orderItems);
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

        // Tạo giao dịch thanh toán mới và đặt lại trạng thái UNPAID cho đơn
        Payment payment = createPendingPayment(order, request.paymentMethod());
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

        sendOrderConfirmationIfApplicable(order, orderItems, payment.getPaymentMethod());

        return new CheckoutResponse(
                order.getId(), order.getOrderCode(), order.getOrderStatus(), order.getPaymentStatus(),
                order.getTotalAmount(), payment.getId(), payment.getPaymentMethod(),
                payment.getPaymentStatus(), paymentUrl);
    }

    /**
     * Cập nhật thủ công trạng thái giao dịch thanh toán (dành cho Admin).
     * Chỉ cho phép cập nhật từ {@code PENDING} sang {@code PAID}/{@code SUCCESS}/{@code FAILED}/{@code CANCELLED};
     * giao dịch VNPay bắt buộc phải được xác nhận qua callback có chữ ký số.
     */
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

    // ====================================================================
    // 4. XỬ LÝ CALLBACK / IPN TỪ CỔNG THANH TOÁN VNPAY
    // ====================================================================

    /**
     * Xử lý thông báo kết quả thanh toán (Return URL & IPN Webhook) từ VNPay:
     * <ol>
     *   <li>Xác thực chữ ký HMAC-SHA512 của VNPay.</li>
     *   <li>Kiểm tra chống xử lý trùng lặp (Idempotency) qua {@link #completedVnPayOrders} và bảng {@code payment_webhook_events}.</li>
     *   <li>Nếu là phiên đặt hàng mới ({@link PendingVnPayCheckout}): kiểm tra số tiền/mã TmnCode,
     *       trừ tồn kho thực tế, tạo {@link Order} + {@link Payment}, đóng giỏ hàng và giải phóng {@code session_token}.</li>
     *   <li>Nếu là giao dịch của đơn hàng đã tạo từ trước (ví dụ qua {@link #retryPayment}):
     *       cập nhật trạng thái thanh toán và đơn hàng qua {@link #updatePaymentAndOrder}.</li>
     * </ol>
     */
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
        // Chống xử lý trùng lặp nếu VNPay gọi cả Return URL lẫn IPN cùng lúc
        if (completedVnPayOrders.containsKey(transactionCode)
                || webhookRepository.findByProviderAndEventId("VNPAY", eventId).isPresent()) {
            return new CallbackResult("00", "Confirm Success");
        }

        String amountValue = parameters.getFirst("vnp_Amount");
        String terminalCode = parameters.getFirst("vnp_TmnCode");

        // Nhánh 1: Phiên thanh toán VNPay mới (chờ callback thành công mới tạo Order & Payment)
        PendingVnPayCheckout pending = pendingVnPayCheckouts.get(transactionCode);
        if (pending != null) {
            return completePendingVnPayCheckout(
                    pending, parameters, transactionCode, transactionId, responseCode, transactionStatus, eventId, amountValue, terminalCode);
        }

        // Nhánh 2: Fallback cho đơn hàng đã tồn tại trong DB từ trước (ví dụ: retryPayment)
        return completeExistingVnPayPayment(
                parameters, transactionCode, transactionId, responseCode, transactionStatus, eventId, amountValue, terminalCode);
    }

    /**
     * Hoàn tất phiên đặt hàng VNPay mới từ bộ nhớ tạm ({@link PendingVnPayCheckout}):
     * chỉ khi VNPay trả mã thành công ({@code 00}) mới trừ kho, tạo {@link Order}, tạo {@link Payment}
     * và đóng giỏ hàng cũ (kèm giải phóng {@code session_token}).
     */
    private CallbackResult completePendingVnPayCheckout(
            PendingVnPayCheckout pending,
            MultiValueMap<String, String> parameters,
            String transactionCode,
            String transactionId,
            String responseCode,
            String transactionStatus,
            String eventId,
            String amountValue,
            String terminalCode
    ) {
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
                .map(ProductVariant::getId)
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

        // Khấu trừ tồn kho thực tế (quantityOnHand) và kiểm tra cảnh báo thiếu hàng nếu có race condition
        List<InventoryMovement> movements = new ArrayList<>(cartItems.size());
        List<String> outOfStockWarnings = new ArrayList<>();
        for (CartItem cartItem : cartItems) {
            var variant = cartItem.getVariant();
            boolean isPreorder = variant.getProduct() != null && Boolean.TRUE.equals(variant.getProduct().getIsPreorder());
            Inventory inventory = lockedInventories.get(variant.getId());
            int availableStock = inventory != null ? inventory.getAvailableQuantity() : 0;

            // Nếu không phải Pre-Order mà tồn kho khả dụng < số lượng đặt (do khách khác vừa mua hết trong lúc chờ VNPay)
            if (!isPreorder && availableStock < cartItem.getQuantity()) {
                log.warn("[VNPAY-OVERSOLD] Đơn hàng VNPay #{} có sản phẩm '{}' bị thiếu tồn kho thực tế khi khớp lệnh (còn {}, yêu cầu {})",
                        pending.orderCode(), variant.getName(), Math.max(0, availableStock), cartItem.getQuantity());
                outOfStockWarnings.add(String.format("'%s' (thiếu %d món)", variant.getName(), cartItem.getQuantity() - Math.max(0, availableStock)));
            }

            if (inventory != null) {
                inventory.setQuantityOnHand(Math.max(0, inventory.getQuantityOnHand() - cartItem.getQuantity()));
                movements.add(buildInventoryMovement(variant, "OUT", cartItem.getQuantity(), null,
                        "Xác nhận thanh toán VNPay đơn " + pending.orderCode()));
            }

            order.getItems().add(buildOrderItemSnapshot(order, cartItem));
        }

        if (!outOfStockWarnings.isEmpty()) {
            String warningText = "[CẢNH BÁO TỒN KHO]: Sản phẩm " + String.join(", ", outOfStockWarnings)
                    + " đã hết hàng sẵn có trong lúc khách hoàn tất thanh toán VNPay. Đã thu tiền thành công. Cần ưu tiên sản xuất / điều phối kho hoặc liên hệ hoàn tiền.";
            order.setCustomerNote(order.getCustomerNote() != null && !order.getCustomerNote().isBlank()
                    ? order.getCustomerNote() + " | " + warningText
                    : warningText);
        }

        inventoryService.saveAll(lockedInventories.values());
        order = orderService.createOrder(order);

        if (!outOfStockWarnings.isEmpty()) {
            order.setCustomerNote((order.getCustomerNote() != null ? order.getCustomerNote() + " | " : "")
                    + "⚠️ CẢNH BÁO TỒN KHO: Sản phẩm " + String.join(", ", outOfStockWarnings)
                    + " thiếu hàng tại thời điểm thanh toán VNPay thành công. Chuyển diện Hàng đặt trước / Cần xử lý CSKH.");
            orderRepository.save(order);
        }

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

        // Đóng giỏ cũ và nhả session_token sau khi VNPay thanh toán thành công
        closeCartAndReleaseToken(cart, "[CHECKOUT] Đóng giỏ cũ (VNPay callback)");

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

        if (notificationService != null) {
            final Order orderSnapshot = order;
            final List<OrderItem> itemsSnapshot = List.copyOf(order.getItems());
            CompletableFuture.runAsync(() -> {
                try {
                    notificationService.sendOrderConfirmationEmail(orderSnapshot, itemsSnapshot, "VNPAY");
                } catch (Exception emailEx) {
                    log.warn("[VNPAY-EMAIL] Không thể gửi email xác nhận đơn hàng #{}: {}", orderSnapshot.getOrderCode(), emailEx.getMessage());
                }
            });
        }

        return new CallbackResult("00", "Confirm Success");
    }

    /**
     * Xử lý callback VNPay cho giao dịch {@link Payment} đã được lưu trong DB từ trước
     * (ví dụ: khách thanh toán lại đơn hàng qua {@link #retryPayment}).
     */
    private CallbackResult completeExistingVnPayPayment(
            MultiValueMap<String, String> parameters,
            String transactionCode,
            String transactionId,
            String responseCode,
            String transactionStatus,
            String eventId,
            String amountValue,
            String terminalCode
    ) {
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

    /** Tra cứu mã đơn hàng ({@code orderCode}) theo mã giao dịch VNPay ({@code vnp_TxnRef}). */
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

    /** Tra cứu đối tượng {@link Order} theo mã giao dịch VNPay ({@code vnp_TxnRef}). */
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

    // ====================================================================
    // 5. ĐỒNG BỘ TRẠNG THÁI THANH TOÁN, ĐƠN HÀNG & TỒN KHO
    // ====================================================================

    /**
     * Đồng bộ trạng thái giữa {@link Payment}, {@link Order} và {@link Inventory}:
     * <ul>
     *   <li>Khi {@code SUCCESS}: đánh dấu đơn {@code PAID} & {@code CONFIRMED}, trừ tồn kho thực tế ({@link #settleReservedInventory})
     *       và gửi email xác nhận thanh toán.</li>
     *   <li>Khi {@code FAILED} hoặc {@code CANCELLED}: cập nhật trạng thái thanh toán của đơn,
     *       hủy đơn (nếu {@code CANCELLED}) và giải phóng hàng giữ chỗ ({@link #releaseReservedInventory}).</li>
     * </ul>
     */
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
            if (notificationService != null) {
                final Order orderSnapshot = payment.getOrder();
                final String methodSnapshot = payment.getPaymentMethod();
                final String txRef = (providerReference != null && !providerReference.isBlank())
                        ? providerReference
                        : payment.getTransactionCode();
                CompletableFuture.runAsync(() -> {
                    try {
                        notificationService.sendPaymentConfirmationEmail(
                                orderSnapshot,
                                methodSnapshot,
                                txRef
                        );
                    } catch (Exception emailEx) {
                        log.warn("[PAYMENT-EMAIL] Không thể gửi email xác nhận thanh toán cho đơn #{}: {}",
                                orderSnapshot.getOrderCode(), emailEx.getMessage());
                    }
                });
            }
        } else if ("FAILED".equals(paymentStatus) || "CANCELLED".equals(paymentStatus)) {
            payment.getOrder().setPaymentStatus(paymentStatus);
            if ("CANCELLED".equals(paymentStatus)) {
                orderService.updateStatus(
                        payment.getOrder().getId(),
                        "CANCELLED",
                        "Hủy giao dịch thanh toán " + payment.getPaymentMethod(),
                        null);
            } else {
                orderRepository.save(payment.getOrder());
                if ("VNPAY".equalsIgnoreCase(payment.getPaymentMethod()) && notificationService != null) {
                    final Order orderSnapshot = payment.getOrder();
                    CompletableFuture.runAsync(() -> {
                        try {
                            notificationService.sendOrderStatusUpdateEmail(
                                    orderSnapshot,
                                    "PENDING",
                                    "CANCELLED",
                                    "Giao dịch thanh toán qua cổng VNPay không thành công hoặc đã bị hủy",
                                    "VNPAY"
                            );
                        } catch (Exception emailEx) {
                            log.warn("[VNPAY-CANCEL-EMAIL] Không thể gửi email hủy đơn VNPay #{}: {}",
                                    orderSnapshot.getOrderCode(), emailEx.getMessage());
                        }
                    });
                }
            }
            releaseReservedInventory(payment.getOrder());
        }
        paymentRepository.save(payment);
    }

    /**
     * Khớp lệnh xuất kho khi thanh toán thành công:
     * giảm đồng thời số lượng giữ chỗ ({@code quantityReserved}) và số lượng thực tế trong kho ({@code quantityOnHand}),
     * đồng thời ghi nhật ký biến động kho loại {@code OUT}.
     */
    private void settleReservedInventory(Order order) {
        List<OrderItem> orderItems = orderService.getOrderItems(order.getId());
        List<Long> variantIds = extractVariantIdsFromOrderItems(orderItems);
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
            // Ghi nhận biến động kho loại OUT (Xuất kho)
            movements.add(buildInventoryMovement(item.getVariant(), "OUT", item.getQuantity(), order.getId(),
                    "Xác nhận thanh toán đơn " + order.getOrderCode()));
        }
        inventoryService.saveAll(lockedInventories.values());
        inventoryService.recordMovements(movements);
    }

    /**
     * Giải phóng tồn kho đang giữ chỗ khi giao dịch thanh toán bị hủy hoặc thất bại:
     * trừ lại {@code quantityReserved} (không làm thay đổi {@code quantityOnHand}) và ghi biến động kho loại {@code RELEASE}.
     */
    private void releaseReservedInventory(Order order) {
        List<OrderItem> orderItems = orderService.getOrderItems(order.getId());
        List<Long> variantIds = extractVariantIdsFromOrderItems(orderItems);
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

    /** Trích xuất danh sách {@code variantId} từ các dòng {@link OrderItem} để phục vụ khóa tồn kho hàng loạt. */
    private List<Long> extractVariantIdsFromOrderItems(List<OrderItem> orderItems) {
        return orderItems.stream()
                .map(OrderItem::getVariant)
                .filter(Objects::nonNull)
                .map(ProductVariant::getId)
                .toList();
    }

    /** Khởi tạo đối tượng nhật ký biến động tồn kho ({@link InventoryMovement}) gắn với đơn hàng ({@code referenceType = ORDER}). */
    private InventoryMovement buildInventoryMovement(
            ProductVariant variant,
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

    // ====================================================================
    // 6. KIỂM TRA QUYỀN SỞ HỮU ĐƠN, VALIDATE NGƯỜI NHẬN & CHỐNG GIAN LẬN
    // ====================================================================

    private boolean terminalCodeIsExpected(String terminalCode) {
        return vnPayService.isExpectedTerminalCode(terminalCode);
    }

    /**
     * Tìm đơn hàng theo {@code orderCode} kèm kiểm tra quyền sở hữu:
     * nếu đã đăng nhập thì khớp theo {@code userId}; nếu là khách vãng lai thì khớp theo SĐT nhận hàng.
     */
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

    /** Kiểm tra header {@code X-Cart-Token} hợp lệ (độ dài 40..128 ký tự) đối với khách vãng lai. */
    private String requireCartToken(String cartToken) {
        if (cartToken == null || cartToken.length() < 40 || cartToken.length() > 128) {
            throw new IllegalArgumentException("Thiếu hoặc sai X-Cart-Token");
        }
        return cartToken;
    }

    /** Tuần tự hóa đối tượng sang chuỗi JSON để lưu vào bảng {@code audit_logs} hoặc {@code payment_webhook_events}. */
    private String json(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException ex) {
            throw new IllegalStateException("Không thể tạo audit payload", ex);
        }
    }

    /**
     * Kiểm tra tính hợp lệ của thông tin người nhận:
     * <ul>
     *   <li>Họ tên tối thiểu 2 ký tự.</li>
     *   <li>Số điện thoại di động Việt Nam 10 chữ số, không nằm trong mẫu số ảo lặp/tăng dần.</li>
     *   <li>Địa chỉ giao hàng tối thiểu 12 ký tự và không chứa từ khóa rác ({@link #JUNK_ADDRESS_KEYWORDS}).</li>
     * </ul>
     */
    private void validateRecipientInfo(String address, String phone, String name) {
        if (name == null || name.trim().length() < 2) {
            throw new ApiException(ApiErrorCode.VALIDATION_FAILED, "Họ tên người nhận không hợp lệ (tối thiểu 2 ký tự).");
        }

        if (phone == null || !VN_PHONE_PATTERN.matcher(phone.trim()).matches()) {
            throw new ApiException(ApiErrorCode.VALIDATION_FAILED,
                    "Số điện thoại người nhận không hợp lệ. Vui lòng nhập số di động 10 số (bắt đầu bằng 03, 05, 07, 08, 09).");
        }

        // Chặn các số rác ảo đặc trưng (dãy số trùng lặp hoặc tăng/giảm dần)
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

    /**
     * Đánh giá điểm rủi ro (Risk Score) cho đơn hàng dựa trên:
     * <ol>
     *   <li>Tần suất đặt hàng của cùng số điện thoại trong vòng 1 giờ qua.</li>
     *   <li>Số lượng địa chỉ giao hàng khác tỉnh/thành phố trong thời gian ngắn (Distributed Spam).</li>
     * </ol>
     * Nếu là đơn COD có {@code riskScore >= 60}, hệ thống ghi log cảnh báo {@code [ANTI_FRAUD]} để Admin lưu ý khi duyệt đơn.
     */
    private RiskEvaluation assessRiskAndMultiProvinceSpam(CheckoutRequest request, String clientIp) {
        int riskScore = 0;
        StringBuilder reasons = new StringBuilder();

        // 1. Kiểm tra tần suất đặt hàng theo số điện thoại trong vòng 1 giờ qua (chỉ tính điểm rủi ro, không chặn cứng)
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

        // 3. Nếu là phương thức COD và điểm rủi ro cao, ghi cảnh báo để Admin kiểm duyệt
        if ("CASH_ON_DELIVERY".equals(request.paymentMethod()) && riskScore >= 60) {
            log.warn("[ANTI_FRAUD] Cảnh báo COD rủi ro cao cho phone={} ip={} riskScore={} lý do={}",
                    request.recipientPhone(), clientIp, riskScore, reasons);
        }

        String level = riskScore >= 60 ? "HIGH" : (riskScore >= 30 ? "MEDIUM" : "LOW");
        return new RiskEvaluation(riskScore, level, reasons.toString());
    }

    /** So sánh tương đối 2 địa chỉ: coi là cùng khu vực nếu trùng từ 2 từ khóa (> 3 ký tự) trở lên. */
    private boolean isSameLocation(String addr1, String addr2) {
        if (addr1 == null || addr2 == null) {
            return false;
        }
        String[] words1 = addr1.split("[,\\-\\s]+");
        int matchCount = 0;
        for (String w : words1) {
            if (w.length() > 3 && addr2.contains(w)) {
                matchCount++;
            }
        }
        return matchCount >= 2;
    }

    // ====================================================================
    // 7. TÍNH TOÁN & KIỂM TRA MÃ GIẢM GIÁ (COUPON ENGINE)
    // ====================================================================

    /** Xem trước (Preview) số tiền được giảm khi khách nhập mã giảm giá trên màn hình giỏ hàng/checkout. */
    @Transactional(readOnly = true)
    public Map<String, Object> previewCoupon(String rawCouponCode, BigDecimal subtotal, BigDecimal shippingFee, String username) {
        return previewCoupon(rawCouponCode, subtotal, shippingFee, username, null);
    }

    /** Xem trước (Preview) mã giảm giá có kiểm tra giới hạn lượt dùng theo tài khoản hoặc số điện thoại. */
    @Transactional(readOnly = true)
    public Map<String, Object> previewCoupon(
            String rawCouponCode,
            BigDecimal subtotal,
            BigDecimal shippingFee,
            String username,
            String phone
    ) {
        User user = username == null ? null : userService.findByUsername(username).orElse(null);
        BigDecimal safeSubtotal = subtotal != null && subtotal.compareTo(ZERO) > 0 ? subtotal : ZERO;
        BigDecimal safeShipping = shippingFee != null && shippingFee.compareTo(ZERO) >= 0 ? shippingFee : ZERO;

        List<CartItem> cartItems = null;
        if (user != null) {
            try {
                Optional<Cart> cartOpt = cartService.getActiveCartByUser(user.getId());
                if (cartOpt.isPresent()) {
                    cartItems = cartService.getItems(cartOpt.get().getId());
                }
            } catch (Exception ignored) {
                // Nếu không lấy được giỏ hàng khi preview thì vẫn tính theo subtotal truyền vào
            }
        }

        CouponEvaluation eval = evaluateCoupon(rawCouponCode, safeSubtotal, safeShipping, user != null ? user.getId() : null, phone, cartItems);
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

    /**
     * Đánh giá và tính số tiền giảm giá cho đơn hàng:
     * <ol>
     *   <li>Ưu tiên tra cứu trong bảng {@code coupons} qua {@link CouponService} (hỗ trợ giảm theo %, số tiền cố định, freeship và giới hạn phạm vi sản phẩm).</li>
     *   <li>Nếu không có trong DB, kiểm tra các mã mặc định của hệ thống ({@code NHAXINH10}, {@code FREESHIP}, {@code VIP500}).</li>
     * </ol>
     */
    private CouponEvaluation evaluateCoupon(
            String rawCouponCode,
            BigDecimal subtotal,
            BigDecimal shippingFee,
            Long userId,
            String phone,
            List<CartItem> items
    ) {
        if (rawCouponCode == null || rawCouponCode.isBlank()) {
            return new CouponEvaluation(null, ZERO, null);
        }
        String code = rawCouponCode.trim().toUpperCase(Locale.ROOT);

        // 1. Kiểm tra trong bảng coupons (nếu có)
        if (couponService != null) {
            Optional<Coupon> dbCouponOpt = couponService.findByCode(code);
            if (dbCouponOpt.isPresent()) {
                CouponValidationResult validationRes = couponService.validateCouponDetailed(code, subtotal, userId, phone);
                if (!validationRes.valid()) {
                    throw new ApiException(ApiErrorCode.ORDER_COUPON_INVALID, validationRes.message());
                }

                Coupon validCoupon = validationRes.coupon();
                BigDecimal applicableBase = computeApplicableSubtotal(validCoupon, subtotal, items);

                BigDecimal discount;
                String type = validCoupon.getDiscountType() != null ? validCoupon.getDiscountType().toUpperCase(Locale.ROOT) : "";
                if ("PERCENT".equals(type) || "PERCENTAGE".equals(type)) {
                    discount = applicableBase.multiply(validCoupon.getDiscountValue())
                            .divide(BigDecimal.valueOf(100), 0, RoundingMode.HALF_UP);
                    if (validCoupon.getMaxDiscountAmount() != null
                            && discount.compareTo(validCoupon.getMaxDiscountAmount()) > 0) {
                        discount = validCoupon.getMaxDiscountAmount();
                    }
                } else if ("FREESHIP".equals(type)) {
                    discount = shippingFee.compareTo(ZERO) > 0 ? shippingFee : validCoupon.getDiscountValue();
                } else {
                    discount = validCoupon.getDiscountValue().min(applicableBase);
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
                        .divide(BigDecimal.valueOf(100), 0, RoundingMode.HALF_UP);
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

    /**
     * Tính tổng tiền của các mặt hàng trong giỏ đủ điều kiện áp dụng mã giảm giá theo phạm vi ({@code scopeType}):
     * {@code ALL} (toàn bộ giỏ), {@code PRODUCT} (theo ID sản phẩm), {@code COLLECTION} (theo bộ sưu tập),
     * hoặc {@code CATEGORY} (theo danh mục).
     */
    private BigDecimal computeApplicableSubtotal(Coupon coupon, BigDecimal defaultSubtotal, List<CartItem> items) {
        if (items == null || items.isEmpty()) {
            return defaultSubtotal;
        }
        String scope = coupon.getScopeType() != null ? coupon.getScopeType().toUpperCase(Locale.ROOT) : "ALL";
        if ("ALL".equals(scope)) {
            return defaultSubtotal;
        }

        BigDecimal matchingSubtotal = ZERO;

        if ("PRODUCT".equals(scope)) {
            Set<Long> productIds = parseIds(coupon.getApplicableProductIds());
            for (CartItem item : items) {
                if (item.getVariant() != null && item.getVariant().getProduct() != null) {
                    Long pId = item.getVariant().getProduct().getId();
                    if (productIds.contains(pId)) {
                        BigDecimal linePrice = item.getVariant().getPrice().multiply(BigDecimal.valueOf(item.getQuantity()));
                        matchingSubtotal = matchingSubtotal.add(linePrice);
                    }
                }
            }
            if (matchingSubtotal.compareTo(ZERO) <= 0) {
                throw new ApiException(ApiErrorCode.ORDER_COUPON_INVALID,
                        "Mã giảm giá '" + coupon.getCode() + "' chỉ áp dụng cho một số sản phẩm chỉ định.");
            }
            return matchingSubtotal;
        }

        if ("COLLECTION".equals(scope)) {
            Set<String> targetSlugs = parseSlugs(coupon.getApplicableCollections());
            for (CartItem item : items) {
                if (item.getVariant() != null && item.getVariant().getProduct() != null) {
                    Long pId = item.getVariant().getProduct().getId();
                    List<String> pCollections = collectionRepository != null ? collectionRepository.findCollectionSlugsByProductId(pId) : List.of();
                    boolean matches = pCollections.stream().anyMatch(s -> targetSlugs.contains(s.toLowerCase(Locale.ROOT)));
                    if (matches) {
                        BigDecimal linePrice = item.getVariant().getPrice().multiply(BigDecimal.valueOf(item.getQuantity()));
                        matchingSubtotal = matchingSubtotal.add(linePrice);
                    }
                }
            }
            if (matchingSubtotal.compareTo(ZERO) <= 0) {
                throw new ApiException(ApiErrorCode.ORDER_COUPON_INVALID,
                        "Mã giảm giá '" + coupon.getCode() + "' chỉ áp dụng cho các sản phẩm thuộc bộ sưu tập được khuyến mãi.");
            }
            return matchingSubtotal;
        }

        if ("CATEGORY".equals(scope)) {
            Set<String> targetCats = parseSlugs(coupon.getApplicableCategories());
            for (CartItem item : items) {
                if (item.getVariant() != null && item.getVariant().getProduct() != null) {
                    Set<Category> cats = item.getVariant().getProduct().getCategories();
                    boolean matches = cats != null && cats.stream().anyMatch(c -> targetCats.contains(c.getSlug().toLowerCase(Locale.ROOT)));
                    if (matches) {
                        BigDecimal linePrice = item.getVariant().getPrice().multiply(BigDecimal.valueOf(item.getQuantity()));
                        matchingSubtotal = matchingSubtotal.add(linePrice);
                    }
                }
            }
            if (matchingSubtotal.compareTo(ZERO) <= 0) {
                throw new ApiException(ApiErrorCode.ORDER_COUPON_INVALID,
                        "Mã giảm giá '" + coupon.getCode() + "' chỉ áp dụng cho các danh mục sản phẩm được khuyến mãi.");
            }
            return matchingSubtotal;
        }

        return defaultSubtotal;
    }

    /** Tách chuỗi danh sách ID (ngăn cách bởi dấu phẩy, chấm phẩy hoặc khoảng trắng) thành tập hợp {@link Long}. */
    private Set<Long> parseIds(String raw) {
        if (raw == null || raw.isBlank()) {
            return Set.of();
        }
        return Arrays.stream(raw.split("[,;\\s]+"))
                .filter(s -> !s.isBlank())
                .map(s -> {
                    try {
                        return Long.parseLong(s.trim());
                    } catch (Exception e) {
                        return null;
                    }
                })
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());
    }

    /** Tách chuỗi danh sách slug (ngăn cách bởi dấu phẩy, chấm phẩy hoặc khoảng trắng) thành tập hợp chữ thường. */
    private Set<String> parseSlugs(String raw) {
        if (raw == null || raw.isBlank()) {
            return Set.of();
        }
        return Arrays.stream(raw.split("[,;\\s]+"))
                .filter(s -> !s.isBlank())
                .map(s -> s.trim().toLowerCase(Locale.ROOT))
                .collect(Collectors.toSet());
    }

    // ====================================================================
    // 8. CÁC KIỂU DỮ LIỆU NỘI BỘ (RECORDS)
    // ====================================================================

    /** Kết quả đánh giá mã giảm giá: mã đã chuẩn hóa, số tiền được giảm và thực thể {@link Coupon} trong DB (nếu có). */
    public record CouponEvaluation(
            String couponCode,
            BigDecimal discountAmount,
            Coupon dbCoupon
    ) {
    }

    /** Kết quả đánh giá rủi ro gian lận của đơn hàng. */
    public record RiskEvaluation(int riskScore, String riskLevel, String reason) {
    }

    /** Phản hồi chuẩn trả về cho cổng thanh toán VNPay (IPN / Return callback). */
    public record CallbackResult(String responseCode, String message) {
    }

    /** Dữ liệu phiên thanh toán VNPay lưu tạm trong bộ nhớ trước khi khách hoàn tất thanh toán trên cổng VNPay. */
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
