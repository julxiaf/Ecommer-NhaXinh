package vn.nhaxinh.order;

import static vn.nhaxinh.admin.RbacAuditRecorder.details;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.concurrent.CompletableFuture;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import vn.nhaxinh.admin.RbacAuditRecorder;
import vn.nhaxinh.controller.BaseController;
import vn.nhaxinh.order.OrderDtos.*;
import vn.nhaxinh.user.User;
import vn.nhaxinh.user.UserRepository;

/**
 * Controller quản lý đơn hàng dành cho Admin & Staff.
 *
 * <pre>
 * GET /api/v1/admin/orders                    Tra cứu danh sách đơn hàng (lọc theo keyword, orderStatus, paymentStatus)
 * GET /api/v1/admin/orders/{id}               Xem chi tiết đơn hàng (kèm items, lịch sử trạng thái, đặt cọc)
 * PUT /api/v1/admin/orders/{id}/status        Cập nhật trạng thái đơn hàng (CONFIRMED, SHIPPING, COMPLETED, CANCELLED...)
 * PUT /api/v1/admin/orders/{id}/payment       Cập nhật trạng thái thanh toán (PAID, PARTIALLY_PAID, REFUNDED...)
 * PUT /api/v1/admin/orders/{id}/shipping      Cập nhật thông tin nhận hàng & ghi chú
 * PUT /api/v1/admin/orders/{id}/cancel        Hủy đơn hàng bởi quản trị viên
 * </pre>
 */
@RestController
@RequestMapping(BaseController.API_V1 + "/admin/orders")
// @PreAuthorize("hasAnyRole('ADMIN', 'STAFF')")
public class AdminOrderController extends BaseController {

    private static final Logger log = LoggerFactory.getLogger(AdminOrderController.class);

    private final OrderService orderService;
    private final UserRepository userRepository;
    private final RbacAuditRecorder audit;

    public AdminOrderController(
            OrderService orderService,
            UserRepository userRepository,
            RbacAuditRecorder audit
    ) {
        this.orderService = orderService;
        this.userRepository = userRepository;
        this.audit = audit;
    }

    /**
     * Danh sách tất cả đơn hàng có bộ lọc và phân trang.
     */
    @GetMapping
    public ResponseEntity<Page<OrderSummaryResponse>> list(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String orderStatus,
            @RequestParam(required = false) String paymentStatus,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        int safeSize = Math.min(Math.max(size, 1), 100);
        Page<Order> ordersPage = orderService.search(keyword, orderStatus, paymentStatus,
                PageRequest.of(Math.max(page, 0), safeSize));

        List<Order> orders = ordersPage.getContent();
        if (orders.isEmpty()) {
            return ResponseEntity.ok(ordersPage.map(o -> OrderSummaryResponse.of(o, List.of(), List.of(), "CASH_ON_DELIVERY")));
        }

        List<Long> orderIds = orders.stream().map(Order::getId).toList();

        // Batch load phương thức thanh toán, order items và status history (Giải quyết dứt điểm N+1 query)
        Map<Long, String> paymentMethodMap = orderService.getPaymentMethods(orderIds);
        Map<Long, List<OrderItem>> itemsMap = orderService.getOrderItemsBatch(orderIds);
        Map<Long, List<OrderStatusHistory>> historyMap = orderService.getStatusHistoryBatch(orderIds);

        return ResponseEntity.ok(ordersPage.map(o -> {
            String pm = paymentMethodMap.getOrDefault(o.getId(), "CASH_ON_DELIVERY");
            List<OrderItem> items = itemsMap.getOrDefault(o.getId(), List.of());
            List<OrderStatusHistory> history = historyMap.getOrDefault(o.getId(), List.of());
            return OrderSummaryResponse.of(o, items, history, pm);
        }));
    }

    private OrderDetailResponse buildDetailResponse(Order order, String knownPaymentMethod) {
        Long id = order.getId();
        List<OrderItem> items = orderService.getOrderItems(id);
        List<OrderStatusHistory> history = orderService.getStatusHistory(id);
        OrderDeposit deposit = orderService.getDeposit(id).orElse(null);
        String paymentMethod = (knownPaymentMethod != null && !knownPaymentMethod.isBlank())
                ? knownPaymentMethod
                : orderService.getPaymentMethod(id);
        return OrderDetailResponse.of(order, items, history, deposit, paymentMethod);
    }

    /**
     * Xem chi tiết một đơn hàng.
     */
    @GetMapping("/{id}")
    public ResponseEntity<OrderDetailResponse> getDetail(@PathVariable Long id) {
        Order order = orderService.getOrder(id);
        return ResponseEntity.ok(buildDetailResponse(order, null));
    }

