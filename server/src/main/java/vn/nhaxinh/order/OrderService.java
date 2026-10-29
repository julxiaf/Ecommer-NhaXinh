package vn.nhaxinh.order;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
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
    public Page<Order> findByStatus(String status, Pageable pageable) {
        return orderRepository.findByOrderStatusOrderByCreatedAtDesc(status, pageable);
    }

    public Order createOrder(Order order) {
        Order saved = orderRepository.save(order);
        OrderStatusHistory history = new OrderStatusHistory(
                saved,
                null,
                saved.getOrderStatus(),
                "Đơn hàng được khởi tạo",
                null
        );
        statusHistoryRepository.save(history);
        log.info("[ORDER] Đã khởi tạo đơn hàng id={} code='{}' | tổng tiền={}",
                saved.getId(), saved.getOrderCode(), saved.getTotalAmount());
        return saved;
    }

    public Order updateStatus(Long orderId, String newStatus, String note, User changedBy) {
        Order order = getOrder(orderId);
        String oldStatus = order.getOrderStatus();
        String normalizedNewStatus = newStatus.trim().toUpperCase();

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

        log.info("[ORDER] Đã cập nhật trạng thái đơn hàng id={} code='{}': {} -> {} | người sửa={}",
                orderId, order.getOrderCode(), oldStatus, normalizedNewStatus,
                changedBy != null ? changedBy.getUsername() : "SYSTEM");

        if (notificationService != null && !normalizedNewStatus.equalsIgnoreCase(oldStatus)) {
            final Order orderForEmail = updated;
            final String fOldStatus = oldStatus;
            final String fNewStatus = normalizedNewStatus;
            final String fNote = note;
            CompletableFuture.runAsync(() -> {
                try {
                    notificationService.sendOrderStatusUpdateEmail(orderForEmail, fOldStatus, fNewStatus, fNote);
                } catch (Exception e) {
                    log.warn("[EMAIL-ASYNC] Không thể gửi email cập nhật trạng thái đơn #{}: {}",
                            orderForEmail.getOrderCode(), e.getMessage());
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

        log.info("[ORDER] Đã cập nhật thanh toán đơn hàng id={} code='{}': status [{} -> {}], method [{} -> {}] | người sửa={}",
                orderId, order.getOrderCode(), oldPayment, normalizedPayment, oldMethod, normalizedMethod,
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
        order.setRecipientName(recipientName.trim());
        order.setRecipientPhone(recipientPhone.trim());
        order.setShippingAddress(shippingAddress.trim());
        if (customerNote != null) {
            order.setCustomerNote(customerNote.trim());
        }
        order.setUpdatedAt(LocalDateTime.now());
        Order updated = orderRepository.save(order);

        log.info("[ORDER] Đã cập nhật thông tin giao hàng đơn id={} code='{}'", orderId, order.getOrderCode());
        return updated;
    }

    public Order cancelOrder(String orderCode, String reason, String username, String phone) {
        Order order = orderRepository.findByOrderCode(orderCode)
                .orElseThrow(() -> new ApiException(ApiErrorCode.ORDER_NOT_FOUND, "orderCode=" + orderCode));

        // Kiểm tra quyền hủy: nếu có user thì phải là chính chủ, nếu khách vãng lai thì cần đúng SĐT
        if (order.getUser() != null) {
            if (username == null || !username.equalsIgnoreCase(order.getUser().getUsername())) {
                throw new ApiException(ApiErrorCode.AUTH_FORBIDDEN, "Không phải chủ sở hữu đơn hàng");
            }
        } else {
            if (phone == null || !phone.trim().equals(order.getRecipientPhone())) {
                throw new ApiException(ApiErrorCode.AUTH_FORBIDDEN, "Số điện thoại không khớp với đơn hàng");
            }
        }

        // Chỉ cho phép hủy khi đang PENDING hoặc CONFIRMED
        String currentStatus = order.getOrderStatus();
        if (!"PENDING".equalsIgnoreCase(currentStatus) && !"CONFIRMED".equalsIgnoreCase(currentStatus)) {
            log.warn("[ORDER] Không thể hủy đơn '{}' ở trạng thái {}", orderCode, currentStatus);
            throw new ApiException(ApiErrorCode.ORDER_CANNOT_CANCEL, "status=" + currentStatus);
        }

        order.setOrderStatus("CANCELLED");
        order.setUpdatedAt(LocalDateTime.now());
        Order updated = orderRepository.save(order);

        OrderStatusHistory history = new OrderStatusHistory(
                updated,
                currentStatus,
                "CANCELLED",
                "Khách hàng hủy đơn: " + (reason != null ? reason.trim() : "Không có lý do"),
                order.getUser()
        );
        statusHistoryRepository.save(history);

        log.info("[ORDER] Khách hàng đã hủy đơn hàng code='{}' | lý do={}", orderCode, reason);

        if (notificationService != null) {
            final Order orderForEmail = updated;
            final String fCurrentStatus = currentStatus;
            final String fReason = reason;
            CompletableFuture.runAsync(() -> {
                try {
                    notificationService.sendOrderStatusUpdateEmail(orderForEmail, fCurrentStatus, "CANCELLED", fReason);
                } catch (Exception e) {
                    log.warn("[EMAIL-ASYNC] Không thể gửi email thông báo hủy đơn #{}: {}",
                            orderForEmail.getOrderCode(), e.getMessage());
                }
            });
        }

        return updated;
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
