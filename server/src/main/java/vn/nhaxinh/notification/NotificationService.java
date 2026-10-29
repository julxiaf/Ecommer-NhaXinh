package vn.nhaxinh.notification;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.io.OutputStreamWriter;
import java.io.PrintWriter;
import java.math.BigDecimal;
import java.net.InetSocketAddress;
import java.net.Socket;
import java.nio.charset.StandardCharsets;
import java.text.NumberFormat;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Base64;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import javax.net.ssl.SSLSocket;
import javax.net.ssl.SSLSocketFactory;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.nhaxinh.order.Order;
import vn.nhaxinh.order.OrderItem;

@Service
@Transactional
public class NotificationService {

    private static final Logger log = LoggerFactory.getLogger(NotificationService.class);
    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");
    private static final Locale VI_LOCALE = new Locale("vi", "VN");

    private final NotificationTemplateRepository templateRepository;
    private final EmailLogRepository emailLogRepository;

    private final String mailHost;
    private final int mailPort;
    private final String mailUsername;
    private final String mailPassword;
    private final boolean sslEnabled;
    private final int timeoutMs;

    public NotificationService(
            NotificationTemplateRepository templateRepository,
            EmailLogRepository emailLogRepository
    ) {
        this(
                templateRepository,
                emailLogRepository,
                "smtp.gmail.com",
                465,
                "",
                "",
                true,
                5000
        );
    }

    @Autowired
    public NotificationService(
            NotificationTemplateRepository templateRepository,
            EmailLogRepository emailLogRepository,
            @Value("${spring.mail.host:smtp.gmail.com}") String mailHost,
            @Value("${spring.mail.port:465}") int mailPort,
            @Value("${spring.mail.username:}") String mailUsername,
            @Value("${spring.mail.password:}") String mailPassword,
            @Value("${spring.mail.properties.mail.smtp.ssl.enable:true}") boolean sslEnabled,
            @Value("${spring.mail.properties.mail.smtp.timeout:5000}") int timeoutMs
    ) {
        this.templateRepository = templateRepository;
        this.emailLogRepository = emailLogRepository;
        this.mailHost = mailHost;
        this.mailPort = mailPort;
        this.mailUsername = mailUsername != null ? mailUsername.trim() : "";
        this.mailPassword = mailPassword != null ? mailPassword.trim() : "";
        this.sslEnabled = sslEnabled;
        this.timeoutMs = timeoutMs > 0 ? timeoutMs : 5000;
    }

    @Transactional(readOnly = true)
    public Optional<NotificationTemplate> findTemplateByCode(String code) {
        return templateRepository.findByTemplateCode(code);
    }

    public NotificationTemplate saveTemplate(NotificationTemplate template) {
        return templateRepository.save(template);
    }

    @Transactional(readOnly = true)
    public List<EmailLog> getLogsByOrder(Long orderId) {
        return emailLogRepository.findByOrderIdOrderByCreatedAtDesc(orderId);
    }

    @Transactional(readOnly = true)
    public Page<EmailLog> getEmailLogs(String status, Pageable pageable) {
        if (status != null && !status.isBlank() && !"ALL".equalsIgnoreCase(status)) {
            return emailLogRepository.findBySendStatusOrderByCreatedAtDesc(status.trim().toUpperCase(), pageable);
        }
        return emailLogRepository.findAllByOrderByCreatedAtDesc(pageable);
    }

    public EmailLog recordEmailLog(EmailLog emailLog) {
        return emailLogRepository.save(emailLog);
    }

    public void markSent(Long logId, String providerMessageId) {
        emailLogRepository.findById(logId).ifPresent(entry -> {
            entry.setSendStatus("SENT");
            entry.setProviderMessageId(providerMessageId);
            entry.setSentAt(LocalDateTime.now());
            emailLogRepository.save(entry);
        });
    }

    public void markFailed(Long logId, String errorMessage) {
        emailLogRepository.findById(logId).ifPresent(entry -> {
            entry.setSendStatus("FAILED");
            entry.setErrorMessage(truncate(errorMessage, 1450));
            entry.setAttemptCount(entry.getAttemptCount() + 1);
            emailLogRepository.save(entry);
        });
    }

    /**
     * Gửi email xác nhận đơn hàng mới (COD, Chuyển khoản hoặc sau khi thanh toán VNPAY thành công).
     */
    public EmailLog sendOrderConfirmationEmail(Order order, List<OrderItem> items, String paymentMethod) {
        return sendOrderConfirmationEmail(order, items, paymentMethod, null);
    }

