package vn.nhaxinh.payment;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.HexFormat;
import java.util.Map;
import java.util.TreeMap;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.util.MultiValueMap;

@Service
public class VnPayService {

    private static final Logger log = LoggerFactory.getLogger(VnPayService.class);
    private static final DateTimeFormatter VNPAY_DATE = DateTimeFormatter.ofPattern("yyyyMMddHHmmss");
    private static final ZoneId VIETNAM_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    private final String terminalCode;
    private final String hashSecret;
    private final String paymentUrl;
    private final String returnUrl;
    private final String ipnUrl;
    private final String frontendResultUrl;

    public VnPayService(
            @Value("${app.vnpay.tmn-code:PTA3FMH7}") String terminalCode,
            @Value("${app.vnpay.hash-secret:NATJZPIHQJEYOVLFFVBANQMSEBPNFEBW}") String hashSecret,
            @Value("${app.vnpay.payment-url:https://sandbox.vnpayment.vn/paymentv2/vpcpay.html}") String paymentUrl,
            @Value("${app.vnpay.return-url:http://localhost:8080/api/v1/payments/vnpay/return}") String returnUrl,
            @Value("${app.vnpay.ipn-url:http://localhost:8080/api/v1/payments/vnpay/ipn}") String ipnUrl,
            @Value("${app.frontend.payment-result-url:http://localhost:5173/payment/result}") String frontendResultUrl
    ) {
        this.terminalCode = terminalCode;
        this.hashSecret = hashSecret;
        this.paymentUrl = paymentUrl;
        this.returnUrl = returnUrl;
        this.ipnUrl = ipnUrl;
        this.frontendResultUrl = frontendResultUrl;
    }

    public boolean isConfigured() {
        return !terminalCode.isBlank() && !hashSecret.isBlank();
    }

    public String createPaymentUrl(Payment payment, String clientIp) {
        return createPaymentUrl(
                payment.getTransactionCode(),
                payment.getOrder().getOrderCode(),
                payment.getAmount(),
                clientIp
        );
    }

    public String createPaymentUrl(String transactionCode, String orderCode, java.math.BigDecimal amount, String clientIp) {
        requireConfigured();
        Map<String, String> parameters = new TreeMap<>();
        LocalDateTime now = LocalDateTime.now(VIETNAM_ZONE);
        parameters.put("vnp_Version", "2.1.0");
        parameters.put("vnp_Command", "pay");
        parameters.put("vnp_TmnCode", terminalCode);
        parameters.put("vnp_Amount", amount.movePointRight(2).longValueExact() + "");
        parameters.put("vnp_CurrCode", "VND");
        parameters.put("vnp_TxnRef", transactionCode);
        parameters.put("vnp_OrderInfo", "Thanh toan don hang " + orderCode);
        parameters.put("vnp_OrderType", "other");
        parameters.put("vnp_Locale", "vn");
        parameters.put("vnp_ReturnUrl", returnUrl);
        parameters.put("vnp_IpAddr", normalizeIp(clientIp));
        parameters.put("vnp_CreateDate", VNPAY_DATE.format(now));
        parameters.put("vnp_ExpireDate", VNPAY_DATE.format(now.plusMinutes(15)));
        String query = encodeParameters(parameters);
        String signature = hmacSha512(hashSecret, query);
        String fullUrl = paymentUrl + "?" + query + "&vnp_SecureHash=" + signature;
        log.info("[VNPAY] Đã tạo URL thanh toán cho đơn {} (tmnCode={}): {}",
                orderCode, terminalCode, fullUrl);
        return fullUrl;
    }

    public boolean verify(MultiValueMap<String, String> parameters) {
        if (!isConfigured()) {
            return false;
        }
        String suppliedHash = parameters.getFirst("vnp_SecureHash");
        if (suppliedHash == null || suppliedHash.isBlank()) {
            return false;
        }
        Map<String, String> signed = new TreeMap<>();
        parameters.forEach((name, values) -> {
            if (values != null && !values.isEmpty()
                    && name.startsWith("vnp_")
                    && !name.equals("vnp_SecureHash")
                    && !name.equals("vnp_SecureHashType")) {
                signed.put(name, values.get(0));
            }
        });
        String expected = hmacSha512(hashSecret, encodeParameters(signed));
        return constantTimeEquals(expected, suppliedHash.toLowerCase(java.util.Locale.ROOT));
    }

    public String getIpnUrl() {
        return ipnUrl;
    }

    public String getFrontendResultUrl() {
        return frontendResultUrl;
    }

    public String getFrontendCheckoutUrl() {
        int idx = frontendResultUrl.indexOf("/payment/result");
        if (idx > 0) {
            return frontendResultUrl.substring(0, idx) + "/thanh-toan";
        }
        return "http://localhost:5173/thanh-toan";
    }

    public boolean isExpectedTerminalCode(String candidate) {
        return candidate != null && terminalCode.equals(candidate);
    }

    private void requireConfigured() {
        if (!isConfigured()) {
            throw new IllegalStateException("VNPay chưa được cấu hình");
        }
    }

    private static String encodeParameters(Map<String, String> parameters) {
        StringBuilder builder = new StringBuilder();
        parameters.forEach((key, value) -> {
            if (builder.length() > 0) {
                builder.append('&');
            }
            builder.append(URLEncoder.encode(key, StandardCharsets.US_ASCII))
                    .append('=')
                    .append(URLEncoder.encode(value, StandardCharsets.US_ASCII));
        });
        return builder.toString();
    }

    private static String hmacSha512(String key, String data) {
        try {
            Mac hmac = Mac.getInstance("HmacSHA512");
            hmac.init(new SecretKeySpec(key.getBytes(StandardCharsets.UTF_8), "HmacSHA512"));
            return HexFormat.of().formatHex(hmac.doFinal(data.getBytes(StandardCharsets.UTF_8)));
        } catch (java.security.GeneralSecurityException ex) {
            throw new IllegalStateException("Không thể ký yêu cầu VNPay", ex);
        }
    }

    private static boolean constantTimeEquals(String expected, String actual) {
        return java.security.MessageDigest.isEqual(
                expected.getBytes(StandardCharsets.US_ASCII),
                actual.getBytes(StandardCharsets.US_ASCII));
    }

    private static String normalizeIp(String ip) {
        if (ip == null || ip.isBlank() || "unknown".equalsIgnoreCase(ip)
                || "0:0:0:0:0:0:0:1".equals(ip) || "::1".equals(ip) || ip.contains(":")) {
            return "127.0.0.1";
        }
        String value = ip.split(",")[0].trim();
        return value.length() > 45 ? "127.0.0.1" : value;
    }
}
