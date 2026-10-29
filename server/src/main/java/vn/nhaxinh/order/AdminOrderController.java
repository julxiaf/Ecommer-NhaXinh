package vn.nhaxinh.order;

import static vn.nhaxinh.admin.RbacAuditRecorder.details;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
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

    /**
     * Xem chi tiết một đơn hàng.
     */
    @GetMapping("/{id}")
    public ResponseEntity<OrderDetailResponse> getDetail(@PathVariable Long id) {
        Order order = orderService.getOrder(id);
        List<OrderItem> items = orderService.getOrderItems(id);
        List<OrderStatusHistory> history = orderService.getStatusHistory(id);
        OrderDeposit deposit = orderService.getDeposit(id).orElse(null);
        String paymentMethod = orderService.getPaymentMethod(id);

        return ResponseEntity.ok(OrderDetailResponse.of(order, items, history, deposit, paymentMethod));
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

        Order oldOrder = orderService.getOrder(id);
        String oldStatus = oldOrder.getOrderStatus();

        Order updated = orderService.updateStatus(id, request.status(), request.note(), adminUser);
        String actor = RbacAuditRecorder.actorName(principal);
        String ip = RbacAuditRecorder.clientIp(httpRequest);

        if ("CANCELLED".equalsIgnoreCase(updated.getOrderStatus())) {
            log.warn("[ADMIN-ORDER-CANCEL] Admin='{}' (ip={}) đã HỦY đơn hàng id={} code='{}' | Trạng thái cũ: {} | Lý do: '{}'",
                    actor, ip, id, updated.getOrderCode(), oldStatus, request.note());
        } else {
            log.info("[ADMIN-ORDER-STATUS] Admin='{}' (ip={}) cập nhật trạng thái đơn hàng id={} code='{}': {} -> {} | Ghi chú: '{}'",
                    actor, ip, id, updated.getOrderCode(), oldStatus, updated.getOrderStatus(), request.note());
        }

        // Ghi AuditLog
        audit.record(principal, httpRequest, "ORDER_UPDATE_STATUS", "ORDER", id, details(
                "orderCode", updated.getOrderCode(),
                "oldStatus", oldStatus,
                "newStatus", updated.getOrderStatus(),
                "note", request.note(),
                "totalAmount", updated.getTotalAmount()
        ));

        List<OrderItem> items = orderService.getOrderItems(id);
        List<OrderStatusHistory> history = orderService.getStatusHistory(id);
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

        Order oldOrder = orderService.getOrder(id);
        String oldPayment = oldOrder.getPaymentStatus();
        String oldMethod = orderService.getPaymentMethod(id);

        Order updated = orderService.updatePayment(id, request.paymentStatus(), request.paymentMethod(), request.note(), adminUser);
        String newMethod = orderService.getPaymentMethod(id);
        String actor = RbacAuditRecorder.actorName(principal);
        String ip = RbacAuditRecorder.clientIp(httpRequest);

        log.info("[ADMIN-ORDER-PAYMENT] Admin='{}' (ip={}) cập nhật thanh toán đơn hàng id={} code='{}': status [{} -> {}], method [{} -> {}] | Ghi chú: '{}'",
                actor, ip, id, updated.getOrderCode(), oldPayment, updated.getPaymentStatus(), oldMethod, newMethod, request.note());

        // Ghi AuditLog
        audit.record(principal, httpRequest, "ORDER_UPDATE_PAYMENT", "ORDER", id, details(
                "orderCode", updated.getOrderCode(),
                "oldPaymentStatus", oldPayment,
                "newPaymentStatus", updated.getPaymentStatus(),
                "oldPaymentMethod", oldMethod,
                "newPaymentMethod", newMethod,
                "note", request.note(),
                "totalAmount", updated.getTotalAmount()
        ));

        List<OrderItem> items = orderService.getOrderItems(id);
        List<OrderStatusHistory> history = orderService.getStatusHistory(id);
        OrderDeposit deposit = orderService.getDeposit(id).orElse(null);

        return ResponseEntity.ok(OrderDetailResponse.of(updated, items, history, deposit, newMethod));
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
        Order oldOrder = orderService.getOrder(id);

        Map<String, Object> changes = new LinkedHashMap<>();
        if (!Objects.equals(oldOrder.getRecipientName(), request.recipientName().trim())) {
            changes.put("recipientName", Map.of("old", oldOrder.getRecipientName(), "new", request.recipientName().trim()));
        }
        if (!Objects.equals(oldOrder.getRecipientPhone(), request.recipientPhone().trim())) {
            changes.put("recipientPhone", Map.of("old", oldOrder.getRecipientPhone(), "new", request.recipientPhone().trim()));
        }
        if (!Objects.equals(oldOrder.getShippingAddress(), request.shippingAddress().trim())) {
            changes.put("shippingAddress", Map.of("old", oldOrder.getShippingAddress(), "new", request.shippingAddress().trim()));
        }
        if (request.customerNote() != null && !Objects.equals(oldOrder.getCustomerNote(), request.customerNote().trim())) {
            changes.put("customerNote", Map.of("old", String.valueOf(oldOrder.getCustomerNote()), "new", request.customerNote().trim()));
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

        // Ghi AuditLog
        audit.record(principal, httpRequest, "ORDER_UPDATE_SHIPPING", "ORDER", id, details(
                "orderCode", updated.getOrderCode(),
                "recipientName", request.recipientName(),
                "recipientPhone", request.recipientPhone(),
                "shippingAddress", request.shippingAddress(),
                "customerNote", request.customerNote(),
                "changes", changes
        ));

        List<OrderItem> items = orderService.getOrderItems(id);
        List<OrderStatusHistory> history = orderService.getStatusHistory(id);
        OrderDeposit deposit = orderService.getDeposit(id).orElse(null);
        String paymentMethod = orderService.getPaymentMethod(id);

        return ResponseEntity.ok(OrderDetailResponse.of(updated, items, history, deposit, paymentMethod));
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

        Order oldOrder = orderService.getOrder(id);
        String oldStatus = oldOrder.getOrderStatus();

        Order updated = orderService.updateStatus(id, "CANCELLED", reason, adminUser);
        String actor = RbacAuditRecorder.actorName(principal);
        String ip = RbacAuditRecorder.clientIp(httpRequest);

        log.warn("[ADMIN-ORDER-CANCEL] Admin='{}' (ip={}) đã HỦY đơn hàng id={} code='{}' (trạng thái cũ: {}) | Lý do: '{}'",
                actor, ip, id, updated.getOrderCode(), oldStatus, reason);

        audit.record(principal, httpRequest, "ADMIN_CANCEL_ORDER", "ORDER", id, details(
                "orderCode", updated.getOrderCode(),
                "oldStatus", oldStatus,
                "newStatus", "CANCELLED",
                "reason", reason,
                "totalAmount", updated.getTotalAmount()
        ));

        List<OrderItem> items = orderService.getOrderItems(id);
        List<OrderStatusHistory> history = orderService.getStatusHistory(id);
        OrderDeposit deposit = orderService.getDeposit(id).orElse(null);
        String paymentMethod = orderService.getPaymentMethod(id);

        return ResponseEntity.ok(OrderDetailResponse.of(updated, items, history, deposit, paymentMethod));
    }
}