    /**
     * Gửi (hoặc gửi lại) email xác nhận đơn hàng tới địa chỉ email chỉ định hoặc email trong đơn hàng.
     */
    public EmailLog sendOrderConfirmationEmail(
            Order order,
            List<OrderItem> items,
            String paymentMethod,
            String overrideRecipientEmail
    ) {
        if (order == null) {
            return null;
        }
        String recipientEmail = resolveRecipientEmail(order, overrideRecipientEmail);
        if (recipientEmail == null) {
            log.info("[EMAIL-SKIP] Đơn hàng {} không có địa chỉ email người nhận.", order.getOrderCode());
            return null;
        }

        List<OrderItem> safeItems = (items != null && !items.isEmpty()) ? items : order.getItems();
        boolean isPaid = "PAID".equalsIgnoreCase(order.getPaymentStatus());
        String subject = isPaid
                ? String.format("[Nhà Xinh] Xác nhận thanh toán & đơn hàng #%s thành công", order.getOrderCode())
                : String.format("[Nhà Xinh] Xác nhận đặt hàng thành công #%s", order.getOrderCode());

        String htmlBody = buildOrderConfirmationHtml(order, safeItems, paymentMethod);

        // Kiểm tra nếu có mẫu template tùy chỉnh trong DB
        Optional<NotificationTemplate> customTpl = templateRepository.findByTemplateCode("ORDER_CONFIRMATION")
                .filter( t -> Boolean.TRUE.equals(t.getIsActive()));
        if (customTpl.isPresent()) {
            subject = applyPlaceholders(customTpl.get().getSubjectTemplate(), order, paymentMethod, null);
            htmlBody = applyPlaceholders(customTpl.get().getBodyTemplate(), order, paymentMethod, null);
        }

        return dispatchEmail(order, recipientEmail, "ORDER_CONFIRMATION", subject, htmlBody);
    }

    /**
     * Gửi email thông báo khi trạng thái đơn hàng thay đổi (CONFIRMED, PROCESSING, SHIPPING, COMPLETED, CANCELLED).
     */
    public EmailLog sendOrderStatusUpdateEmail(Order order, String oldStatus, String newStatus, String note) {
        if (order == null || newStatus == null) {
            return null;
        }
        String recipientEmail = resolveRecipientEmail(order, null);
        if (recipientEmail == null) {
            return null;
        }

        String normalizedStatus = newStatus.trim().toUpperCase();
        String emailType = "CANCELLED".equals(normalizedStatus) ? "ORDER_CANCELLED" : "ORDER_STATUS_" + normalizedStatus;
        String statusLabel = translateOrderStatus(normalizedStatus);
        String subject = "CANCELLED".equals(normalizedStatus)
                ? String.format("[Nhà Xinh] Thông báo hủy đơn hàng #%s", order.getOrderCode())
                : String.format("[Nhà Xinh] Cập nhật đơn hàng #%s: %s", order.getOrderCode(), statusLabel);

        String htmlBody = buildOrderStatusUpdateHtml(order, oldStatus, normalizedStatus, note);

        Optional<NotificationTemplate> customTpl = templateRepository.findByTemplateCode(emailType)
                .filter(t -> Boolean.TRUE.equals(t.getIsActive()));
        if (customTpl.isPresent()) {
            subject = applyPlaceholders(customTpl.get().getSubjectTemplate(), order, null, note);
            htmlBody = applyPlaceholders(customTpl.get().getBodyTemplate(), order, null, note);
        }

        return dispatchEmail(order, recipientEmail, emailType, subject, htmlBody);
    }

    /**
     * Gửi email xác nhận thanh toán thành công khi đơn hàng chuyển sang PAID.
     */
    public EmailLog sendPaymentConfirmationEmail(Order order, String paymentMethod, String transactionCode) {
        if (order == null) {
            return null;
        }
        String recipientEmail = resolveRecipientEmail(order, null);
        if (recipientEmail == null) {
            return null;
        }

        String subject = String.format("[Nhà Xinh] Xác nhận thanh toán thành công đơn hàng #%s", order.getOrderCode());
        String htmlBody = buildPaymentConfirmationHtml(order, paymentMethod, transactionCode);

        return dispatchEmail(order, recipientEmail, "PAYMENT_CONFIRMATION", subject, htmlBody);
    }

