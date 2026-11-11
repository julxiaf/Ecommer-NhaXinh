package vn.nhaxinh.order;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.CompletableFuture;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.nhaxinh.catalog.ProductVariant;
import vn.nhaxinh.inventory.Inventory;
import vn.nhaxinh.inventory.InventoryMovement;
import vn.nhaxinh.inventory.InventoryService;
import vn.nhaxinh.notification.NotificationService;
import vn.nhaxinh.payment.*;

import vn.nhaxinh.security.ApiError;
import vn.nhaxinh.security.ApiErrorCode;
import vn.nhaxinh.security.ApiException;
import vn.nhaxinh.user.User;

@Service
@Transactional
public class OrderService {

    private static final Logger log = LoggerFactory.getLogger(OrderService.class);

    private final OrderRepository orderRepository;
    private final OrderItemRepository orderItemRepository;
    private final OrderStatusHistoryRepository statusHistoryRepository;
    private final OrderDepositRepository depositRepository;
    private final PaymentRepository paymentRepository;
    private final NotificationService notificationService;
    private final InventoryService inventoryService;

    public OrderService(
            OrderRepository orderRepository,
            OrderItemRepository orderItemRepository,
            OrderStatusHistoryRepository statusHistoryRepository,
            OrderDepositRepository depositRepository,
            PaymentRepository paymentRepository
    ) {
        this(
                orderRepository,
                orderItemRepository,
                statusHistoryRepository,
                depositRepository,
                paymentRepository,
                null,
                null
        );
    }

    public OrderService(
            OrderRepository orderRepository,
            OrderItemRepository orderItemRepository,
            OrderStatusHistoryRepository statusHistoryRepository,
            OrderDepositRepository depositRepository,
            PaymentRepository paymentRepository,
            NotificationService notificationService
    ) {
        this(
                orderRepository,
                orderItemRepository,
                statusHistoryRepository,
                depositRepository,
                paymentRepository,
                notificationService,
                null
        );
    }

    @Autowired
    public OrderService(
            OrderRepository orderRepository,
            OrderItemRepository orderItemRepository,
            OrderStatusHistoryRepository statusHistoryRepository,
            OrderDepositRepository depositRepository,
            PaymentRepository paymentRepository,
            NotificationService notificationService,
            InventoryService inventoryService
    ) {
        this.orderRepository = orderRepository;
        this.orderItemRepository = orderItemRepository;
        this.statusHistoryRepository = statusHistoryRepository;
        this.depositRepository = depositRepository;
        this.paymentRepository = paymentRepository;
        this.notificationService = notificationService;
        this.inventoryService = inventoryService;
    }

    @Transactional(readOnly = true)
    public Page<Order> findAll(Pageable pageable) {
        return orderRepository.findAll(pageable);
    }

    @Transactional(readOnly = true)
    public Page<Order> search(String keyword, String orderStatus, String paymentStatus, Pageable pageable) {
        String cleanKeyword = (keyword == null || keyword.isBlank()) ? null : keyword.trim();
        String cleanStatus = (orderStatus == null || orderStatus.isBlank()) ? null : orderStatus.trim().toUpperCase();
        String cleanPayment = (paymentStatus == null || paymentStatus.isBlank()) ? null : paymentStatus.trim().toUpperCase();
        return orderRepository.search(cleanKeyword, cleanStatus, cleanPayment, pageable);
    }

    @Transactional(readOnly = true)
    public Optional<Order> findById(Long id) {
        return orderRepository.findById(id);
    }

    @Transactional(readOnly = true)
    public Order getOrder(Long id) {
        return orderRepository.findById(id)
                .orElseThrow(() -> new ApiException(ApiErrorCode.ORDER_NOT_FOUND, "orderId=" + id));
    }

    @Transactional(readOnly = true)
    public Optional<Order> findByOrderCode(String orderCode) {
        return orderRepository.findByOrderCode(orderCode);
    }

    @Transactional(readOnly = true)
    public Optional<Order> lookupOrder(String orderCode, String phone) {
        if (phone != null && !phone.isBlank()) {
            return orderRepository.findByOrderCodeAndRecipientPhone(orderCode.trim(), phone.trim());
        }
        return orderRepository.findByOrderCode(orderCode.trim());
    }

    @Transactional(readOnly = true)
    public Page<Order> findByUserId(Long userId, Pageable pageable) {
        return orderRepository.findByUserIdOrderByCreatedAtDesc(userId, pageable);
    }

    @Transactional(readOnly = true)
    public Page<Order> findCustomerOrders(User user, Pageable pageable) {
        if (user == null) {
            return Page.empty(pageable);
        }
        String email = (user.getEmail() != null && !user.getEmail().isBlank() && !user.getEmail().endsWith("@guest.nhaxinh.com"))
                ? user.getEmail().trim()
                : null;
        String phone = (user.getPhone() != null && !user.getPhone().isBlank())
                ? user.getPhone().trim()
                : null;
        return orderRepository.findCustomerOrders(user.getId(), email, phone, pageable);
    }

    @Transactional(readOnly = true)
    public Page<Order> findByStatus(String status, Pageable pageable) {
        return orderRepository.findByOrderStatusOrderByCreatedAtDesc(status, pageable);
    }

    public Order createOrder(Order order) {
        if (order.getCreatedBy() == null || order.getCreatedBy().isBlank()) {
            if (order.getUser() != null) {
                String name = order.getUser().getFullName();
                if (name == null || name.isBlank()) {
                    name = order.getUser().getUsername();
                }
                order.setCreatedBy(name != null && !name.isBlank() ? name : "Khách trực tuyến");
            } else {
                order.setCreatedBy("Khách trực tuyến");
            }
        }
        Order saved = orderRepository.save(order);
        OrderStatusHistory history = new OrderStatusHistory(
                saved,
                null,
                saved.getOrderStatus(),
                "Đơn hàng được khởi tạo",
                null
        );
        statusHistoryRepository.save(history);
        log.info("[ORDER] Đã khởi tạo đơn hàng id={} code='{}' | người tạo='{}' | tổng tiền={}",
                saved.getId(), saved.getOrderCode(), saved.getCreatedBy(), saved.getTotalAmount());
        return saved;
    }