    /**
     * Tạo mới đơn hàng / hóa đơn từ cổng Quản trị (Admin) và tự động gửi email xác nhận cho khách.
     */
    @PostMapping
    public ResponseEntity<OrderDetailResponse> createOrder(
            @Valid @RequestBody CreateAdminOrderRequest request,
            @AuthenticationPrincipal UserDetails principal
    ) {
        User adminUser = principal != null
                ? userRepository.findByUsername(principal.getUsername()).orElse(null)
                : null;
        Order created = orderService.createAdminOrder(request, adminUser);
        return ResponseEntity.ok(buildDetailResponse(created, request.paymentMethod()));
    }

    /**
     * Cập nhật trạng thái đơn hàng (kèm ghi log audit & order history).
     */
    @PutMapping("/{id}/status")
    public ResponseEntity<OrderDetailResponse> updateStatus(
            @PathVariable Long id,
            @Valid @RequestBody UpdateOrderStatusRequest request,
            @AuthenticationPrincipal UserDetails principal,
            HttpServletRequest httpRequest
    ) {
        User adminUser = principal != null
                ? userRepository.findByUsername(principal.getUsername()).orElse(null)
                : null;

        Order updated = orderService.updateStatus(id, request.status(), request.note(), adminUser);
        List<OrderStatusHistory> history = orderService.getStatusHistory(id);
        String oldStatus = history.stream()
                .reduce((first, second) -> second)
                .map(OrderStatusHistory::getOldStatus)
                .orElse(updated.getOrderStatus());

        String actor = RbacAuditRecorder.actorName(principal);
        String ip = RbacAuditRecorder.clientIp(httpRequest);

        if ("CANCELLED".equalsIgnoreCase(updated.getOrderStatus())) {
            log.warn("[ADMIN-ORDER-CANCEL] Admin='{}' (ip={}) đã HỦY đơn hàng id={} code='{}' | Trạng thái cũ: {} | Lý do: '{}'",
                    actor, ip, id, updated.getOrderCode(), oldStatus, request.note());
        } else {
            log.info("[ADMIN-ORDER-STATUS] Admin='{}' (ip={}) cập nhật trạng thái đơn hàng id={} code='{}': {} -> {} | Ghi chú: '{}'",
                    actor, ip, id, updated.getOrderCode(), oldStatus, updated.getOrderStatus(), request.note());
        }

        // Ghi AuditLog bất đồng bộ để phản hồi tức thì
        final String orderCode = updated.getOrderCode();
        final String newStatus = updated.getOrderStatus();
        final var totalAmount = updated.getTotalAmount();
        CompletableFuture.runAsync(() -> audit.recordResolved(adminUser, actor, ip, "ORDER_UPDATE_STATUS", "ORDER", id, details(
                "orderCode", orderCode,
                "oldStatus", oldStatus,
                "newStatus", newStatus,
                "note", request.note(),
                "totalAmount", totalAmount
        )));

        List<OrderItem> items = orderService.getOrderItems(id);
        OrderDeposit deposit = orderService.getDeposit(id).orElse(null);
        String paymentMethod = orderService.getPaymentMethod(id);

        return ResponseEntity.ok(OrderDetailResponse.of(updated, items, history, deposit, paymentMethod));
    }

    /**
     * Cập nhật trạng thái và phương thức thanh toán của đơn hàng.
     */
    @PutMapping("/{id}/payment")
    public ResponseEntity<OrderDetailResponse> updatePaymentStatus(
            @PathVariable Long id,
            @Valid @RequestBody UpdateOrderPaymentStatusRequest request,
            @AuthenticationPrincipal UserDetails principal,
            HttpServletRequest httpRequest
    ) {
        User adminUser = principal != null
                ? userRepository.findByUsername(principal.getUsername()).orElse(null)
                : null;

        Order updated = orderService.updatePayment(id, request.paymentStatus(), request.paymentMethod(), request.note(), adminUser);
        String newMethod = (request.paymentMethod() != null && !request.paymentMethod().isBlank())
                ? request.paymentMethod().trim().toUpperCase()
                : orderService.getPaymentMethod(id);
        String actor = RbacAuditRecorder.actorName(principal);
        String ip = RbacAuditRecorder.clientIp(httpRequest);

        log.info("[ADMIN-ORDER-PAYMENT] Admin='{}' (ip={}) cập nhật thanh toán đơn hàng id={} code='{}': status -> {}, method -> {} | Ghi chú: '{}'",
                actor, ip, id, updated.getOrderCode(), updated.getPaymentStatus(), newMethod, request.note());

        final String orderCode = updated.getOrderCode();
        final String newPaymentStatus = updated.getPaymentStatus();
        final var totalAmount = updated.getTotalAmount();
        CompletableFuture.runAsync(() -> audit.recordResolved(adminUser, actor, ip, "ORDER_UPDATE_PAYMENT", "ORDER", id, details(
                "orderCode", orderCode,
                "newPaymentStatus", newPaymentStatus,
                "newPaymentMethod", newMethod,
                "note", request.note(),
                "totalAmount", totalAmount
        )));

        return ResponseEntity.ok(buildDetailResponse(updated, newMethod));
    }

