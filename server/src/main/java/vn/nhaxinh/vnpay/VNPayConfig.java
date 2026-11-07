package vn.nhaxinh.vnpay;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.Random;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.stereotype.Component;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.io.UnsupportedEncodingException;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;

@Component
public class VNPayConfig {
    /*
     * Link dang ky moi truong ======>> https://sandbox.vnpayment.vn/devreg/
     * 
     */
    public static String vnp_PayUrl = "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html";
    /*
     * 
     * Returnurl
     * KHÔNG dùng cứng localhost: URL trả về được dựng động theo đúng địa chỉ (IP/host:port)
     * mà trình duyệt của khách đang truy cập client (VD: http://192.168.1.10:5173),
     * đi qua Vite proxy /api về backend để xác thực chữ ký rồi mới chuyển sang /payment/result.
     * Đường dẫn callback (tương đối với origin của client):
     */
    public static final String VNP_RETURN_PATH = "/api/v1/payments/vnpay/return";

    /*
     * Fallback khi không xác định được origin của client (VD: gọi từ Postman / job nền).
     * Có thể cấu hình bằng biến môi trường VNPAY_CLIENT_ORIGIN (VD: http://192.168.1.10:5173).
     */
    public static String vnp_Returnurl = defaultClientOrigin() + VNP_RETURN_PATH;
    public static String vnp_TmnCode = "PTA3FMH7";
    public static String vnp_HashSecret = "NATJZPIHQJEYOVLFFVBANQMSEBPNFEBW";
    public static String vnp_apiUrl = "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html";

    public static String md5(String message) {
        String digest = null;
        try {
            MessageDigest md = MessageDigest.getInstance("MD5");
            byte[] hash = md.digest(message.getBytes("UTF-8"));
            StringBuilder sb = new StringBuilder(2 * hash.length);
            for (byte b : hash) {
                sb.append(String.format("%02x", b & 0xff));
            }
            digest = sb.toString();
        } catch (UnsupportedEncodingException ex) {
            digest = "";
        } catch (NoSuchAlgorithmException ex) {
            digest = "";
        }
        return digest;
    }

