package vn.nhaxinh.payment;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.math.BigDecimal;
import java.net.URI;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.TreeMap;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.servlet.view.RedirectView;
import vn.nhaxinh.audit.AuditLogService;
import vn.nhaxinh.cart.*;
import vn.nhaxinh.catalog.Product;
import vn.nhaxinh.catalog.ProductVariant;
import vn.nhaxinh.inventory.Inventory;
import vn.nhaxinh.inventory.InventoryService;
import vn.nhaxinh.notification.NotificationService;
import vn.nhaxinh.order.*;
import vn.nhaxinh.risk.OrderRiskService;
import vn.nhaxinh.user.User;
import vn.nhaxinh.user.UserService;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class VnPayCheckoutTest {

    @Mock
    private CartService cartService;
    @Mock
    private UserService userService;
    @Mock
    private OrderService orderService;
    @Mock
    private OrderRepository orderRepository;
    @Mock
    private PaymentRepository paymentRepository;
    @Mock
    private PaymentWebhookEventRepository webhookRepository;
    @Mock
    private InventoryService inventoryService;
    @Mock
    private AuditLogService auditLogService;
    @Mock
    private OrderRiskService orderRiskService;
    @Mock
    private NotificationService notificationService;

    private VnPayService vnPayService;
    private CheckoutService checkoutService;
    private CheckoutController checkoutController;

    @BeforeEach
    void setUp() {
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
                orderRiskService,
                new ObjectMapper()
                // null,
                // notificationService
        );
        checkoutController = new CheckoutController(checkoutService, vnPayService);
    }

    @Test
    void checkoutWithVnPayGeneratesValidSignedPaymentUrlAndProcessesCallback() {
        User user = new User();
        user.setId(10L);
        user.setUsername("khachhang");

        Cart cart = new Cart();
        cart.setId(100L);
        cart.setUser(user);
        cart.setStatus("ACTIVE");

        Product product = new Product();
        product.setId(1L);
        product.setName("Sofa da cao cap");
        product.setStatus("ACTIVE");

        ProductVariant variant = new ProductVariant();
        variant.setId(50L);
        variant.setProduct(product);
        variant.setSku("NX-SOFA-01");
        variant.setName("Da Bo Y - Kem");
        variant.setPrice(new BigDecimal("15000000"));
        variant.setStatus("ACTIVE");

        CartItem cartItem = new CartItem(cart, variant, 2);
        cartItem.setId(500L);

        Inventory inventory = new Inventory(variant, 10, 0, 2);
        inventory.setIsNew(false);

        final Order[] capturedOrder = new Order[1];
        final Payment[] capturedPayment = new Payment[1];

        when(userService.findByUsername("khachhang")).thenReturn(Optional.of(user));
        when(cartService.getOrCreateCart(user, null)).thenReturn(cart);
        when(cartService.getItems(100L)).thenReturn(List.of(cartItem));
        when(orderRepository.findByRecipientPhoneAndCreatedAtAfter(any(), any())).thenReturn(List.of());
        when(inventoryService.findAllByVariantIdsForUpdate(anyCollection()))
                .thenReturn(Map.of(50L, inventory));
        lenient().when(orderService.createOrder(any(Order.class))).thenAnswer(inv -> {
            Order o = inv.getArgument(0);
            o.setId(999L);
            capturedOrder[0] = o;
            return o;
        });
        lenient().when(paymentRepository.saveAndFlush(any(Payment.class))).thenAnswer(inv -> {
            Payment p = inv.getArgument(0);
            p.setId(888L);
            capturedPayment[0] = p;
            return p;
        });

        CheckoutRequest request = new CheckoutRequest(
                10L,
                "Nguyen Van A",
                "0912345678",
                "nguyenvana@example.com",
                "123 Nguyen Hue, Phuong Ben Nghe, Quan 1, TP.HCM",
                "VNPAY",
                "Giao gio hanh chinh"
        );

        CheckoutResponse response = checkoutService.checkout(request, "khachhang", null, "127.0.0.1");

        // Bước 1: Khi mới bấm checkout VNPAY, CHƯA tạo Order và Payment trong DB
        assertThat(response.orderId()).isNull();
        assertThat(response.paymentId()).isNull();
        assertThat(response.orderStatus()).isEqualTo("PENDING_PAYMENT");
        assertThat(response.paymentStatus()).isEqualTo("UNPAID");
        assertThat(response.totalAmount()).isEqualByComparingTo("30000000");
        assertThat(response.paymentMethod()).isEqualTo("VNPAY");
        assertThat(response.paymentUrl()).startsWith("https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?");
        assertThat(response.paymentUrl()).contains("vnp_TmnCode=PTA3FMH7");
        assertThat(response.paymentUrl()).contains("vnp_Amount=3000000000");
        assertThat(response.paymentUrl()).contains("vnp_SecureHash=");
        verify(orderService, never()).createOrder(any());
        verify(paymentRepository, never()).saveAndFlush(any());
        assertThat(cart.getStatus()).isEqualTo("ACTIVE");

        // Verify signature of generated URL query parameters
        URI uri = URI.create(response.paymentUrl());
        MultiValueMap<String, String> queryParams = new LinkedMultiValueMap<>();
        for (String pair : uri.getRawQuery().split("&")) {
            int idx = pair.indexOf('=');
            String key = URLDecoder.decode(pair.substring(0, idx), StandardCharsets.UTF_8);
            String val = URLDecoder.decode(pair.substring(idx + 1), StandardCharsets.UTF_8);
            queryParams.add(key, val);
        }
        assertThat(vnPayService.verify(queryParams)).isTrue();
        String txnRef = queryParams.getFirst("vnp_TxnRef");

        // Bước 2: Giả lập VNPay trả về thành công (vnp_ResponseCode = 00) -> Lúc này mới tạo Order & Payment
        MultiValueMap<String, String> returnParams = new LinkedMultiValueMap<>();
        returnParams.add("vnp_Amount", "3000000000");
        returnParams.add("vnp_Command", "pay");
        returnParams.add("vnp_OrderInfo", "Thanh toan don hang " + response.orderCode());
        returnParams.add("vnp_ResponseCode", "00");
        returnParams.add("vnp_TmnCode", "PTA3FMH7");
        returnParams.add("vnp_TransactionNo", "14567890");
        returnParams.add("vnp_TransactionStatus", "00");
        returnParams.add("vnp_TxnRef", txnRef);
        returnParams.add("vnp_SecureHash", signParams(returnParams));

        RedirectView redirectSuccess = checkoutController.receiveVnPayReturn(returnParams);
        assertThat(redirectSuccess.getUrl()).startsWith("http://localhost:5173/thanh-toan?vnpay=success");
        assertThat(capturedOrder[0]).isNotNull();
        assertThat(capturedOrder[0].getOrderStatus()).isEqualTo("CONFIRMED");
        assertThat(capturedOrder[0].getPaymentStatus()).isEqualTo("PAID");
        assertThat(capturedPayment[0]).isNotNull();
        assertThat(capturedPayment[0].getPaymentStatus()).isEqualTo("PAID");
        assertThat(cart.getStatus()).isEqualTo("CONVERTED");
        assertThat(inventory.getQuantityOnHand()).isEqualTo(8);
        verify(notificationService).sendOrderConfirmationEmail(any(Order.class), any(), any());
    }

    @Test
    void checkoutWithVnPayDoesNotCreateOrderOrPaymentWhenCancelledOrFailed() {
        User user = new User();
        user.setId(10L);
        user.setUsername("khachhang");

        Cart cart = new Cart();
        cart.setId(100L);
        cart.setUser(user);
        cart.setStatus("ACTIVE");

        Product product = new Product();
        product.setId(1L);
        product.setName("Sofa da cao cap");
        product.setStatus("ACTIVE");

        ProductVariant variant = new ProductVariant();
        variant.setId(50L);
        variant.setProduct(product);
        variant.setSku("NX-SOFA-01");
        variant.setName("Da Bo Y - Kem");
        variant.setPrice(new BigDecimal("15000000"));
        variant.setStatus("ACTIVE");

        CartItem cartItem = new CartItem(cart, variant, 1);
        cartItem.setId(500L);

        Inventory inventory = new Inventory(variant, 10, 0, 2);

        when(userService.findByUsername("khachhang")).thenReturn(Optional.of(user));
        when(cartService.getOrCreateCart(user, null)).thenReturn(cart);
        when(cartService.getItems(100L)).thenReturn(List.of(cartItem));
        when(orderRepository.findByRecipientPhoneAndCreatedAtAfter(any(), any())).thenReturn(List.of());
        when(inventoryService.findAllByVariantIdsForUpdate(anyCollection()))
                .thenReturn(Map.of(50L, inventory));

        CheckoutRequest request = new CheckoutRequest(
                10L,
                "Nguyen Van A",
                "0912345678",
                "nguyenvana@example.com",
                "123 Nguyen Hue, Phuong Ben Nghe, Quan 1, TP.HCM",
                "VNPAY",
                "Giao gio hanh chinh"
        );

        CheckoutResponse response = checkoutService.checkout(request, "khachhang", null, "127.0.0.1");
        URI uri = URI.create(response.paymentUrl());
        MultiValueMap<String, String> queryParams = new LinkedMultiValueMap<>();
        for (String pair : uri.getRawQuery().split("&")) {
            int idx = pair.indexOf('=');
            String key = URLDecoder.decode(pair.substring(0, idx), StandardCharsets.UTF_8);
            String val = URLDecoder.decode(pair.substring(idx + 1), StandardCharsets.UTF_8);
            queryParams.add(key, val);
        }
        // Giả lập mã lỗi thất bại/hủy giao dịch (vnp_ResponseCode = 24)
        queryParams.set("vnp_ResponseCode", "24");
        queryParams.set("vnp_SecureHash", signParams(queryParams));

        RedirectView redirectView = checkoutController.receiveVnPayReturn(queryParams);
        assertThat(redirectView.getUrl()).startsWith("http://localhost:5173/thanh-toan?vnpay=failed");
        verify(orderService, never()).createOrder(any());
        verify(paymentRepository, never()).saveAndFlush(any());
        verify(notificationService, never()).sendOrderConfirmationEmail(any(), any(), any());
        assertThat(cart.getStatus()).isEqualTo("ACTIVE");
        assertThat(inventory.getQuantityOnHand()).isEqualTo(10);
    }

    private static String signParams(MultiValueMap<String, String> parameters) {
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