    /**
     * Tạo đơn hàng / hóa đơn bán hàng trực tiếp từ trang Quản trị (Admin) và gửi email xác nhận.
     */
    public Order createAdminOrder(OrderDtos.CreateAdminOrderRequest req, User createdBy) {
        String code = (req.orderCode() != null && !req.orderCode().isBlank())
                ? req.orderCode().trim()
                : "NX-HD-" + System.currentTimeMillis();

        // Nếu đơn hàng với mã này đã tồn tại (do CheckoutController vừa tạo), chỉ gửi bổ sung email nếu cần
        Optional<Order> existingOpt = orderRepository.findByOrderCode(code);
        if (existingOpt.isPresent()) {
            Order existing = existingOpt.get();
            if ((existing.getRecipientEmail() == null || existing.getRecipientEmail().isBlank())
                    && req.email() != null && !req.email().isBlank()
                    && !req.email().endsWith("@guest.nhaxinh.com")) {
                existing.setRecipientEmail(req.email().trim());
                existing = orderRepository.save(existing);
                if (notificationService != null) {
                    final Order existingSnapshot = existing;
                    final List<OrderItem> existingItems = List.copyOf(getOrderItems(existing.getId()));
                    final String existingPm = getPaymentMethod(existing.getId());
                    CompletableFuture.runAsync(() -> {
                        try {
                            notificationService.sendOrderConfirmationEmail(existingSnapshot, existingItems, existingPm);
                        } catch (Exception ignored) {
                        }
                    });
                }
            }
            return existing;
        }

        Order order = new Order();
        order.setOrderCode(code);
        order.setRecipientName(req.customerName().trim());
        order.setRecipientPhone(req.phone().trim());
        String cleanEmail = (req.email() != null && !req.email().isBlank() && !req.email().endsWith("@guest.nhaxinh.com"))
                ? req.email().trim()
                : null;
        order.setRecipientEmail(cleanEmail);
        order.setShippingAddress(req.address() != null && !req.address().isBlank() ? req.address().trim() : "Nhận trực tiếp tại showroom Nhà Xinh");
        order.setCustomerNote(req.note());

        String creatorName = null;
        if (createdBy != null) {
            creatorName = (createdBy.getFullName() != null && !createdBy.getFullName().isBlank())
                    ? createdBy.getFullName().trim()
                    : createdBy.getUsername();
        }
        if ((creatorName == null || creatorName.isBlank()) && req.createdBy() != null && !req.createdBy().isBlank()) {
            creatorName = req.createdBy().trim();
        }
        if (creatorName == null || creatorName.isBlank()) {
            creatorName = "Quản trị viên";
        }
        order.setCreatedBy(creatorName);

        String orderStatus = req.status() != null ? req.status().trim().toUpperCase() : "CONFIRMED";
        order.setOrderStatus(orderStatus);

        String payStatus = req.paymentStatus() != null && "PAID".equalsIgnoreCase(req.paymentStatus().trim()) ? "PAID" : "UNPAID";
        order.setPaymentStatus(payStatus);

        BigDecimal subtotal = BigDecimal.ZERO;
        if (req.items() != null) {
            for (OrderDtos.CreateAdminOrderItemRequest itemReq : req.items()) {
                BigDecimal price = itemReq.price() != null ? itemReq.price() : BigDecimal.ZERO;
                int qty = itemReq.quantity() != null && itemReq.quantity() > 0 ? itemReq.quantity() : 1;
                BigDecimal lineTotal = price.multiply(BigDecimal.valueOf(qty));
                subtotal = subtotal.add(lineTotal);

                OrderItem item = new OrderItem();
                item.setOrder(order);
                item.setProductName(itemReq.name() != null ? itemReq.name() : "Sản phẩm Nhà Xinh");
                item.setSku(itemReq.variantSku() != null && !itemReq.variantSku().isBlank() ? itemReq.variantSku() : "NX-SKU");
                item.setVariantName(itemReq.variantDetails());
                item.setUnitPrice(price);
                item.setQuantity(qty);
                item.setDiscountAmount(BigDecimal.ZERO);
                item.setLineTotal(lineTotal);
                order.getItems().add(item);
            }
        }

        BigDecimal shippingFee = req.shippingFee() != null ? req.shippingFee() : BigDecimal.ZERO;
        BigDecimal discountAmount = req.discountAmount() != null ? req.discountAmount() : BigDecimal.ZERO;
        BigDecimal totalAmount = req.total() != null
                ? req.total()
                : subtotal.add(shippingFee).subtract(discountAmount).max(BigDecimal.ZERO);

        order.setSubtotal(req.subtotal() != null ? req.subtotal() : subtotal);
        order.setShippingFee(shippingFee);
        order.setDiscountAmount(discountAmount);
        order.setTotalAmount(totalAmount);

        Order saved = orderRepository.save(order);

        OrderStatusHistory history = new OrderStatusHistory(
                saved,
                null,
                saved.getOrderStatus(),
                req.note() != null && !req.note().isBlank() ? req.note().trim() : "Tạo hóa đơn bán hàng bởi Quản trị viên",
                createdBy
        );
        statusHistoryRepository.save(history);

        String rawMethod = req.paymentMethod() != null ? req.paymentMethod().trim().toUpperCase() : "CASH_ON_DELIVERY";
        String normalizedMethod = switch (rawMethod) {
            case "VNPAY" -> "VNPAY";
            case "BANK_TRANSFER", "VIETQR", "MOMO" -> "BANK_TRANSFER";
            default -> "CASH_ON_DELIVERY";
        };

        Payment payment = new Payment();
        payment.setOrder(saved);
        payment.setPaymentType("FULL_PAYMENT");
        payment.setPaymentMethod(normalizedMethod);
        payment.setAmount(totalAmount);
        payment.setPaymentStatus("PAID".equals(payStatus) ? "SUCCESS" : "PENDING");
        if ("PAID".equals(payStatus)) {
            payment.setPaidAt(LocalDateTime.now());
        }
        payment.setTransactionCode("PAY-" + saved.getOrderCode() + "-" + System.currentTimeMillis());
        paymentRepository.save(payment);

        List<Map<String, Object>> itemSummary = saved.getItems().stream()
                .map(it -> Map.<String, Object>of(
                        "sku", it.getSku() != null ? it.getSku() : "",
                        "productName", it.getProductName() != null ? it.getProductName() : "",
                        "variant", it.getVariantName() != null ? it.getVariantName() : "",
                        "quantity", it.getQuantity(),
                        "unitPrice", it.getUnitPrice(),
                        "lineTotal", it.getLineTotal()
                ))
                .toList();

        log.info("[ORDER-ADMIN-CREATE] Tạo hóa đơn mới id={} code='{}' | người tạo='{}' | khách hàng='{}' (SĐT='{}', email='{}', Đ/C='{}') | trạng thái={} | thanh toán={} ({}) | tạm tính={}, giảm giá={}, phí ship={}, tổng cộng={} | danh sách sản phẩm ({}): {}",
                saved.getId(), saved.getOrderCode(), creatorName,
                saved.getRecipientName(), saved.getRecipientPhone(), saved.getRecipientEmail(), saved.getShippingAddress(),
                saved.getOrderStatus(), saved.getPaymentStatus(), normalizedMethod,
                saved.getSubtotal(), saved.getDiscountAmount(), saved.getShippingFee(), saved.getTotalAmount(),
                itemSummary.size(), itemSummary);

        if (notificationService != null && cleanEmail != null) {
            final Order savedSnapshot = saved;
            final List<OrderItem> savedItems = List.copyOf(saved.getItems());
            final String methodSnapshot = normalizedMethod;
            final String emailSnapshot = cleanEmail;
            CompletableFuture.runAsync(() -> {
                try {
                    notificationService.sendOrderConfirmationEmail(savedSnapshot, savedItems, methodSnapshot, emailSnapshot);
                } catch (Exception emailEx) {
                    log.warn("[ADMIN-ORDER-EMAIL] Không thể gửi email hóa đơn #{}: {}", savedSnapshot.getOrderCode(), emailEx.getMessage());
                }
            });
        }

        return saved;
    }