    /**
     * Gửi email đặt lại mật khẩu cho khách hàng.
     */
    public EmailLog sendPasswordResetEmail(String recipientEmail, String recipientName, String resetToken) {
        if (recipientEmail == null || recipientEmail.isBlank()) {
            return null;
        }

        String subject = "[Nhà Xinh] Hướng dẫn đặt lại mật khẩu tài khoản";
        String htmlBody = buildPasswordResetHtml(recipientName, resetToken);

        return dispatchEmail(null, recipientEmail.trim(), "PASSWORD_RESET", subject, htmlBody);
    }

    private String buildPasswordResetHtml(String recipientName, String resetToken) {
        String name = recipientName != null && !recipientName.isBlank() ? recipientName : "Quý khách";
        return "<div style=\"font-family:'Be Vietnam Pro',sans-serif;max-width:600px;margin:auto;padding:24px;border:1px solid #e2e8f0;border-radius:12px;background:#ffffff;\">"
                + "<div style=\"text-align:center;margin-bottom:24px;\">"
                + "<h2 style=\"color:#b38e5d;letter-spacing:2px;margin:0;\">NHÀ XINH</h2>"
                + "<p style=\"color:#64748b;font-size:12px;margin:4px 0 0 0;\">NỘI THẤT TINH TẾ CHO KHÔNG GIAN SỐNG</p>"
                + "</div>"
                + "<h3 style=\"color:#0f172a;\">Xin chào " + name + ",</h3>"
                + "<p style=\"color:#334155;font-size:14px;line-height:1.6;\">Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn tại <strong>Nhà Xinh</strong>.</p>"
                + "<p style=\"color:#334155;font-size:14px;line-height:1.6;\">Mã xác thực đặt lại mật khẩu của bạn là:</p>"
                + "<div style=\"text-align:center;margin:24px 0;\">"
                + "<span style=\"display:inline-block;padding:12px 24px;background:#f8fafc;border:2px dashed #b38e5d;color:#b38e5d;font-size:24px;font-weight:bold;letter-spacing:4px;border-radius:8px;\">"
                + resetToken
                + "</span>"
                + "</div>"
                + "<p style=\"color:#64748b;font-size:13px;line-height:1.5;\">Mã này có hiệu lực trong vòng <strong>15 phút</strong>. Nếu bạn không yêu cầu thay đổi mật khẩu, vui lòng bỏ qua email này.</p>"
                + "<hr style=\"border:none;border-top:1px solid #f1f5f9;margin:24px 0;\"/>"
                + "<p style=\"color:#94a3b8;font-size:11px;text-align:center;\">Hotline hỗ trợ: 1800 6057 | Email: cskh@nhaxinh.vn</p>"
                + "</div>";
    }

    private EmailLog dispatchEmail(
            Order order,
            String recipientEmail,
            String emailType,
            String subject,
            String htmlBody
    ) {
        try {
            EmailLog emailLog = new EmailLog();
            emailLog.setOrder(order);
            emailLog.setRecipientEmail(recipientEmail);
            emailLog.setEmailType(emailType);
            emailLog.setSubject(truncate(subject, 290));
            emailLog.setSendStatus("PENDING");
            emailLog.setAttemptCount(1);
            emailLog = emailLogRepository.save(emailLog);

            if (isSmtpConfigured()) {
                try {
                    String messageId = sendViaSmtp(recipientEmail, subject, htmlBody);
                    emailLog.setSendStatus("SENT");
                    emailLog.setProviderMessageId(messageId);
                    emailLog.setSentAt(LocalDateTime.now());
                    emailLog = emailLogRepository.save(emailLog);
                    log.info("[EMAIL-SENT] Đã gửi email {} tới '{}' cho đơn hàng #{} (msgId={})",
                            emailType, recipientEmail, order != null ? order.getOrderCode() : "N/A", messageId);
                } catch (Exception smtpEx) {
                    emailLog.setSendStatus("FAILED");
                    emailLog.setErrorMessage(truncate(smtpEx.getMessage(), 1450));
                    emailLog = emailLogRepository.save(emailLog);
                    log.warn("[EMAIL-FAILED] Không thể gửi SMTP tới '{}' cho đơn #{}: {}",
                            recipientEmail, order != null ? order.getOrderCode() : "N/A", smtpEx.getMessage());
                }
            } else {
                String simulatedId = "LOCAL-MAIL-" + UUID.randomUUID().toString().substring(0, 12).toUpperCase();
                emailLog.setSendStatus("SENT");
                emailLog.setProviderMessageId(simulatedId);
                emailLog.setSentAt(LocalDateTime.now());
                emailLog = emailLogRepository.save(emailLog);
                log.info("[EMAIL-LOGGED] (Chưa cấu hình MAIL_USER/MAIL_PASS) Đã ghi nhận email {} tới '{}' | Tiêu đề: '{}'",
                        emailType, recipientEmail, subject);
            }
            return emailLog;
        } catch (Exception ex) {
            log.warn("[EMAIL-ERROR] Lỗi khi xử lý thông báo email cho đơn #{}: {}",
                    order != null ? order.getOrderCode() : "N/A", ex.getMessage());
            return null;
        }
    }