    /**
     * Cập nhật thông tin giao hàng & ghi chú đơn hàng.
     */
    @PutMapping("/{id}/shipping")
    public ResponseEntity<OrderDetailResponse> updateShipping(
            @PathVariable Long id,
            @Valid @RequestBody UpdateShippingInfoRequest request,
            @AuthenticationPrincipal UserDetails principal,
            HttpServletRequest httpRequest
    ) {
        User adminUser = principal != null
                ? userRepository.findByUsername(principal.getUsername()).orElse(null)
                : null;

        Order beforeOrder = orderService.getOrder(id);
        Map<String, Object> changes = new LinkedHashMap<>();
        if (!Objects.equals(beforeOrder.getRecipientName(), request.recipientName().trim())) {
            changes.put("recipientName", Map.of("old", String.valueOf(beforeOrder.getRecipientName()), "new", request.recipientName().trim()));
        }
        if (!Objects.equals(beforeOrder.getRecipientPhone(), request.recipientPhone().trim())) {
            changes.put("recipientPhone", Map.of("old", String.valueOf(beforeOrder.getRecipientPhone()), "new", request.recipientPhone().trim()));
        }
        if (!Objects.equals(beforeOrder.getShippingAddress(), request.shippingAddress().trim())) {
            changes.put("shippingAddress", Map.of("old", String.valueOf(beforeOrder.getShippingAddress()), "new", request.shippingAddress().trim()));
        }
        if (request.customerNote() != null && !Objects.equals(beforeOrder.getCustomerNote(), request.customerNote().trim())) {
            changes.put("customerNote", Map.of("old", String.valueOf(beforeOrder.getCustomerNote()), "new", request.customerNote().trim()));
        }

        Order updated = orderService.updateShippingInfo(
                id,
                request.recipientName(),
                request.recipientPhone(),
                request.shippingAddress(),
                request.customerNote()
        );

        String actor = RbacAuditRecorder.actorName(principal);
        String ip = RbacAuditRecorder.clientIp(httpRequest);

        log.info("[ADMIN-ORDER-SHIPPING] Admin='{}' (ip={}) cập nhật thông tin giao hàng đơn hàng id={} code='{}' | Chi tiết thay đổi: {}",
                actor, ip, id, updated.getOrderCode(), changes);

        final String orderCode = updated.getOrderCode();
        CompletableFuture.runAsync(() -> audit.recordResolved(adminUser, actor, ip, "ORDER_UPDATE_SHIPPING", "ORDER", id, details(
                "orderCode", orderCode,
                "recipientName", request.recipientName(),
                "recipientPhone", request.recipientPhone(),
                "shippingAddress", request.shippingAddress(),
                "customerNote", request.customerNote(),
                "changes", changes
        )));

        return ResponseEntity.ok(buildDetailResponse(updated, null));
    }

    /**
     * Hủy đơn hàng bởi Admin/Staff.
     */
    @PutMapping("/{id}/cancel")
    public ResponseEntity<OrderDetailResponse> cancelOrder(
            @PathVariable Long id,
            @RequestBody(required = false) Map<String, String> body,
            @AuthenticationPrincipal UserDetails principal,
            HttpServletRequest httpRequest
    ) {
        String reason = body != null && body.containsKey("reason") && !body.get("reason").isBlank()
                ? body.get("reason").trim()
                : "Quản trị viên hủy đơn hàng";

        User adminUser = principal != null
                ? userRepository.findByUsername(principal.getUsername()).orElse(null)
                : null;

        Order updated = orderService.updateStatus(id, "CANCELLED", reason, adminUser);
        String actor = RbacAuditRecorder.actorName(principal);
        String ip = RbacAuditRecorder.clientIp(httpRequest);

        log.warn("[ADMIN-ORDER-CANCEL] Admin='{}' (ip={}) đã HỦY đơn hàng id={} code='{}' | Lý do: '{}'",
                actor, ip, id, updated.getOrderCode(), reason);

        final String orderCode = updated.getOrderCode();
        final var totalAmount = updated.getTotalAmount();
        CompletableFuture.runAsync(() -> audit.recordResolved(adminUser, actor, ip, "ADMIN_CANCEL_ORDER", "ORDER", id, details(
                "orderCode", orderCode,
                "newStatus", "CANCELLED",
                "reason", reason,
                "totalAmount", totalAmount
        )));

        return ResponseEntity.ok(buildDetailResponse(updated, null));
    }
}