    /**
     * Sơ đồ chuyển đổi trạng thái hợp lệ (State Machine Rules) theo yêu cầu kỹ thuật:
     * - PENDING    -> CONFIRMED, CANCELLED
     * - CONFIRMED  -> PROCESSING, CANCELLED
     * - PROCESSING -> SHIPPING, CANCELLED
     * - SHIPPING   -> COMPLETED
     * - COMPLETED  -> Không cho phép chuyển đổi bất kỳ trạng thái nào nữa (Khóa)
     * - CANCELLED  -> Không cho phép chuyển đổi bất kỳ trạng thái nào nữa (Khóa)
     */
    public static final Map<String, Set<String>> VALID_TRANSITIONS = Map.of(
            "PENDING", Set.of("CONFIRMED", "CANCELLED"),
            "CONFIRMED", Set.of("PROCESSING", "CANCELLED"),
            "PROCESSING", Set.of("SHIPPING", "CANCELLED"),
            "SHIPPING", Set.of("COMPLETED"),
            "COMPLETED", Set.of(),
            "CANCELLED", Set.of()
    );

    public static String normalizeOrderStatus(String status) {
        if (status == null || status.isBlank()) {
            return "PENDING";
        }
        String s = status.trim().toUpperCase();
        if ("DELIVERED".equals(s)) return "COMPLETED";
        if ("REFUNDED".equals(s)) return "CANCELLED";
        return s;
    }

    public static boolean isValidTransition(String currentStatus, String targetStatus) {
        if (currentStatus == null || targetStatus == null) {
            return false;
        }
        String from = normalizeOrderStatus(currentStatus);
        String to = normalizeOrderStatus(targetStatus);
        Set<String> allowed = VALID_TRANSITIONS.get(from);
        return allowed != null && allowed.contains(to);
    }