    public static String Sha256(String message) {
        String digest = null;
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] hash = md.digest(message.getBytes("UTF-8"));
            StringBuilder sb = new StringBuilder(2 * hash.length);
            for (byte b : hash) {
                sb.append(String.format("%02x", b & 0xff));
            }
            digest = sb.toString();
        } catch (UnsupportedEncodingException ex) {
            digest = "";
        } catch (NoSuchAlgorithmException ex) {
            digest = "";
        }
        return digest;
    }

    // Util for VNPAY
    public static String hashAllFields(Map<String, String> fields) {
        if (fields == null || fields.isEmpty()) {
            return "";
        }

        List<String> fieldNames = new ArrayList<>(fields.keySet());
        Collections.sort(fieldNames);
        StringBuilder sb = new StringBuilder();
        Iterator<String> itr = fieldNames.iterator();
        while (itr.hasNext()) {
            String fieldName = itr.next();
            if (fieldName != null) {
                String fieldValue = fields.get(fieldName);
                if ((fieldValue != null) && (fieldValue.length() > 0)) {
                    sb.append(fieldName);
                    sb.append("=");
                    sb.append(fieldValue);
                }
            }
            if (itr.hasNext()) {
                sb.append("&");
            }
        }
        return hmacSHA512(vnp_HashSecret, sb.toString());
    }

    public static String hmacSHA512(final String key, final String data) {
        try {

            if (key == null || data == null) {
                throw new NullPointerException();
            }
            final Mac hmac512 = Mac.getInstance("HmacSHA512");
            byte[] hmacKeyBytes = key.getBytes();
            final SecretKeySpec secretKey = new SecretKeySpec(hmacKeyBytes, "HmacSHA512");
            hmac512.init(secretKey);
            byte[] dataBytes = data.getBytes(StandardCharsets.UTF_8);
            byte[] result = hmac512.doFinal(dataBytes);
            StringBuilder sb = new StringBuilder(2 * result.length);
            for (byte b : result) {
                sb.append(String.format("%02x", b & 0xff));
            }
            return sb.toString();

        } catch (Exception ex) {
            return "";
        }
    }

    public static String getIpAddress(HttpServletRequest request) {
        String ipAdress;
        try {
            ipAdress = request.getHeader("X-FORWARDED-FOR");
            if (ipAdress == null) {
                ipAdress = request.getLocalAddr();
            }
        } catch (Exception e) {
            ipAdress = "Invalid IP:" + e.getMessage();
        }
        return ipAdress;
    }

    // ========================================================================
    // Xác định origin (scheme://ip:port) của client đang dùng trình duyệt
    // ========================================================================

    private static String defaultClientOrigin() {
        String env = System.getenv("VNPAY_CLIENT_ORIGIN");
        String sanitized = sanitizeOrigin(env);
        return sanitized != null ? sanitized : "http://localhost:5173";
    }

    /**
     * Origin của client khi khách bấm thanh toán (request fetch từ trình duyệt).
     * Ưu tiên: header Origin -> X-Forwarded-Host (Vite proxy xfwd) -> Referer.
     */
    public static String resolveClientOrigin(HttpServletRequest request) {
        if (request == null) {
            return null;
        }
        String origin = sanitizeOrigin(request.getHeader("Origin"));
        if (origin != null) {
            return origin;
        }
        String forwarded = resolveForwardedOrigin(request);
        if (forwarded != null) {
            return forwarded;
        }
        return sanitizeOrigin(request.getHeader("Referer"));
    }

    /**
     * Origin của client dựa trên header X-Forwarded-Host / X-Forwarded-Proto do Vite proxy gắn vào.
     * Dùng cho request VNPay redirect về (không có header Origin, Referer là vnpayment.vn).
     */
    public static String resolveForwardedOrigin(HttpServletRequest request) {
        if (request == null) {
            return null;
        }
        String host = firstHeaderValue(request.getHeader("X-Forwarded-Host"));
        if (host == null) {
            return null;
        }
        String proto = firstHeaderValue(request.getHeader("X-Forwarded-Proto"));
        if (proto == null) {
            proto = "http";
        }
        return sanitizeOrigin(proto + "://" + host);
    }

    /** URL trả về VNPay theo đúng IP/host client, fallback về vnp_Returnurl. */
    public static String buildReturnUrl(HttpServletRequest request) {
        String origin = resolveClientOrigin(request);
        return origin != null ? origin + VNP_RETURN_PATH : vnp_Returnurl;
    }

    private static String firstHeaderValue(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        String first = value.split(",")[0].trim();
        return first.isEmpty() ? null : first;
    }

    /** Chỉ chấp nhận http/https và trả về dạng scheme://host[:port] (bỏ path/query). */
    public static String sanitizeOrigin(String raw) {
        if (raw == null || raw.isBlank() || "null".equalsIgnoreCase(raw.trim())) {
            return null;
        }
        try {
            java.net.URI uri = java.net.URI.create(raw.trim());
            String scheme = uri.getScheme();
            String host = uri.getHost();
            if (scheme == null || host == null
                    || !("http".equalsIgnoreCase(scheme) || "https".equalsIgnoreCase(scheme))) {
                return null;
            }
            String hostPart = host.contains(":") && !host.startsWith("[") ? "[" + host + "]" : host;
            return scheme.toLowerCase() + "://" + hostPart + (uri.getPort() > 0 ? ":" + uri.getPort() : "");
        } catch (IllegalArgumentException ex) {
            return null;
        }
    }

    public static String getRandomNumber(int len) {
        Random rnd = new Random();
        String chars = "0123456789";
        StringBuilder sb = new StringBuilder(len);
        for (int i = 0; i < len; i++) {
            sb.append(chars.charAt(rnd.nextInt(chars.length())));
        }
        return sb.toString();
    }
}