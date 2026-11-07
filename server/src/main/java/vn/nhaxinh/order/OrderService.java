package vn.nhaxinh.order;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.concurrent.CompletableFuture;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.nhaxinh.notification.NotificationService;
import vn.nhaxinh.payment.*;

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
            NotificationService notificationService
    ) {
        this.orderRepository = orderRepository;
        this.orderItemRepository = orderItemRepository;
        this.statusHistoryRepository = statusHistoryRepository;
        this.depositRepository = depositRepository;
        this.paymentRepository = paymentRepository;
        this.notificationService = notificationService;
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

    public Order updateStatus(Long orderId, String newStatus, String note, User changedBy) {
        Order order = getOrder(orderId);
        String oldStatus = order.getOrderStatus();
        String normalizedNewStatus = newStatus.trim().toUpperCase();

        // 1. Nếu đơn hàng đã giao thành công (COMPLETED / DELIVERED), tuyệt đối không cho phép cập nhật nữa
        if ("COMPLETED".equalsIgnoreCase(oldStatus) || "DELIVERED".equalsIgnoreCase(oldStatus)) {
            log.warn("[ORDER] Từ chối cập nhật đơn #{}: Đơn hàng đã giao thành công (COMPLETED)", order.getOrderCode());
            throw new ApiException(ApiErrorCode.VALIDATION_FAILED, "Đơn hàng đã giao thành công, chỉ có thể xem chi tiết và không thể cập nhật.");
        }

        // 2. Nếu đơn hàng đã bị hủy, không thể thay đổi trạng thái
        if ("CANCELLED".equalsIgnoreCase(oldStatus)) {
            log.warn("[ORDER] Từ chối cập nhật đơn #{}: Đơn hàng đã bị hủy (CANCELLED)", order.getOrderCode());
            throw new ApiException(ApiErrorCode.VALIDATION_FAILED, "Đơn hàng đã bị hủy, không thể thay đổi trạng thái.");
        }

        // 3. Nếu đơn hàng đã giao đi (SHIPPING), không thể hủy hoặc chuyển lùi trạng thái
        if ("SHIPPING".equalsIgnoreCase(oldStatus)) {
            if ("CANCELLED".equalsIgnoreCase(normalizedNewStatus)) {
                log.warn("[ORDER] Không thể hủy đơn #{}: Đơn hàng đã được bàn giao vận chuyển (SHIPPING)", order.getOrderCode());
                throw new ApiException(ApiErrorCode.VALIDATION_FAILED, "Đơn hàng đã được bàn giao vận chuyển và đang giao đi, không thể hủy đơn hàng.");
            }
            if ("PENDING".equalsIgnoreCase(normalizedNewStatus) || "CONFIRMED".equalsIgnoreCase(normalizedNewStatus) || "PROCESSING".equalsIgnoreCase(normalizedNewStatus)) {
                log.warn("[ORDER] Không thể chuyển lùi trạng thái đơn #{}: từ SHIPPING về {}", order.getOrderCode(), normalizedNewStatus);
                throw new ApiException(ApiErrorCode.VALIDATION_FAILED, "Đơn hàng đã được bàn giao vận chuyển, không thể chuyển lùi trạng thái.");
            }
        }

        order.setOrderStatus(normalizedNewStatus);
        order.setUpdatedAt(LocalDateTime.now());
        Order updated = orderRepository.save(order);

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
        if (orderIds == null || orderIds.isEmpty()) {
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

        // Đơn hàng đã giao thành công (COMPLETED) hoặc đã hủy (CANCELLED) không thể sửa thông tin thanh toán
        if ("COMPLETED".equalsIgnoreCase(currentOrderStatus) || "DELIVERED".equalsIgnoreCase(currentOrderStatus)) {
            log.warn("[ORDER] Từ chối cập nhật thanh toán đơn #{}: Đơn hàng đã giao thành công", order.getOrderCode());
            throw new ApiException(ApiErrorCode.VALIDATION_FAILED, "Đơn hàng đã giao thành công, không thể thay đổi thông tin thanh toán.");
        }
        if ("CANCELLED".equalsIgnoreCase(currentOrderStatus)) {
            log.warn("[ORDER] Từ chối cập nhật thanh toán đơn #{}: Đơn hàng đã bị hủy", order.getOrderCode());
            throw new ApiException(ApiErrorCode.VALIDATION_FAILED, "Đơn hàng đã bị hủy, không thể thay đổi thông tin thanh toán.");
        }

        String oldPayment = order.getPaymentStatus();
        String normalizedPayment = newPaymentStatus != null ? newPaymentStatus.trim().toUpperCase() : oldPayment;

        order.setPaymentStatus(normalizedPayment);
        order.setUpdatedAt(LocalDateTime.now());
        Order updated = orderRepository.save(order);

        String oldMethod = getPaymentMethod(orderId);
        String normalizedMethod = (newPaymentMethod != null && !newPaymentMethod.isBlank())
                ? newPaymentMethod.trim().toUpperCase()
                : oldMethod;

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