    public Order updateStatus(Long orderId, String newStatus, String note, User changedBy) {
        Order order = getOrder(orderId);
        String rawOldStatus = order.getOrderStatus();
        String oldStatus = normalizeOrderStatus(rawOldStatus);
        String normalizedNewStatus = normalizeOrderStatus(newStatus);

        // Kiểm tra logic chuyển đổi trạng thái theo State Machine
        if (!isValidTransition(oldStatus, normalizedNewStatus)) {
            String errorMsg = String.format("Invalid status transition from %s to %s", oldStatus, normalizedNewStatus);
            log.warn("[ORDER-STATE-MACHINE] Vi phạm quy tắc luồng trạng thái đơn #{}: {} -> {}. Từ chối cập nhật.",
                    order.getOrderCode(), oldStatus, normalizedNewStatus);
            throw new ApiException(
                    ApiErrorCode.VALIDATION_FAILED,
                    errorMsg,
                    errorMsg,
                    List.of(new ApiError.FieldError("status", errorMsg))
            );
        }

        order.setOrderStatus(normalizedNewStatus);

        // =========================================================================
        // REVIEW [NGHIỆP VỤ TỰ ĐỘNG ĐỒNG BỘ THANH TOÁN CHO ĐƠN COD KHI GIAO XONG]:
        // -------------------------------------------------------------------------
        // Với đơn hàng COD (Thanh toán tiền mặt khi nhận hàng), nguyên tắc giao nhận
        // là khách hàng chỉ nhận được hàng sau khi đã thanh toán đầy đủ tiền mặt cho shipper.
        // Do đó khi đơn hàng hoàn tất bàn giao (COMPLETED), hệ thống tự động cập nhật
        // trạng thái thanh toán sang PAID (Đã thanh toán) nếu đơn chưa được đánh dấu PAID.
        // =========================================================================
        String autoCheckMethod = getPaymentMethod(orderId);
        boolean isCodOrder = "CASH_ON_DELIVERY".equalsIgnoreCase(autoCheckMethod) || "COD".equalsIgnoreCase(autoCheckMethod);
        if ("COMPLETED".equalsIgnoreCase(normalizedNewStatus) && isCodOrder && !"PAID".equalsIgnoreCase(order.getPaymentStatus())) {
            order.setPaymentStatus("PAID");
            if (paymentRepository != null) {
                List<Payment> payments = paymentRepository.findByOrderId(orderId);
                if (payments != null && !payments.isEmpty()) {
                    Payment lastPay = payments.get(payments.size() - 1);
                    lastPay.setPaymentStatus("SUCCESS");
                    if (lastPay.getPaidAt() == null) {
                        lastPay.setPaidAt(LocalDateTime.now());
                    }
                    paymentRepository.save(lastPay);
                }
            }
            log.info("[ORDER-AUTO-COD-PAID] Đơn hàng COD id={} code='{}' hoàn tất giao hàng -> Tự động chuyển trạng thái thanh toán: UNPAID -> PAID",
                    orderId, order.getOrderCode());
        }

        order.setUpdatedAt(LocalDateTime.now());
        Order updated = orderRepository.save(order);

        // Tự động giải phóng hàng giữ chỗ / hoàn trả tồn kho khi Admin hủy đơn
        if ("CANCELLED".equalsIgnoreCase(normalizedNewStatus) && !"CANCELLED".equalsIgnoreCase(oldStatus)) {
            releaseOrderInventory(updated, "Admin hủy đơn: " + (note != null ? note.trim() : ""));
        }

        OrderStatusHistory history = new OrderStatusHistory(
                updated,
                oldStatus,
                normalizedNewStatus,
                note != null ? note.trim() : null,
                changedBy
        );
        statusHistoryRepository.save(history);

        log.info("[ORDER-STATUS-UPDATE] Cập nhật trạng thái đơn hàng id={} code='{}' | khách hàng='{}' (SĐT='{}') | tổng tiền={} | trạng thái: [{} -> {}] | ghi chú='{}' | người thực hiện='{}'",
                orderId, order.getOrderCode(), order.getRecipientName(), order.getRecipientPhone(), order.getTotalAmount(),
                oldStatus, normalizedNewStatus, note != null ? note.trim() : "",
                changedBy != null ? changedBy.getUsername() : "SYSTEM");

        if (notificationService != null && !normalizedNewStatus.equalsIgnoreCase(oldStatus)) {
            final String paymentMethod = getPaymentMethod(orderId);
            final List<OrderItem> itemsSnapshot = List.copyOf(getOrderItems(orderId));
            if (updated.getItems().isEmpty() && !itemsSnapshot.isEmpty()) {
                updated.getItems().addAll(itemsSnapshot);
            }
            final Order orderSnapshot = updated;
            final String oldStatusSnapshot = oldStatus;
            final String newStatusSnapshot = normalizedNewStatus;
            final String noteSnapshot = note;
            CompletableFuture.runAsync(() -> {
                try {
                    boolean isCod = "CASH_ON_DELIVERY".equalsIgnoreCase(paymentMethod) || "COD".equalsIgnoreCase(paymentMethod);
                    if ("CONFIRMED".equalsIgnoreCase(newStatusSnapshot) && isCod) {
                        notificationService.sendOrderConfirmationEmail(orderSnapshot, itemsSnapshot, paymentMethod);
                    } else {
                        notificationService.sendOrderStatusUpdateEmail(orderSnapshot, oldStatusSnapshot, newStatusSnapshot, noteSnapshot, paymentMethod);
                    }
                } catch (Exception e) {
                    log.warn("[EMAIL-ORDER-STATUS] Không thể gửi email cập nhật trạng thái đơn #{}: {}",
                            orderSnapshot.getOrderCode(), e.getMessage());
                }
            });
        }

        return updated;
    }

    @Transactional(readOnly = true)
    public String getPaymentMethod(Long orderId) {
        if (paymentRepository == null || orderId == null) {
            return "CASH_ON_DELIVERY";
        }
        List<Payment> payments = paymentRepository.findByOrderId(orderId);
        if (payments != null && !payments.isEmpty()) {
            return payments.get(payments.size() - 1).getPaymentMethod();
        }
        return "CASH_ON_DELIVERY";
    }

    /**
     * Batch load phương thức thanh toán cho danh sách orderIds trong 1 câu query duy nhất (tránh N+1)
     */
    @Transactional(readOnly = true)
    public Map<Long, String> getPaymentMethods(List<Long> orderIds) {
        if (orderIds == null || orderIds.isEmpty() || paymentRepository == null) {
            return Map.of();
        }
        List<Payment> payments = paymentRepository.findByOrderIdIn(orderIds);
        Map<Long, String> map = new java.util.HashMap<>();
        for (Payment p : payments) {
            if (p.getOrder() != null && p.getPaymentMethod() != null) {
                map.put(p.getOrder().getId(), p.getPaymentMethod());
            }
        }
        return map;
    }

    /**
     * Batch load danh sách sản phẩm (order items) kèm variant cho danh sách orderIds (tránh N+1)
     */
    @Transactional(readOnly = true)
    public Map<Long, List<OrderItem>> getOrderItemsBatch(List<Long> orderIds) {
        if (orderIds == null || orderIds.isEmpty()) {
            return Map.of();
        }
        List<OrderItem> items = orderItemRepository.findByOrderIdIn(orderIds);
        return items.stream().collect(Collectors.groupingBy(it -> it.getOrder().getId()));
    }

    /**
     * Batch load lịch sử trạng thái kèm người thao tác cho danh sách orderIds (tránh N+1)
     */
    @Transactional(readOnly = true)
    public Map<Long, List<OrderStatusHistory>> getStatusHistoryBatch(List<Long> orderIds) {
        if (orderIds == null || orderIds.isEmpty()) {
            return Map.of();
        }
        List<OrderStatusHistory> histories = statusHistoryRepository.findByOrderIdInOrderByCreatedAtDesc(orderIds);
        return histories.stream().collect(Collectors.groupingBy(h -> h.getOrder().getId()));
    }