    public boolean isSmtpConfigured() {
        return mailHost != null && !mailHost.isBlank()
                && mailUsername != null && !mailUsername.isBlank()
                && mailPassword != null && !mailPassword.isBlank();
    }

    /**
     * Gửi email HTML qua giao thức SMTP (hỗ trợ SMTPS cổng 465 hoặc SMTP cổng 587/25).
     */
    private String sendViaSmtp(String toEmail, String subject, String htmlBody) throws Exception {
        String messageId = "<" + UUID.randomUUID() + "@nhaxinh.vn>";
        Socket socket = null;
        try {
            if (sslEnabled || mailPort == 465) {
                SSLSocketFactory factory = (SSLSocketFactory) SSLSocketFactory.getDefault();
                Socket rawSocket = new Socket();
                rawSocket.connect(new InetSocketAddress(mailHost, mailPort), timeoutMs);
                rawSocket.setSoTimeout(timeoutMs);
                SSLSocket sslSocket = (SSLSocket) factory.createSocket(rawSocket, mailHost, mailPort, true);
                sslSocket.startHandshake();
                socket = sslSocket;
            } else {
                socket = new Socket();
                socket.connect(new InetSocketAddress(mailHost, mailPort), timeoutMs);
                socket.setSoTimeout(timeoutMs);
            }

            BufferedReader reader = new BufferedReader(new InputStreamReader(socket.getInputStream(), StandardCharsets.UTF_8));
            PrintWriter writer = new PrintWriter(new OutputStreamWriter(socket.getOutputStream(), StandardCharsets.UTF_8), false);

            expectSmtpCode(reader, "220");
            sendSmtpCommand(writer, reader, "EHLO nhaxinh.vn", "250");

            // Если cổng 587 (STARTTLS) và chưa bọc SSL
            if (!sslEnabled && mailPort == 587) {
                sendSmtpCommand(writer, reader, "STARTTLS", "220");
                SSLSocketFactory factory = (SSLSocketFactory) SSLSocketFactory.getDefault();
                SSLSocket sslSocket = (SSLSocket) factory.createSocket(socket, mailHost, mailPort, true);
                sslSocket.startHandshake();
                socket = sslSocket;
                reader = new BufferedReader(new InputStreamReader(socket.getInputStream(), StandardCharsets.UTF_8));
                writer = new PrintWriter(new OutputStreamWriter(socket.getOutputStream(), StandardCharsets.UTF_8), false);
                sendSmtpCommand(writer, reader, "EHLO nhaxinh.vn", "250");
            }

            sendSmtpCommand(writer, reader, "AUTH LOGIN", "334");
            sendSmtpCommand(writer, reader,
                    Base64.getEncoder().encodeToString(mailUsername.getBytes(StandardCharsets.UTF_8)), "334");
            sendSmtpCommand(writer, reader,
                    Base64.getEncoder().encodeToString(mailPassword.getBytes(StandardCharsets.UTF_8)), "235");

            sendSmtpCommand(writer, reader, "MAIL FROM:<" + mailUsername + ">", "250");
            sendSmtpCommand(writer, reader, "RCPT TO:<" + toEmail + ">", "250");
            sendSmtpCommand(writer, reader, "DATA", "354");

            String encodedSubject = "=?UTF-8?B?"
                    + Base64.getEncoder().encodeToString(subject.getBytes(StandardCharsets.UTF_8))
                    + "?=";
            String encodedFromName = "=?UTF-8?B?"
                    + Base64.getEncoder().encodeToString("Nội Thất Nhà Xinh".getBytes(StandardCharsets.UTF_8))
                    + "?=";
            String base64Body = Base64.getMimeEncoder(76, "\r\n".getBytes(StandardCharsets.US_ASCII))
                    .encodeToString(htmlBody.getBytes(StandardCharsets.UTF_8));

            writer.print("From: " + encodedFromName + " <" + mailUsername + ">\r\n");
            writer.print("To: <" + toEmail + ">\r\n");
            writer.print("Subject: " + encodedSubject + "\r\n");
            writer.print("Message-ID: " + messageId + "\r\n");
            writer.print("MIME-Version: 1.0\r\n");
            writer.print("Content-Type: text/html; charset=UTF-8\r\n");
            writer.print("Content-Transfer-Encoding: base64\r\n");
            writer.print("\r\n");
            writer.print(base64Body + "\r\n");
            writer.print(".\r\n");
            writer.flush();

            expectSmtpCode(reader, "250");
            writer.print("QUIT\r\n");
            writer.flush();
            return messageId;
        } finally {
            if (socket != null && !socket.isClosed()) {
                try {
                    socket.close();
                } catch (Exception ignored) {
                }
            }
        }
    }

