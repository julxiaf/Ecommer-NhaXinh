package vn.nhaxinh.order;

import static vn.nhaxinh.admin.RbacAuditRecorder.details;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import java.util.List;
import java.util.Map;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import vn.nhaxinh.admin.RbacAuditRecorder;
import vn.nhaxinh.controller.BaseController;
import vn.nhaxinh.order.OrderDtos.*;
import vn.nhaxinh.security.ApiErrorCode;
import vn.nhaxinh.security.ApiException;
import vn.nhaxinh.user.User;
import vn.nhaxinh.user.UserRepository;

/**
 * Controller tra cứu & quản lý đơn hàng dành cho khách hàng.
 *
 * <pre>
 * GET  /api/v1/orders/my                    Lịch sử đơn hàng của tôi (yêu cầu đăng nhập)
 * GET  /api/v1/orders/{orderCode}           Tra cứu chi tiết đơn hàng (hỗ trợ khách vãng lai ?phone=...)
 * POST /api/v1/orders/{orderCode}/cancel    Khách hàng hủy đơn hàng khi đơn còn ở PENDING / CONFIRMED
 * </pre>
 */
@RestController
@RequestMapping(BaseController.API_V1 + "/orders")
public class OrderController extends BaseController {

    private final OrderService orderService;
    private final UserRepository userRepository;
    private final RbacAuditRecorder audit;

    public OrderController(
            OrderService orderService,
            UserRepository userRepository,
            RbacAuditRecorder audit
    ) {
        this.orderService = orderService;
        this.userRepository = userRepository;
        this.audit = audit;
    }

    /**
     * Lấy danh sách đơn hàng của khách hàng đang đăng nhập.
     */
    @GetMapping("/my")
    @PreAuthorize("isAuthenticated()")
    @org.springframework.transaction.annotation.Transactional(readOnly = true)
    public ResponseEntity<Page<OrderSummaryResponse>> myOrders(
            @AuthenticationPrincipal UserDetails principal,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size
    ) {
        User user = userRepository.findByUsername(principal.getUsername())
                .orElseThrow(() -> new ApiException(ApiErrorCode.AUTH_UNAUTHENTICATED));

        int safeSize = Math.min(Math.max(size, 1), 50);
        Page<Order> ordersPage = orderService.findByUserId(user.getId(), PageRequest.of(Math.max(page, 0), safeSize));
        List<Order> ordersList = ordersPage.getContent();
        if (ordersList.isEmpty()) {
            return ResponseEntity.ok(ordersPage.map(o -> OrderSummaryResponse.of(o, List.of(), List.of(), "CASH_ON_DELIVERY")));
        }

        List<Long> orderIds = ordersList.stream().map(Order::getId).toList();
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
     * Tra cứu chi tiết đơn hàng theo mã đơn (cho cả khách đăng nhập lẫn khách vãng lai kèm phone).
     */
    @GetMapping("/{orderCode}")
    public ResponseEntity<OrderDetailResponse> getOrderDetail(
            @PathVariable String orderCode,
            @RequestParam(required = false) String phone,
            @AuthenticationPrincipal UserDetails principal
    ) {
        Order order = orderService.findByOrderCode(orderCode)
                .orElseThrow(() -> new ApiException(ApiErrorCode.ORDER_NOT_FOUND, "orderCode=" + orderCode));

        // Kiểm tra quyền xem:
        // 1. Nếu khách đã đăng nhập là chủ đơn hàng -> OK
        // 2. Nếu khách vãng lai và cung cấp đúng số điện thoại đặt hàng -> OK
        // 3. Nếu là Admin hoặc Staff -> OK
        boolean isOwner = principal != null && order.getUser() != null &&
                principal.getUsername().equalsIgnoreCase(order.getUser().getUsername());
        boolean isStaffOrAdmin = principal != null && principal.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN") || a.getAuthority().equals("ROLE_STAFF"));
        boolean isMatchingPhone = phone != null && phone.trim().equals(order.getRecipientPhone());

        if (!isOwner && !isStaffOrAdmin && !isMatchingPhone) {
            throw new ApiException(ApiErrorCode.AUTH_FORBIDDEN, "Không có quyền xem thông tin đơn hàng này");
        }

        List<OrderItem> items = orderService.getOrderItems(order.getId());
        List<OrderStatusHistory> history = orderService.getStatusHistory(order.getId());
        OrderDeposit deposit = orderService.getDeposit(order.getId()).orElse(null);

        return ResponseEntity.ok(OrderDetailResponse.of(order, items, history, deposit));
    }

    /**
     * Khách hàng yêu cầu hủy đơn hàng.
     */
    @PostMapping("/{orderCode}/cancel")
    public ResponseEntity<Map<String, Object>> cancelOrder(
            @PathVariable String orderCode,
            @Valid @RequestBody CancelOrderRequest request,
            @RequestParam(required = false) String phone,
            @AuthenticationPrincipal UserDetails principal,
            HttpServletRequest httpRequest
    ) {
        String username = principal != null ? principal.getUsername() : null;
        Order cancelled = orderService.cancelOrder(orderCode, request.reason(), username, phone);

        // Ghi AuditLog
        audit.record(principal, httpRequest, "CUSTOMER_CANCEL_ORDER", "ORDER", cancelled.getId(), details(
                "orderCode", orderCode,
                "reason", request.reason(),
                "actorType", principal != null ? "REGISTERED_USER" : "GUEST"
        ));

        return ResponseEntity.ok(Map.of(
                "message", "Đã hủy đơn hàng thành công",
                "orderCode", orderCode,
                "status", cancelled.getOrderStatus()
        ));
    }
}