    public Order updatePaymentStatus(Long orderId, String newPaymentStatus, String note, User changedBy) {
        return updatePayment(orderId, newPaymentStatus, null, note, changedBy);
    }

    public Order updatePayment(Long orderId, String newPaymentStatus, String newPaymentMethod, String note, User changedBy) {
        Order order = getOrder(orderId);
        String currentOrderStatus = order.getOrderStatus();

        String oldPayment = order.getPaymentStatus();
        String normalizedPayment = newPaymentStatus != null ? newPaymentStatus.trim().toUpperCase() : oldPayment;
        String oldMethod = getPaymentMethod(orderId);
        String normalizedMethod = (newPaymentMethod != null && !newPaymentMethod.isBlank())
                ? newPaymentMethod.trim().toUpperCase()
                : oldMethod;

        /*
         * =========================================================================
         * CODE REVIEW & KIỂM SOÁT NGHIỆP VỤ THANH TOÁN CHO ĐƠN HOÀN TẤT VÀ ĐƠN HỦY:
         * -------------------------------------------------------------------------
         * 1. TRƯỜNG HỢP ĐƠN HÀNG ĐÃ GIAO THÀNH CÔNG (COMPLETED / DELIVERED):
         *    - Nghiệp vụ COD: Sau khi shipper giao hàng xong, tiền mặt được nộp về và
         *      kế toán đối soát doanh thu. Kế toán cần quyền cập nhật từ UNPAID -> PAID.
         *    - Nghiệp vụ Đổi trả / Hoàn hàng: Khách hàng đổi trả trong vòng 3 ngày theo
         *      chính sách Nhà Xinh. Sau khi kiểm tra hàng nguyên vẹn, kế toán thực hiện
         *      hoàn tiền và cập nhật trạng thái thanh toán sang REFUNDED (Đã hoàn tiền).
         *    - Nghiệp vụ Khóa an toàn: Khóa cố định phương thức thanh toán (normalizedMethod = oldMethod),
         *      không cho phép đổi lung tung phương thức (ví dụ COD sang VNPAY) của đơn đã hoàn tất.
         *    - Từ chối nếu đưa đơn đã giao thành công về trạng thái thanh toán không hợp lệ (như UNPAID).
         *
         * 2. TRƯỜNG HỢP ĐƠN HÀNG ĐÃ HỦY (CANCELLED):
         *    - Đơn hủy trước đó đã thanh toán online (PAID qua VNPAY / Chuyển khoản): Kế toán
         *      cần quyền chuyển sang REFUNDED khi đã chuyển trả tiền cho khách.
         *    - Từ chối nếu đơn đã hủy mà lại cố tình cập nhật thành PAID.
         * =========================================================================
         */
        if ("COMPLETED".equalsIgnoreCase(currentOrderStatus) || "DELIVERED".equalsIgnoreCase(currentOrderStatus)) {
            // Khóa phương thức thanh toán gốc, không cho phép đổi phương thức khi đơn đã giao
            normalizedMethod = oldMethod;

            boolean isValidForCompleted = "PAID".equalsIgnoreCase(normalizedPayment)
                    || "REFUNDED".equalsIgnoreCase(normalizedPayment)
                    || normalizedPayment.equalsIgnoreCase(oldPayment);

            if (!isValidForCompleted) {
                log.warn("[ORDER-PAYMENT-VALIDATION] Từ chối đổi thanh toán đơn đã hoàn tất #{} sang {}", order.getOrderCode(), normalizedPayment);
                throw new ApiException(
                        ApiErrorCode.VALIDATION_FAILED,
                        "Đơn hàng đã hoàn tất chỉ cho phép cập nhật sang Đã thanh toán (PAID) hoặc Hoàn tiền đổi trả (REFUNDED)."
                );
            }
        }

        if ("CANCELLED".equalsIgnoreCase(currentOrderStatus)) {
            // Khóa phương thức thanh toán gốc
            normalizedMethod = oldMethod;

            boolean isValidForCancelled = "REFUNDED".equalsIgnoreCase(normalizedPayment)
                    || normalizedPayment.equalsIgnoreCase(oldPayment);

            if (!isValidForCancelled) {
                log.warn("[ORDER-PAYMENT-VALIDATION] Từ chối đổi thanh toán đơn đã hủy #{} sang {}", order.getOrderCode(), normalizedPayment);
                throw new ApiException(
                        ApiErrorCode.VALIDATION_FAILED,
                        "Đơn hàng đã bị hủy chỉ cho phép cập nhật sang trạng thái Hoàn tiền (REFUNDED)."
                );
            }
        }

        order.setPaymentStatus(normalizedPayment);
        order.setUpdatedAt(LocalDateTime.now());
        Order updated = orderRepository.save(order);

        List<Payment> payments = paymentRepository.findByOrderId(orderId);
        Payment payment;
        if (payments != null && !payments.isEmpty()) {
            payment = payments.get(payments.size() - 1);
        } else {
            payment = new Payment();
            payment.setOrder(order);
            payment.setPaymentType("FULL");
            payment.setAmount(order.getTotalAmount() != null ? order.getTotalAmount() : BigDecimal.ZERO);
            payment.setTransactionCode("PAY-" + order.getOrderCode() + "-" + System.currentTimeMillis());
        }
        payment.setPaymentMethod(normalizedMethod);
        payment.setPaymentStatus("PAID".equalsIgnoreCase(normalizedPayment) ? "SUCCESS" : ("REFUNDED".equalsIgnoreCase(normalizedPayment) ? "REFUNDED" : "PENDING"));
        if ("PAID".equalsIgnoreCase(normalizedPayment) && payment.getPaidAt() == null) {
            payment.setPaidAt(LocalDateTime.now());
        }
        paymentRepository.save(payment);

        StringBuilder historyNote = new StringBuilder();
        if (note != null && !note.isBlank()) {
            historyNote.append(note.trim()).append(" | ");
        }
        historyNote.append("Thanh toán: ").append(oldPayment).append(" -> ").append(normalizedPayment);
        if (!oldMethod.equalsIgnoreCase(normalizedMethod)) {
            historyNote.append(" | Phương thức: ").append(oldMethod).append(" -> ").append(normalizedMethod);
        }

        OrderStatusHistory history = new OrderStatusHistory(
                updated,
                "PAYMENT_" + oldPayment,
                "PAYMENT_" + normalizedPayment,
                historyNote.toString(),
                changedBy
        );
        statusHistoryRepository.save(history);

        log.info("[ORDER-PAYMENT-UPDATE] Cập nhật thanh toán đơn hàng id={} code='{}' | khách hàng='{}' | tổng tiền={} | trạng thái TT: [{} -> {}] | phương thức TT: [{} -> {}] | mã GD='{}' | ghi chú='{}' | người thực hiện='{}'",
                orderId, order.getOrderCode(), order.getRecipientName(), order.getTotalAmount(),
                oldPayment, normalizedPayment, oldMethod, normalizedMethod,
                payment.getTransactionCode(), note != null ? note.trim() : "",
                changedBy != null ? changedBy.getUsername() : "SYSTEM");

        if (notificationService != null && "PAID".equalsIgnoreCase(normalizedPayment) && !"PAID".equalsIgnoreCase(oldPayment)) {
            final Order orderForEmail = updated;
            final String fMethod = normalizedMethod;
            final String fTxCode = payment.getTransactionCode();
            CompletableFuture.runAsync(() -> {
                try {
                    notificationService.sendPaymentConfirmationEmail(orderForEmail, fMethod, fTxCode);
                } catch (Exception e) {
                    log.warn("[EMAIL-ASYNC] Không thể gửi email xác nhận thanh toán đơn #{}: {}",
                            orderForEmail.getOrderCode(), e.getMessage());
                }
            });
        }

        return updated;
    }