    private void sendSmtpCommand(PrintWriter writer, BufferedReader reader, String cmd, String expectedPrefix) throws Exception {
        writer.print(cmd + "\r\n");
        writer.flush();
        expectSmtpCode(reader, expectedPrefix);
    }

    private void expectSmtpCode(BufferedReader reader, String expectedPrefix) throws Exception {
        String line;
        StringBuilder fullResponse = new StringBuilder();
        while ((line = reader.readLine()) != null) {
            fullResponse.append(line).append(" ");
            if (line.length() >= 4 && line.charAt(3) != '-') {
                break;
            }
        }
        String resp = fullResponse.toString().trim();
        if (!resp.startsWith(expectedPrefix)) {
            throw new IllegalStateException("SMTP phản hồi lỗi (kỳ vọng " + expectedPrefix + "): " + resp);
        }
    }

    public String resolveRecipientEmail(Order order, String overrideEmail) {
        if (overrideEmail != null && isValidEmail(overrideEmail.trim())) {
            return overrideEmail.trim();
        }
        if (order.getRecipientEmail() != null && isValidEmail(order.getRecipientEmail().trim())) {
            return order.getRecipientEmail().trim();
        }
        if (order.getUser() != null && order.getUser().getEmail() != null && isValidEmail(order.getUser().getEmail().trim())) {
            return order.getUser().getEmail().trim();
        }
        return null;
    }

    private boolean isValidEmail(String email) {
        return email != null && email.length() >= 5 && email.contains("@") && email.contains(".");
    }

