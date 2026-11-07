package vn.nhaxinh.notification;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.math.BigDecimal;
import java.net.URI;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.TreeMap;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import vn.nhaxinh.audit.AuditLogService;
import vn.nhaxinh.cart.Cart;
import vn.nhaxinh.cart.CartItem;
import vn.nhaxinh.cart.CartService;
import vn.nhaxinh.catalog.Product;
import vn.nhaxinh.catalog.ProductVariant;
import vn.nhaxinh.inventory.Inventory;
import vn.nhaxinh.inventory.InventoryService;
import vn.nhaxinh.order.Order;
import vn.nhaxinh.order.OrderDepositRepository;
import vn.nhaxinh.order.OrderItemRepository;
import vn.nhaxinh.order.OrderRepository;
import vn.nhaxinh.order.OrderService;
import vn.nhaxinh.order.OrderStatusHistoryRepository;
import vn.nhaxinh.payment.CheckoutRequest;
import vn.nhaxinh.payment.CheckoutResponse;
import vn.nhaxinh.payment.CheckoutService;
import vn.nhaxinh.payment.CheckoutService.CallbackResult;
import vn.nhaxinh.payment.Payment;
import vn.nhaxinh.payment.PaymentRepository;
import vn.nhaxinh.payment.PaymentWebhookEventRepository;
import vn.nhaxinh.payment.VnPayService;
import vn.nhaxinh.security.JwtService;
import vn.nhaxinh.user.User;
import vn.nhaxinh.user.UserService;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class NotificationServiceTest {

    // Cấu hình SMTP Gmail thực tế:
    // - MAIL_USER (trunghieuddls1903@gmail.com): Email người gửi (hệ thống Nhà Xinh)
    // - TARGET_TEST_EMAIL (anhhlong70@gmail.com): Email người nhận (khách hàng)
    private static final String SMTP_HOST = "smtp.gmail.com";
    private static final int SMTP_PORT = 465;
    private static final String SMTP_USER = "trunghieuddls1903@gmail.com";
    private static final String SMTP_PASS = "nlqs gldh uwnu tjyz";
    private static final String TARGET_TEST_EMAIL = "anhhlong70@gmail.com";

    @Mock
    private NotificationTemplateRepository templateRepository;
    @Mock
    private EmailLogRepository emailLogRepository;
    @Mock
    private AuditLogService auditLogService;
    @Mock
    private CartService cartService;
    @Mock
    private UserService userService;
    @Mock
    private OrderRepository orderRepository;
    @Mock
    private OrderItemRepository orderItemRepository;
    @Mock
    private OrderStatusHistoryRepository statusHistoryRepository;
    @Mock
    private OrderDepositRepository depositRepository;
    @Mock
    private PaymentRepository paymentRepository;
    @Mock
    private PaymentWebhookEventRepository webhookRepository;
    @Mock
    private InventoryService inventoryService;

    private NotificationService notificationService;
    private OrderService orderService;
    private VnPayService vnPayService;
    private CheckoutService checkoutService;
    private AuthenticationManager authenticationManager;
    private SecurityContextRepository securityContextRepository;
    private JwtService jwtService;
    private final List<EmailLog> capturedEmails = new ArrayList<>();
    private final Map<Long, Order> orderStore = new java.util.HashMap<>();
    private final Map<Long, Payment> paymentStore = new java.util.HashMap<>();

    @BeforeEach
    void setUp() {
        capturedEmails.clear();
        orderStore.clear();
        paymentStore.clear();

        lenient().when(emailLogRepository.save(any(EmailLog.class))).thenAnswer(inv -> {
            EmailLog log = inv.getArgument(0);
            if (log.getId() == null) {
                log.setId((long) (capturedEmails.size() + 1));
            }
            if ("SENT".equals(log.getSendStatus()) || "FAILED".equals(log.getSendStatus())) {
                capturedEmails.add(log);
            }
            return log;
        });
        lenient().when(templateRepository.findByTemplateCode(anyString())).thenReturn(Optional.empty());

        notificationService = new NotificationService(
                templateRepository,
                emailLogRepository,
                auditLogService,
                SMTP_HOST,
                SMTP_PORT,
                SMTP_USER,
                SMTP_PASS,
                true,
                15000
        );

        orderService = new OrderService(
                orderRepository,
                orderItemRepository,
                statusHistoryRepository,
                depositRepository,
                paymentRepository,
                notificationService
        );

        vnPayService = new VnPayService(
                "PTA3FMH7",
                "NATJZPIHQJEYOVLFFVBANQMSEBPNFEBW",
                "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html",
                "http://localhost:8080/api/v1/payments/vnpay/return",
                "http://localhost:8080/api/v1/payments/vnpay/ipn",
                "http://localhost:5173/payment/result"
        );

        checkoutService = new CheckoutService(
                cartService,
                userService,
                orderService,
                orderRepository,
                paymentRepository,
                webhookRepository,
                inventoryService,
                auditLogService,
                vnPayService,
                new ObjectMapper(),
                null,
                notificationService
        );

        lenient().when(orderRepository.save(any(Order.class))).thenAnswer(inv -> {
            Order o = inv.getArgument(0);
            if (o.getId() == null) {
                o.setId((long) (orderStore.size() + 100));
            }
            orderStore.put(o.getId(), o);
            return o;
        });
        lenient().when(orderRepository.findById(anyLong())).thenAnswer(inv -> {
            Long id = inv.getArgument(0);
            return Optional.ofNullable(orderStore.get(id));
        });
        lenient().when(orderRepository.findByOrderCode(anyString())).thenAnswer(inv -> {
            String code = inv.getArgument(0);
            return orderStore.values().stream()
                    .filter(o -> code.equalsIgnoreCase(o.getOrderCode()))
                    .findFirst();
        });
        lenient().when(orderItemRepository.findByOrderId(anyLong())).thenAnswer(inv -> {
            Long orderId = inv.getArgument(0);
            Order o = orderStore.get(orderId);
            return o != null ? o.getItems() : List.of();
        });
        lenient().when(paymentRepository.saveAndFlush(any(Payment.class))).thenAnswer(inv -> {
            Payment p = inv.getArgument(0);
            if (p.getId() == null) {
                p.setId((long) (paymentStore.size() + 500));
            }
            paymentStore.put(p.getId(), p);
            return p;
        });
        lenient().when(paymentRepository.save(any(Payment.class))).thenAnswer(inv -> {
            Payment p = inv.getArgument(0);
            if (p.getId() == null) {
                p.setId((long) (paymentStore.size() + 500));
            }
            paymentStore.put(p.getId(), p);
            return p;
        });
        lenient().when(paymentRepository.findById(anyLong())).thenAnswer(inv -> {
            Long id = inv.getArgument(0);
            return Optional.ofNullable(paymentStore.get(id));
        });
        lenient().when(paymentRepository.findByOrderId(anyLong())).thenAnswer(inv -> {
            Long orderId = inv.getArgument(0);
            return paymentStore.values().stream()
                    .filter(p -> p.getOrder() != null && orderId.equals(p.getOrder().getId()))
                    .toList();
        });
    }

    @Test
    @DisplayName("Kịch bản 1 (COD): Đặt hàng Tiền mặt (COD) chờ xác nhận đơn thành công (CONFIRMED) mới gửi email kèm che PII & nút Xem chi tiết")
    void scenario1_codOrder_waitsForConfirmationBeforeSendingEmail() {
        User customer = new User();
        customer.setId(10L);
        customer.setUsername("anhlong70");

        Cart cart = new Cart();
        cart.setId(100L);
        cart.setUser(customer);
        cart.setStatus("ACTIVE");

        Product product = new Product();
        product.setId(1L);
        product.setName("Sofa Băng Orientale Da Bò Ý");
        product.setStatus("ACTIVE");
        product.setIsPreorder(false);

        ProductVariant variant = new ProductVariant();
        variant.setId(50L);
        variant.setProduct(product);
        variant.setSku("NX-ORI-SOFA-01");
        variant.setName("Gỗ Walnut - Da Bò Nâu Trầm");
        variant.setPrice(new BigDecimal("25800000"));
        variant.setStatus("ACTIVE");

        CartItem cartItem = new CartItem(cart, variant, 1);
        cartItem.setId(1000L);

        Inventory inventory = new Inventory(variant, 10, 0, 2);
        inventory.setIsNew(false);

        when(userService.findByUsername("anhlong70")).thenReturn(Optional.of(customer));
        when(cartService.getOrCreateCart(customer, null)).thenReturn(cart);
        when(cartService.getItems(100L)).thenReturn(List.of(cartItem));
        when(orderRepository.findByRecipientPhoneAndCreatedAtAfter(any(), any())).thenReturn(List.of());
        when(inventoryService.findAllByVariantIdsForUpdate(anyCollection())).thenReturn(Map.of(50L, inventory));

        // 1. Kiểm tra hàm che dữ liệu cá nhân (PII Masking)
        assertThat(notificationService.maskRecipientName("Nguyễn Văn Long")).isEqualTo("Nguyễn *** Long");
        assertThat(notificationService.maskPhoneNumber("0974933486")).isEqualTo("097****486");
        assertThat(notificationService.maskAddress("123 Nguyễn Huệ, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh"))
                .isEqualTo("***, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh");

        // 2. Bước 1: Khách đặt hàng COD -> Đơn ở trạng thái PENDING / UNPAID -> CHƯA GỬI EMAIL
        CheckoutRequest codRequest = new CheckoutRequest(
                10L,
                "Nguyễn Văn Long",
                "0974933486",
                TARGET_TEST_EMAIL,
                "123 Nguyễn Huệ, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh",
                "CASH_ON_DELIVERY",
                "Giao hàng và lắp đặt trong giờ hành chính"
        );

        CheckoutResponse codResponse = checkoutService.checkout(codRequest, "anhlong70", null, "127.0.0.1");
        assertThat(codResponse.orderId()).isNotNull();
        assertThat(codResponse.orderStatus()).isEqualTo("PENDING");
        assertThat(codResponse.paymentStatus()).isEqualTo("UNPAID");
        assertThat(capturedEmails).isEmpty(); // Chưa gửi email khi đơn COD mới tạo

        // 3. Bước 2: Admin/Hệ thống xác nhận đơn hàng COD thành công (PENDING -> CONFIRMED) -> GỬI EMAIL NGAY
        Order confirmedOrder = orderService.updateStatus(
                codResponse.orderId(),
                "CONFIRMED",
                "Đã xác nhận đơn hàng COD với khách hàng",
                customer
        );

        assertThat(confirmedOrder.getOrderStatus()).isEqualTo("CONFIRMED");
        assertThat(capturedEmails).hasSize(1);
        EmailLog codEmail = capturedEmails.get(0);
        assertThat(codEmail.getEmailType()).isEqualTo("ORDER_CONFIRMATION");
        assertThat(codEmail.getRecipientEmail()).isEqualTo(TARGET_TEST_EMAIL);
        assertThat(codEmail.getSubject()).contains("Đơn hàng COD #" + codResponse.orderCode() + " đã được xác nhận thành công");
        assertThat(codEmail.getSendStatus())
                .withFailMessage("Gửi email xác nhận đơn COD thất bại: %s", codEmail.getErrorMessage())
                .isEqualTo("SENT");
    }

    @Test
    @DisplayName("Kịch bản 2 (VNPay): Thanh toán VNPay thành công gửi email ngay; Hủy đơn VNPay gửi email thông báo hủy & hoàn tiền")
    void scenario2_vnPayOrder_sendsEmailImmediatelyOnPaymentSuccess_andSendsCancelEmailWhenCancelled() {
        User customer = new User();
        customer.setId(20L);
        customer.setUsername("anhlong70");

        Cart cart = new Cart();
        cart.setId(200L);
        cart.setUser(customer);
        cart.setStatus("ACTIVE");

        Product product = new Product();
        product.setId(2L);
        product.setName("Bàn Ăn Gỗ Walnut Orientale 8 Ghế");
        product.setStatus("ACTIVE");
        product.setIsPreorder(false);

        ProductVariant variant = new ProductVariant();
        variant.setId(60L);
        variant.setProduct(product);
        variant.setSku("NX-ORI-TABLE-08");
        variant.setName("Gỗ Walnut Tự Nhiên - 2m4");
        variant.setPrice(new BigDecimal("42500000"));
        variant.setStatus("ACTIVE");

        CartItem cartItem = new CartItem(cart, variant, 1);
        cartItem.setId(2000L);

        Inventory inventory = new Inventory(variant, 5, 0, 1);
        inventory.setIsNew(false);

        when(userService.findByUsername("anhlong70")).thenReturn(Optional.of(customer));
        when(userService.findById(20L)).thenReturn(Optional.of(customer));
        when(cartService.getOrCreateCart(customer, null)).thenReturn(cart);
        when(cartService.getCartById(200L)).thenReturn(cart);
        when(cartService.getItems(200L)).thenReturn(List.of(cartItem));
        when(orderRepository.findByRecipientPhoneAndCreatedAtAfter(any(), any())).thenReturn(List.of());
        when(inventoryService.findAllByVariantIdsForUpdate(anyCollection())).thenReturn(Map.of(60L, inventory));
        when(webhookRepository.findByProviderAndEventId(anyString(), anyString())).thenReturn(Optional.empty());

        // 1. Bước 1: Khởi tạo đơn hàng VNPay
        CheckoutRequest vnPayReq = new CheckoutRequest(
                20L,
                "Nguyễn Văn Long",
                "0974933486",
                TARGET_TEST_EMAIL,
                "88 Đồng Khởi, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh",
                "VNPAY",
                "Thanh toán qua VNPay - Giao lắp tận nơi"
        );

        CheckoutResponse initRes = checkoutService.checkout(vnPayReq, "anhlong70", null, "127.0.0.1");
        URI uri = URI.create(initRes.paymentUrl());
        MultiValueMap<String, String> queryParams = new LinkedMultiValueMap<>();
        for (String pair : uri.getRawQuery().split("&")) {
            int idx = pair.indexOf('=');
            String key = URLDecoder.decode(pair.substring(0, idx), StandardCharsets.UTF_8);
            String val = URLDecoder.decode(pair.substring(idx + 1), StandardCharsets.UTF_8);
            queryParams.add(key, val);
        }
        String txnRef = queryParams.getFirst("vnp_TxnRef");

        // 2. Bước 2: VNPay Callback thành công (vnp_ResponseCode = 00) -> GỬI EMAIL NGAY LẬP TỨC
        MultiValueMap<String, String> returnParams = new LinkedMultiValueMap<>();
        returnParams.add("vnp_Amount", "4250000000");
        returnParams.add("vnp_Command", "pay");
        returnParams.add("vnp_OrderInfo", "Thanh toan don hang " + initRes.orderCode());
        returnParams.add("vnp_ResponseCode", "00");
        returnParams.add("vnp_TmnCode", "PTA3FMH7");
        returnParams.add("vnp_TransactionNo", "14998877");
        returnParams.add("vnp_TransactionStatus", "00");
        returnParams.add("vnp_TxnRef", txnRef);
        returnParams.add("vnp_SecureHash", signVnPayParams(returnParams));

        CallbackResult callbackResult = checkoutService.processVnPayNotification(returnParams);
        assertThat(callbackResult.responseCode()).isEqualTo("00");

        Order vnPayOrder = checkoutService.findOrderByTransactionCode(txnRef).orElseThrow();
        assertThat(vnPayOrder.getOrderStatus()).isEqualTo("CONFIRMED");
        assertThat(vnPayOrder.getPaymentStatus()).isEqualTo("PAID");

        assertThat(capturedEmails).hasSize(1);
        EmailLog vnPaySuccessEmail = capturedEmails.get(0);
        assertThat(vnPaySuccessEmail.getEmailType()).isEqualTo("ORDER_CONFIRMATION");
        assertThat(vnPaySuccessEmail.getSubject()).contains("Xác nhận thanh toán & đơn hàng #" + initRes.orderCode());
        assertThat(vnPaySuccessEmail.getSendStatus()).isEqualTo("SENT");

        // 3. Bước 3: Hủy đơn hàng đã thanh toán bằng VNPay -> GỬI EMAIL THÔNG BÁO HỦY ĐƠN VNPAY & HOÀN TIỀN
        Order cancelledVnPayOrder = orderService.cancelOrder(
                vnPayOrder.getOrderCode(),
                "Khách hàng yêu cầu đổi sang bộ bàn ăn kích thước khác",
                "anhlong70",
                "0974933486"
        );

        assertThat(cancelledVnPayOrder.getOrderStatus()).isEqualTo("CANCELLED");
        assertThat(capturedEmails).hasSize(2);
        EmailLog vnPayCancelEmail = capturedEmails.get(1);
        assertThat(vnPayCancelEmail.getEmailType()).isEqualTo("ORDER_CANCELLED");
        assertThat(vnPayCancelEmail.getRecipientEmail()).isEqualTo(TARGET_TEST_EMAIL);
        assertThat(vnPayCancelEmail.getSubject()).contains("Thông báo hủy đơn hàng VNPay #" + initRes.orderCode());
        assertThat(vnPayCancelEmail.getSendStatus()).isEqualTo("SENT");
    }

    @Test
    @DisplayName("Kịch bản 3 (Quên mật khẩu): Báo lỗi 404 nếu email chưa đăng ký, gửi OTP tới anhhlong70@gmail.com nếu đã đăng ký")
    @SuppressWarnings("unchecked")
    void scenario3_forgotPassword_checksEmailRegistrationAndSendsOtp() {
        vn.nhaxinh.security.AuthController authController = new vn.nhaxinh.security.AuthController(
                authenticationManager,
                securityContextRepository,
                userService,
                auditLogService,
                jwtService,
                notificationService
        );
        org.springframework.mock.web.MockHttpServletRequest httpRequest = new org.springframework.mock.web.MockHttpServletRequest();
        httpRequest.setRemoteAddr("127.0.0.1");

        // 1. Email CHƯA đăng ký -> Trả về 404 EMAIL_NOT_REGISTERED & không gửi email
        when(userService.findByEmail("chua_dang_ky_nhaxinh@gmail.com")).thenReturn(Optional.empty());

        var notFoundRes = authController.forgotPassword(
                new vn.nhaxinh.security.AuthController.ForgotPasswordRequest("chua_dang_ky_nhaxinh@gmail.com"),
                httpRequest
        );
        assertThat(notFoundRes.getStatusCode().value()).isEqualTo(404);
        Map<String, Object> notFoundBody = (Map<String, Object>) notFoundRes.getBody();
        assertThat(notFoundBody).isNotNull();
        assertThat(notFoundBody.get("code")).isEqualTo("EMAIL_NOT_REGISTERED");
        assertThat(capturedEmails).isEmpty();

        // 2. Email ĐÃ đăng ký -> Gửi email OTP thành công
        User registeredUser = new User();
        registeredUser.setId(99L);
        registeredUser.setUsername("anhlong70");
        registeredUser.setEmail(TARGET_TEST_EMAIL);
        registeredUser.setFullName("Nguyễn Văn Long");
        registeredUser.setAccountType("REGISTERED");
        registeredUser.setStatus("ACTIVE");
        when(userService.findByEmail(TARGET_TEST_EMAIL)).thenReturn(Optional.of(registeredUser));

        var okRes = authController.forgotPassword(
                new vn.nhaxinh.security.AuthController.ForgotPasswordRequest(TARGET_TEST_EMAIL),
                httpRequest
        );
        assertThat(okRes.getStatusCode().value()).isEqualTo(200);
        assertThat(capturedEmails).hasSize(1);
        assertThat(capturedEmails.get(0).getEmailType()).isEqualTo("PASSWORD_RESET");
    }

    private static String signVnPayParams(MultiValueMap<String, String> parameters) {
        Map<String, String> signed = new TreeMap<>();
        parameters.forEach((name, values) -> {
            if (values != null && !values.isEmpty()
                    && name.startsWith("vnp_")
                    && !name.equals("vnp_SecureHash")
                    && !name.equals("vnp_SecureHashType")) {
                signed.put(name, values.get(0));
            }
        });
        StringBuilder builder = new StringBuilder();
        signed.forEach((key, value) -> {
            if (builder.length() > 0) {
                builder.append('&');
            }
            builder.append(java.net.URLEncoder.encode(key, StandardCharsets.US_ASCII))
                    .append('=')
                    .append(java.net.URLEncoder.encode(value, StandardCharsets.US_ASCII));
        });
        return vn.nhaxinh.vnpay.VNPayConfig.hmacSHA512("NATJZPIHQJEYOVLFFVBANQMSEBPNFEBW", builder.toString());
    }
}