    public Order updateShippingInfo(Long orderId, String recipientName, String recipientPhone,
                                    String shippingAddress, String customerNote) {
        Order order = getOrder(orderId);
        String currentStatus = order.getOrderStatus();

        // Chỉ có thể cập nhật thông tin nhận hàng khi đơn hàng CHƯA ĐƯỢC GIAO ĐI
        if ("COMPLETED".equalsIgnoreCase(currentStatus) || "DELIVERED".equalsIgnoreCase(currentStatus)) {
            log.warn("[ORDER] Từ chối cập nhật thông tin giao hàng đơn #{}: Đơn hàng đã giao thành công", order.getOrderCode());
            throw new ApiException(ApiErrorCode.VALIDATION_FAILED, "Đơn hàng đã giao thành công, không thể thay đổi thông tin nhận hàng.");
        }
        if ("SHIPPING".equalsIgnoreCase(currentStatus)) {
            log.warn("[ORDER] Từ chối cập nhật thông tin giao hàng đơn #{}: Đơn hàng đã giao đi (SHIPPING)", order.getOrderCode());
            throw new ApiException(ApiErrorCode.VALIDATION_FAILED, "Đơn hàng đã được bàn giao vận chuyển và đang giao đi, không thể thay đổi thông tin nhận hàng.");
        }
        if ("CANCELLED".equalsIgnoreCase(currentStatus)) {
            log.warn("[ORDER] Từ chối cập nhật thông tin giao hàng đơn #{}: Đơn hàng đã bị hủy", order.getOrderCode());
            throw new ApiException(ApiErrorCode.VALIDATION_FAILED, "Đơn hàng đã bị hủy, không thể thay đổi thông tin nhận hàng.");
        }

        Map<String, Object> shippingChanges = new LinkedHashMap<>();
        String newName = recipientName != null ? recipientName.trim() : "";
        String newPhone = recipientPhone != null ? recipientPhone.trim() : "";
        String newAddr = shippingAddress != null ? shippingAddress.trim() : "";
        String newNote = customerNote != null ? customerNote.trim() : order.getCustomerNote();

        if (!Objects.equals(order.getRecipientName(), newName)) {
            shippingChanges.put("recipientName", Map.of("old", String.valueOf(order.getRecipientName()), "new", newName));
        }
        if (!Objects.equals(order.getRecipientPhone(), newPhone)) {
            shippingChanges.put("recipientPhone", Map.of("old", String.valueOf(order.getRecipientPhone()), "new", newPhone));
        }
        if (!Objects.equals(order.getShippingAddress(), newAddr)) {
            shippingChanges.put("shippingAddress", Map.of("old", String.valueOf(order.getShippingAddress()), "new", newAddr));
        }
        if (customerNote != null && !Objects.equals(order.getCustomerNote(), newNote)) {
            shippingChanges.put("customerNote", Map.of("old", String.valueOf(order.getCustomerNote()), "new", String.valueOf(newNote)));
        }

        order.setRecipientName(newName);
        order.setRecipientPhone(newPhone);
        order.setShippingAddress(newAddr);
        if (customerNote != null) {
            order.setCustomerNote(newNote);
        }
        order.setUpdatedAt(LocalDateTime.now());
        Order updated = orderRepository.save(order);

        log.info("[ORDER-SHIPPING-UPDATE] Cập nhật thông tin giao hàng đơn id={} code='{}' | Chi tiết các trường thay đổi ({}): {}",
                orderId, order.getOrderCode(), shippingChanges.size(), shippingChanges);
        return updated;
    }

    public Order cancelOrder(String orderCode, String reason, String username, String phone) {
        return cancelOrder(orderCode, reason, null, username, phone, null, false);
    }