    private String buildOrderConfirmationHtml(Order order, List<OrderItem> items, String paymentMethod) {
        String createdDate = (order.getCreatedAt() != null ? order.getCreatedAt() : LocalDateTime.now()).format(DATE_FMT);
        String paymentMethodLabel = translatePaymentMethod(paymentMethod);
        String paymentStatusLabel = translatePaymentStatus(order.getPaymentStatus());
        String orderStatusLabel = translateOrderStatus(order.getOrderStatus());

        StringBuilder itemsRows = new StringBuilder();
        if (items != null && !items.isEmpty()) {
            for (OrderItem item : items) {
                String variantInfo = item.getVariantName() != null && !item.getVariantName().isBlank()
                        ? " <span style='color:#6b7280;font-size:12px;'>(" + escapeHtml(item.getVariantName()) + ")</span>"
                        : "";
                itemsRows.append("<tr>")
                        .append("<td style='padding:10px 12px;border-bottom:1px solid #e5e7eb;'>")
                        .append("<strong>").append(escapeHtml(item.getProductName())).append("</strong>")
                        .append(variantInfo)
                        .append("<div style='font-size:12px;color:#9ca3af;'>SKU: ").append(escapeHtml(item.getSku())).append("</div>")
                        .append("</td>")
                        .append("<td style='padding:10px 12px;border-bottom:1px solid #e5e7eb;text-align:center;'>")
                        .append(item.getQuantity())
                        .append("</td>")
                        .append("<td style='padding:10px 12px;border-bottom:1px solid #e5e7eb;text-align:right;'>")
                        .append(formatVnd(item.getUnitPrice()))
                        .append("</td>")
                        .append("<td style='padding:10px 12px;border-bottom:1px solid #e5e7eb;text-align:right;font-weight:600;'>")
                        .append(formatVnd(item.getLineTotal()))
                        .append("</td>")
                        .append("</tr>");
            }
        }

        StringBuilder discountRow = new StringBuilder();
        if (order.getDiscountAmount() != null && order.getDiscountAmount().compareTo(BigDecimal.ZERO) > 0) {
            String couponBadge = (order.getCouponCode() != null && !order.getCouponCode().isBlank())
                    ? " (" + escapeHtml(order.getCouponCode()) + ")"
                    : "";
            discountRow.append("<tr>")
                    .append("<td colspan='3' style='padding:6px 12px;text-align:right;color:#dc2626;'>Giảm giá")
                    .append(couponBadge).append(":</td>")
                    .append("<td style='padding:6px 12px;text-align:right;color:#dc2626;font-weight:600;'>-")
                    .append(formatVnd(order.getDiscountAmount())).append("</td>")
                    .append("</tr>");
        }

        String shippingText = (order.getShippingFee() == null || order.getShippingFee().compareTo(BigDecimal.ZERO) == 0)
                ? "Miễn phí"
                : formatVnd(order.getShippingFee());

        return "<div style='font-family:Arial,Helvetica,sans-serif;max-width:660px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;color:#1f2937;'>"
                + "<div style='background:#1c1917;color:#ffffff;padding:24px 28px;text-align:center;'>"
                + "<h1 style='margin:0;font-size:22px;letter-spacing:2px;'>NỘI THẤT NHÀ XINH</h1>"
                + "<p style='margin:6px 0 0;font-size:13px;color:#d6d3d1;'>Xác nhận đơn hàng & Hóa đơn điện tử</p>"
                + "</div>"
                + "<div style='padding:26px 28px;'>"
                + "<p style='margin-top:0;font-size:15px;'>Xin chào <strong>" + escapeHtml(order.getRecipientName()) + "</strong>,</p>"
                + "<p style='font-size:14px;line-height:1.6;color:#4b5563;'>Cảm ơn quý khách đã tin chọn <strong>Nội Thất Nhà Xinh</strong>. Đơn hàng của quý khách đã được ghi nhận trên hệ thống với thông tin chi tiết dưới đây:</p>"
                + "<div style='background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin:18px 0;font-size:14px;line-height:1.7;'>"
                + "<div><strong>Mã đơn hàng:</strong> <span style='color:#047857;font-size:16px;font-weight:700;'>#" + escapeHtml(order.getOrderCode()) + "</span></div>"
                + "<div><strong>Ngày đặt hàng:</strong> " + createdDate + "</div>"
                + "<div><strong>Trạng thái đơn hàng:</strong> " + orderStatusLabel + "</div>"
                + "<div><strong>Phương thức thanh toán:</strong> " + paymentMethodLabel + " (" + paymentStatusLabel + ")</div>"
                + "<div><strong>Người nhận:</strong> " + escapeHtml(order.getRecipientName()) + " - " + escapeHtml(order.getRecipientPhone()) + "</div>"
                + "<div><strong>Địa chỉ giao hàng:</strong> " + escapeHtml(order.getShippingAddress()) + "</div>"
                + (order.getCustomerNote() != null && !order.getCustomerNote().isBlank()
                ? "<div><strong>Ghi chú:</strong> " + escapeHtml(order.getCustomerNote()) + "</div>" : "")
                + "</div>"
                + "<h3 style='font-size:16px;margin:22px 0 10px;border-bottom:2px solid #1c1917;padding-bottom:6px;'>Chi tiết sản phẩm</h3>"
                + "<table style='width:100%;border-collapse:collapse;font-size:13px;'>"
                + "<thead><tr style='background:#f3f4f6;text-align:left;'>"
                + "<th style='padding:10px 12px;'>Sản phẩm</th>"
                + "<th style='padding:10px 12px;text-align:center;'>SL</th>"
                + "<th style='padding:10px 12px;text-align:right;'>Đơn giá</th>"
                + "<th style='padding:10px 12px;text-align:right;'>Thành tiền</th>"
                + "</tr></thead>"
                + "<tbody>" + itemsRows + "</tbody>"
                + "<tfoot>"
                + "<tr><td colspan='3' style='padding:10px 12px 4px;text-align:right;color:#6b7280;'>Tạm tính:</td>"
                + "<td style='padding:10px 12px 4px;text-align:right;'>" + formatVnd(order.getSubtotal()) + "</td></tr>"
                + "<tr><td colspan='3' style='padding:4px 12px;text-align:right;color:#6b7280;'>Phí vận chuyển & lắp đặt:</td>"
                + "<td style='padding:4px 12px;text-align:right;'>" + shippingText + "</td></tr>"
                + discountRow
                + "<tr><td colspan='3' style='padding:10px 12px;text-align:right;font-size:15px;font-weight:700;border-top:1px solid #d1d5db;'>Tổng thanh toán:</td>"
                + "<td style='padding:10px 12px;text-align:right;font-size:16px;font-weight:700;color:#047857;border-top:1px solid #d1d5db;'>" + formatVnd(order.getTotalAmount()) + "</td></tr>"
                + "</tfoot></table>"
                + "<p style='margin-top:22px;font-size:13px;color:#4b5563;line-height:1.6;'>Đội ngũ chăm sóc khách hàng và kỹ thuật viên của Nhà Xinh sẽ sớm liên hệ với quý khách qua số điện thoại <strong>" + escapeHtml(order.getRecipientPhone()) + "</strong> để xác nhận lịch giao hàng và lắp đặt tận nơi.</p>"
                + "</div>"
                + "<div style='background:#f3f4f6;padding:16px 28px;text-align:center;font-size:12px;color:#6b7280;'>"
                + "<p style='margin:0;'>Hotline hỗ trợ: <strong>1800 7200</strong> (Miễn phí) | Email: cskh@nhaxinh.com</p>"
                + "<p style='margin:4px 0 0;'>© Nội Thất Nhà Xinh - Tinh hoa nội thất Việt</p>"
                + "</div></div>";
    }

