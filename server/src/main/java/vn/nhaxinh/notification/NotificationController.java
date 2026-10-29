package vn.nhaxinh.notification;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import vn.nhaxinh.controller.BaseController;
import vn.nhaxinh.order.Order;
import vn.nhaxinh.order.OrderItem;
import vn.nhaxinh.order.OrderRepository;
import vn.nhaxinh.order.OrderService;
import vn.nhaxinh.security.ApiErrorCode;
import vn.nhaxinh.security.ApiException;

@RestController
@RequestMapping(BaseController.API_V1 + "/notifications")
public class NotificationController extends BaseController {

    private final NotificationService notificationService;
    private final OrderService orderService;
    private final OrderRepository orderRepository;

    public NotificationController(
            NotificationService notificationService,
            OrderService orderService,
            OrderRepository orderRepository
    ) {
        this.notificationService = notificationService;
        this.orderService = orderService;
        this.orderRepository = orderRepository;
    }

    /**
     * Lấy danh sách lịch sử gửi email thông báo theo mã đơn hàng.
     */
    @GetMapping("/emails/order/{orderCode}")
    public ResponseEntity<List<EmailLogResponse>> getOrderEmailLogs(@PathVariable String orderCode) {
        Order order = orderService.findByOrderCode(orderCode.trim())
                .orElseThrow(() -> new ApiException(ApiErrorCode.ORDER_NOT_FOUND, "Không tìm thấy đơn hàng #" + orderCode));
        List<EmailLogResponse> logs = notificationService.getLogsByOrder(order.getId())
                .stream()
                .map(EmailLogResponse::from)
                .toList();
        return ResponseEntity.ok(logs);
    }

    /**
     * Gửi hoặc gửi lại email thông báo xác nhận đơn hàng tới khách hàng.
     */
    @PostMapping("/emails/order/{orderCode}/resend")
    public ResponseEntity<Map<String, Object>> resendOrderEmail(
            @PathVariable String orderCode,
            @RequestBody(required = false) ResendOrderEmailRequest request
    ) {
        Order order = orderService.findByOrderCode(orderCode.trim())
                .orElseThrow(() -> new ApiException(ApiErrorCode.ORDER_NOT_FOUND, "Không tìm thấy đơn hàng #" + orderCode));

        String targetEmail = request != null && request.email() != null && !request.email().isBlank()
                ? request.email().trim()
                : null;

        if (targetEmail != null && (order.getRecipientEmail() == null || order.getRecipientEmail().isBlank())) {
            order.setRecipientEmail(targetEmail);
            orderRepository.save(order);
        }

        String resolvedEmail = notificationService.resolveRecipientEmail(order, targetEmail);
        if (resolvedEmail == null) {
            throw new ApiException(ApiErrorCode.VALIDATION_FAILED,
                    "Đơn hàng chưa có địa chỉ Email nhận thông báo. Vui lòng nhập địa chỉ Email hợp lệ.");
        }

        List<OrderItem> items = orderService.getOrderItems(order.getId());
        String paymentMethod = orderService.getPaymentMethod(order.getId());
        EmailLog emailLog = notificationService.sendOrderConfirmationEmail(order, items, paymentMethod, resolvedEmail);

        if (emailLog == null) {
            throw new ApiException(ApiErrorCode.VALIDATION_FAILED, "Không thể gửi thông báo email cho đơn hàng này.");
        }

        return ResponseEntity.ok(Map.of(
                "success", !"FAILED".equalsIgnoreCase(emailLog.getSendStatus()),
                "orderCode", order.getOrderCode(),
                "recipientEmail", emailLog.getRecipientEmail(),
                "sendStatus", emailLog.getSendStatus(),
                "subject", emailLog.getSubject(),
                "sentAt", emailLog.getSentAt() != null ? emailLog.getSentAt().toString() : LocalDateTime.now().toString(),
                "smtpConfigured", notificationService.isSmtpConfigured(),
                "message", "Đã gửi thông báo đơn hàng #" + order.getOrderCode() + " tới email " + emailLog.getRecipientEmail()
        ));
    }

    /**
     * Danh sách nhật ký gửi email có lọc theo trạng thái và phân trang (dành cho Admin).
     */
    @GetMapping("/emails")
    public ResponseEntity<Page<EmailLogResponse>> listEmailLogs(
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        int safeSize = Math.min(Math.max(size, 1), 100);
        Page<EmailLog> logs = notificationService.getEmailLogs(status, PageRequest.of(Math.max(page, 0), safeSize));
        return ResponseEntity.ok(logs.map(EmailLogResponse::from));
    }

    public record ResendOrderEmailRequest(String email) {
    }

    public record EmailLogResponse(
            Long id,
            Long orderId,
            String orderCode,
            String recipientEmail,
            String emailType,
            String subject,
            String sendStatus,
            Integer attemptCount,
            String providerMessageId,
            String errorMessage,
            LocalDateTime sentAt,
            LocalDateTime createdAt
    ) {
        public static EmailLogResponse from(EmailLog log) {
            return new EmailLogResponse(
                    log.getId(),
                    log.getOrder() != null ? log.getOrder().getId() : null,
                    log.getOrder() != null ? log.getOrder().getOrderCode() : null,
                    log.getRecipientEmail(),
                    log.getEmailType(),
                    log.getSubject(),
                    log.getSendStatus(),
                    log.getAttemptCount(),
                    log.getProviderMessageId(),
                    log.getErrorMessage(),
                    log.getSentAt(),
                    log.getCreatedAt()
            );
        }
    }
}