    public Order cancelOrder(
            String orderCode,
            String reason,
            User currentUser,
            String username,
            String phone,
            String email,
            boolean isStaffOrAdmin
    ) {
        Order order = orderRepository.findByOrderCode(orderCode)
                .orElseThrow(() -> new ApiException(ApiErrorCode.ORDER_NOT_FOUND, "orderCode=" + orderCode));

        Long orderUserId = order.getUser() != null ? order.getUser().getId() : null;
        String orderUsername = order.getUser() != null ? order.getUser().getUsername() : null;
        String orderRecipientEmail = order.getRecipientEmail();
        String orderRecipientPhone = order.getRecipientPhone();

        // Kiểm tra quyền hủy đồng nhất với myOrders và getOrderDetail:
        // 1. Admin hoặc Staff
        // 2. Tài khoản đang đăng nhập khớp user.id, username, email hoặc phone với đơn hàng
        // 3. Cung cấp đúng số điện thoại nhận hàng hoặc email nhận hàng của đơn
        boolean isAuthorized = isStaffOrAdmin;
        String authMatchReason = isStaffOrAdmin ? "STAFF_OR_ADMIN" : "NONE";

        if (!isAuthorized && order.getUser() != null) {
            if (currentUser != null && currentUser.getId() != null && currentUser.getId().equals(orderUserId)) {
                isAuthorized = true;
                authMatchReason = "MATCH_USER_ID";
            } else if (username != null && orderUsername != null && username.trim().equalsIgnoreCase(orderUsername.trim())) {
                isAuthorized = true;
                authMatchReason = "MATCH_USERNAME";
            } else if (username != null && order.getUser().getEmail() != null && username.trim().equalsIgnoreCase(order.getUser().getEmail().trim())) {
                isAuthorized = true;
                authMatchReason = "MATCH_ORDER_USER_EMAIL";
            }
        }

        if (!isAuthorized && currentUser != null) {
            boolean sameEmail = currentUser.getEmail() != null && orderRecipientEmail != null
                    && currentUser.getEmail().trim().equalsIgnoreCase(orderRecipientEmail.trim());
            boolean samePhone = currentUser.getPhone() != null && orderRecipientPhone != null
                    && normalizePhone(currentUser.getPhone()).equals(normalizePhone(orderRecipientPhone));
            if (sameEmail) {
                isAuthorized = true;
                authMatchReason = "MATCH_CURRENT_USER_EMAIL";
            } else if (samePhone) {
                isAuthorized = true;
                authMatchReason = "MATCH_CURRENT_USER_PHONE";
            }
        }

        if (!isAuthorized && username != null && orderRecipientEmail != null
                && username.trim().equalsIgnoreCase(orderRecipientEmail.trim())) {
            isAuthorized = true;
            authMatchReason = "MATCH_PRINCIPAL_EMAIL";
        }

        if (!isAuthorized && phone != null && !phone.isBlank() && orderRecipientPhone != null
                && normalizePhone(phone).equals(normalizePhone(orderRecipientPhone))) {
            isAuthorized = true;
            authMatchReason = "MATCH_PARAM_PHONE";
        }

        if (!isAuthorized && email != null && !email.isBlank() && orderRecipientEmail != null
                && email.trim().equalsIgnoreCase(orderRecipientEmail.trim())) {
            isAuthorized = true;
            authMatchReason = "MATCH_PARAM_EMAIL";
        }

        if (!isAuthorized) {
            log.warn("[ORDER-CANCEL-FORBIDDEN] Từ chối hủy đơn code='{}' (id={}) | orderUser=[id={}, username='{}'] | orderRecipient=[email='{}', phone='{}'] | caller=[principal='{}', userId={}, userEmail='{}', userPhone='{}', paramPhone='{}', paramEmail='{}']",
                    orderCode,
                    order.getId(),
                    orderUserId,
                    orderUsername,
                    orderRecipientEmail,
                    orderRecipientPhone,
                    username,
                    currentUser != null ? currentUser.getId() : null,
                    currentUser != null ? currentUser.getEmail() : null,
                    currentUser != null ? currentUser.getPhone() : null,
                    phone,
                    email
            );
            throw new ApiException(
                    ApiErrorCode.AUTH_FORBIDDEN,
                    String.format("Không có quyền hủy đơn #%s (orderUser=%s, orderEmail=%s, orderPhone=%s, caller=%s, paramPhone=%s)",
                            orderCode, orderUsername, orderRecipientEmail, orderRecipientPhone, username, phone)
            );
        }

        // Chỉ cho phép hủy khi đang PENDING hoặc CONFIRMED
        String currentStatus = order.getOrderStatus();
        if (!"PENDING".equalsIgnoreCase(currentStatus) && !"CONFIRMED".equalsIgnoreCase(currentStatus)) {
            log.warn("[ORDER-CANCEL-INVALID-STATUS] Không thể hủy đơn '{}' ở trạng thái {} (caller={})", orderCode, currentStatus, username);
            throw new ApiException(ApiErrorCode.ORDER_CANNOT_CANCEL, "status=" + currentStatus);
        }

        order.setOrderStatus("CANCELLED");
        order.setUpdatedAt(LocalDateTime.now());
        Order updated = orderRepository.save(order);

        // Tự động giải phóng hàng giữ chỗ / hoàn trả tồn kho khi hủy đơn
        releaseOrderInventory(updated, reason != null ? reason.trim() : "Khách hàng hủy đơn");

        User historyActor = currentUser != null ? currentUser : order.getUser();
        OrderStatusHistory history = new OrderStatusHistory(
                updated,
                currentStatus,
                "CANCELLED",
                "Khách hàng hủy đơn: " + (reason != null ? reason.trim() : "Không có lý do"),
                historyActor
        );
        statusHistoryRepository.save(history);

        log.info("[ORDER-CANCEL-SUCCESS] Khách hàng đã hủy đơn hàng code='{}' (id={}) | trạng thái cũ={} -> CANCELLED | xác thực qua={} | caller='{}' | lý do='{}'",
                orderCode, updated.getId(), currentStatus, authMatchReason, username != null ? username : phone, reason);

        if (notificationService != null) {
            final String paymentMethod = getPaymentMethod(updated.getId());
            final List<OrderItem> itemsSnapshot = List.copyOf(getOrderItems(updated.getId()));
            if (updated.getItems().isEmpty() && !itemsSnapshot.isEmpty()) {
                updated.getItems().addAll(itemsSnapshot);
            }
            final Order orderSnapshot = updated;
            final String oldStatusSnapshot = currentStatus;
            final String reasonSnapshot = reason;
            CompletableFuture.runAsync(() -> {
                try {
                    notificationService.sendOrderStatusUpdateEmail(orderSnapshot, oldStatusSnapshot, "CANCELLED", reasonSnapshot, paymentMethod);
                } catch (Exception e) {
                    log.warn("[EMAIL-ORDER-CANCEL] Không thể gửi email thông báo hủy đơn #{}: {}",
                            orderSnapshot.getOrderCode(), e.getMessage());
                }
            });
        }

        return updated;
    }