    private String buildOrderStatusUpdateHtml(Order order, String oldStatus, String newStatus, String note) {
        String newStatusLabel = translateOrderStatus(newStatus);
        String oldStatusLabel = oldStatus != null ? translateOrderStatus(oldStatus) : "Khởi tạo";
        String badgeColor = "CANCELLED".equalsIgnoreCase(newStatus) ? "#dc2626" : "#047857";

        return "<div style='font-family:Arial,Helvetica,sans-serif;max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;color:#1f2937;'>"
                + "<div style='background:#1c1917;color:#ffffff;padding:22px 28px;text-align:center;'>"
                + "<h1 style='margin:0;font-size:20px;letter-spacing:2px;'>NỘI THẤT NHÀ XINH</h1>"
                + "<p style='margin:6px 0 0;font-size:13px;color:#d6d3d1;'>Thông báo cập nhật trạng thái đơn hàng</p>"
                + "</div>"
                + "<div style='padding:24px 28px;'>"
                + "<p style='font-size:15px;'>Xin chào <strong>" + escapeHtml(order.getRecipientName()) + "</strong>,</p>"
                + "<p style='font-size:14px;line-height:1.6;color:#4b5563;'>Đơn hàng <strong>#" + escapeHtml(order.getOrderCode()) + "</strong> của quý khách vừa được cập nhật trạng thái:</p>"
                + "<div style='background:#f9fafb;border-left:4px solid " + badgeColor + ";padding:16px;margin:18px 0;border-radius:6px;font-size:14px;line-height:1.7;'>"
                + "<div><strong>Trạng thái trước:</strong> " + oldStatusLabel + "</div>"
                + "<div><strong>Trạng thái hiện tại:</strong> <span style='color:" + badgeColor + ";font-weight:700;'>" + newStatusLabel + "</span></div>"
                + (note != null && !note.isBlank() ? "<div><strong>Ghi chú:</strong> " + escapeHtml(note) + "</div>" : "")
                + "<div><strong>Tổng giá trị đơn hàng:</strong> " + formatVnd(order.getTotalAmount()) + "</div>"
                + "<div><strong>Địa chỉ nhận hàng:</strong> " + escapeHtml(order.getShippingAddress()) + "</div>"
                + "</div>"
                + "<p style='font-size:13px;color:#4b5563;'>Nếu có bất kỳ thắc mắc nào, quý khách vui lòng liên hệ Hotline <strong>1800 7200</strong> để được hỗ trợ nhanh nhất.</p>"
                + "</div>"
                + "<div style='background:#f3f4f6;padding:14px 28px;text-align:center;font-size:12px;color:#6b7280;'>"
                + "© Nội Thất Nhà Xinh | Hotline: 1800 7200"
                + "</div></div>";
    }