    /**
     * =========================================================================
     * CODE REVIEW: TỰ ĐỘNG GIẢI PHÓNG HÀNG GIỮ CHỖ (RELEASE INVENTORY) KHI HỦY ĐƠN HÀNG
     * -------------------------------------------------------------------------
     * 1. BỐI CẢNH VÀ VẤN ĐỀ:
     *    - Khi khách hàng đặt đơn (Checkout qua COD hoặc Chuyển khoản ngân hàng),
     *      hệ thống tăng số lượng giữ chỗ `quantityReserved` trong bảng `inventory`.
     *    - Nếu đơn hàng bị hủy mà không hoàn lại kho, lượng hàng này sẽ bị giam
     *      vĩnh viễn trong `quantityReserved`, khiến tồn kho khả dụng mở bán
     *      (`availableQuantity = quantityOnHand - quantityReserved`) bị mất oan.
     *
     * 2. NGUYÊN TẮC VẬN HÀNH CỦA HÀM NÀY:
     *    - Lấy toàn bộ sản phẩm và ID biến thể (variantIds) trong đơn hàng bị hủy.
     *    - Sử dụng `findAllByVariantIdsForUpdate` để khóa bi-quan (SELECT ... FOR UPDATE)
     *      các dòng kho của biến thể, ngăn chặn Race Condition khi có nhiều thao tác đồng thời.
     *    - Giảm số lượng giữ chỗ:
     *         `quantityReserved = Math.max(0, quantityReserved - orderItem.quantity)`
     *    - Ghi nhận lịch sử biến động kho (`InventoryMovement`):
     *         + movementType: "RELEASE" (Nhả hàng giữ chỗ)
     *         + referenceType: "ORDER"
     *         + referenceId: mã ID của đơn hàng
     *         + note: Lý do hủy đơn (Khách tự hủy hoặc Admin hủy)
     *    - Lưu cập nhật kho hàng loạt (batch save) để tối ưu hiệu năng DB.
     * =========================================================================
     */
    private void releaseOrderInventory(Order order, String reason) {
        if (inventoryService == null || order == null || order.getId() == null) {
            return;
        }

        List<OrderItem> items = getOrderItems(order.getId());
        if (items == null || items.isEmpty()) {
            return;
        }

        List<Long> variantIds = items.stream()
                .map(OrderItem::getVariant)
                .filter(Objects::nonNull)
                .map(ProductVariant::getId)
                .toList();

        if (variantIds.isEmpty()) {
            return;
        }

        try {
            Map<Long, Inventory> lockedInventories = inventoryService.findAllByVariantIdsForUpdate(variantIds);
            List<InventoryMovement> movements = new ArrayList<>(items.size());

            for (OrderItem item : items) {
                if (item.getVariant() == null) {
                    continue;
                }
                Inventory inv = lockedInventories.get(item.getVariant().getId());
                if (inv != null) {
                    int qty = item.getQuantity() != null && item.getQuantity() > 0 ? item.getQuantity() : 1;
                    int currentReserved = inv.getQuantityReserved() != null ? inv.getQuantityReserved() : 0;

                    // Nhả số lượng giữ chỗ: Giảm quantityReserved về mức cũ
                    inv.setQuantityReserved(Math.max(0, currentReserved - qty));

                    InventoryMovement movement = new InventoryMovement();
                    movement.setVariant(item.getVariant());
                    movement.setMovementType("RELEASE");
                    movement.setQuantity(qty);
                    movement.setReferenceType("ORDER");
                    movement.setReferenceId(order.getId());
                    movement.setNote(String.format("Hoàn trả tồn kho do hủy đơn #%s (%s)",
                            order.getOrderCode(), reason != null && !reason.isBlank() ? reason.trim() : "Hủy đơn hàng"));
                    movements.add(movement);
                }
            }

            if (!lockedInventories.isEmpty()) {
                inventoryService.saveAll(lockedInventories.values());
            }
            if (!movements.isEmpty()) {
                inventoryService.recordMovements(movements);
            }

            log.info("[ORDER-INVENTORY-RELEASE] Đã hoàn trả tồn kho thành công cho {} biến thể của đơn hàng #{}: {}",
                    movements.size(), order.getOrderCode(), reason);
        } catch (Exception e) {
            log.error("[ORDER-INVENTORY-RELEASE-FAILED] Lỗi khi giải phóng tồn kho cho đơn #{}: {}",
                    order.getOrderCode(), e.getMessage(), e);
        }
    }

    private static String normalizePhone(String raw) {
        if (raw == null) return "";
        String digits = raw.replaceAll("[^0-9]", "");
        if (digits.startsWith("84") && digits.length() == 11) {
            return "0" + digits.substring(2);
        }
        return digits;
    }

    @Transactional(readOnly = true)
    public List<OrderItem> getOrderItems(Long orderId) {
        return orderItemRepository.findByOrderId(orderId);
    }

    @Transactional(readOnly = true)
    public List<OrderStatusHistory> getStatusHistory(Long orderId) {
        return statusHistoryRepository.findByOrderIdOrderByCreatedAtDesc(orderId);
    }

    @Transactional(readOnly = true)
    public Optional<OrderDeposit> getDeposit(Long orderId) {
        return depositRepository.findByOrderId(orderId);
    }

    public OrderDeposit saveDeposit(OrderDeposit deposit) {
        return depositRepository.save(deposit);
    }
}