    private String buildPaymentConfirmationHtml(Order order, String paymentMethod, String transactionCode) {
        return "<div style='font-family:Arial,Helvetica,sans-serif;max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;color:#1f2937;'>"
                + "<div style='background:#047857;color:#ffffff;padding:22px 28px;text-align:center;'>"
                + "<h1 style='margin:0;font-size:20px;letter-spacing:1.5px;'>XÁC NHẬN THANH TOÁN THÀNH CÔNG</h1>"
                + "<p style='margin:6px 0 0;font-size:13px;color:#d1fae5;'>Nội Thất Nhà Xinh</p>"
                + "</div>"
                + "<div style='padding:24px 28px;font-size:14px;line-height:1.7;'>"
                + "<p>Xin chào <strong>" + escapeHtml(order.getRecipientName()) + "</strong>,</p>"
                + "<p>Nhà Xinh xác nhận đã nhận thanh toán thành công cho đơn hàng <strong>#" + escapeHtml(order.getOrderCode()) + "</strong>:</p>"
                + "<div style='background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;margin:16px 0;'>"
                + "<div><strong>Mã đơn hàng:</strong> #" + escapeHtml(order.getOrderCode()) + "</div>"
                + "<div><strong>Số tiền đã thanh toán:</strong> <strong style='color:#047857;'>" + formatVnd(order.getTotalAmount()) + "</strong></div>"
                + "<div><strong>Phương thức thanh toán:</strong> " + translatePaymentMethod(paymentMethod) + "</div>"
                + (transactionCode != null && !transactionCode.isBlank()
                ? "<div><strong>Mã giao dịch:</strong> " + escapeHtml(transactionCode) + "</div>" : "")
                + "<div><strong>Thời gian xác nhận:</strong> " + LocalDateTime.now().format(DATE_FMT) + "</div>"
                + "</div>"
                + "<p style='font-size:13px;color:#4b5563;'>Cảm ơn quý khách đã mua sắm tại Nội Thất Nhà Xinh!</p>"
                + "</div></div>";
    }

    private String applyPlaceholders(String template, Order order, String paymentMethod, String note) {
        if (template == null) {
            return "";
        }
        Map<String, String> values = Map.of(
                "{{orderCode}}", order.getOrderCode() != null ? order.getOrderCode() : "",
                "{{recipientName}}", order.getRecipientName() != null ? order.getRecipientName() : "",
                "{{recipientPhone}}", order.getRecipientPhone() != null ? order.getRecipientPhone() : "",
                "{{shippingAddress}}", order.getShippingAddress() != null ? order.getShippingAddress() : "",
                "{{totalAmount}}", formatVnd(order.getTotalAmount()),
                "{{orderStatus}}", translateOrderStatus(order.getOrderStatus()),
                "{{paymentMethod}}", translatePaymentMethod(paymentMethod),
                "{{note}}", note != null ? note : ""
        );
        String result = template;
        for (Map.Entry<String, String> entry : values.entrySet()) {
            result = result.replace(entry.getKey(), entry.getValue());
        }
        return result;
    }

    private String translateOrderStatus(String status) {
        if (status == null) return "Đang xử lý";
        return switch (status.trim().toUpperCase()) {
            case "PENDING" -> "Chờ xác nhận";
            case "CONFIRMED" -> "Đã xác nhận";
            case "PROCESSING" -> "Đang chuẩn bị hàng";
            case "SHIPPING", "DELIVERING" -> "Đang giao hàng & lắp đặt";
            case "COMPLETED", "DELIVERED" -> "Đã giao hàng hoàn tất";
            case "CANCELLED" -> "Đã hủy";
            default -> status;
        };
    }

    private String translatePaymentMethod(String method) {
        if (method == null) return "Thanh toán khi nhận hàng (COD)";
        return switch (method.trim().toUpperCase()) {
            case "VNPAY" -> "Cổng thanh toán VNPAY";
            case "BANK_TRANSFER", "VIETQR" -> "Chuyển khoản ngân hàng (VietQR)";
            case "CASH_ON_DELIVERY", "COD" -> "Thanh toán khi nhận hàng (COD)";
            default -> method;
        };
    }

    private String translatePaymentStatus(String status) {
        if (status == null) return "Chưa thanh toán";
        return switch (status.trim().toUpperCase()) {
            case "PAID", "SUCCESS" -> "Đã thanh toán";
            case "PARTIALLY_PAID" -> "Đã đặt cọc";
            case "REFUNDED" -> "Đã hoàn tiền";
            case "FAILED" -> "Thanh toán thất bại";
            default -> "Chưa thanh toán";
        };
    }

    private String formatVnd(BigDecimal amount) {
        if (amount == null) {
            return "0 ₫";
        }
        NumberFormat nf = NumberFormat.getInstance(VI_LOCALE);
        return nf.format(amount) + " ₫";
    }

    private String escapeHtml(String input) {
        if (input == null) {
            return "";
        }
        return input
                .replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;")
                .replace("'", "&#39;");
    }

    private String truncate(String str, int maxLen) {
        if (str == null) return null;
        return str.length() <= maxLen ? str : str.substring(0, maxLen);
    }
}
