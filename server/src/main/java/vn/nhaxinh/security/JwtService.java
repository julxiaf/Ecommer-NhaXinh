package vn.nhaxinh.security;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import vn.nhaxinh.user.User;

/**
 * Dịch vụ cấp phát và xác thực JWT (HMAC-SHA256 chuẩn RFC 7519) cho hệ thống Nhà Xinh.
 */
@Service
public class JwtService {

    private static final Logger log = LoggerFactory.getLogger(JwtService.class);
    private static final String HMAC_ALGO = "HmacSHA256";
    private static final Base64.Encoder BASE64_URL_ENCODER = Base64.getUrlEncoder().withoutPadding();
    private static final Base64.Decoder BASE64_URL_DECODER = Base64.getUrlDecoder();

    private final byte[] secretBytes;
    private final long expirationSeconds;
    private final ObjectMapper objectMapper;

    public JwtService(
            @Value("${app.jwt.secret:NhaXinhLuxuryFurnitureJwtSecretKey2026VerySecureKeyForHmacSha256!}") String secret,
            @Value("${app.jwt.expiration-seconds:86400}") long expirationSeconds,
            ObjectMapper objectMapper) {
        this.secretBytes = secret.getBytes(StandardCharsets.UTF_8);
        this.expirationSeconds = expirationSeconds;
        this.objectMapper = objectMapper;
    }

    public long getExpirationSeconds() {
        return expirationSeconds;
    }

    /**
     * Cấp phát JWT token cho người dùng sau khi xác thực thành công.
     * Payload của token chỉ chứa: id, role, roles, permissions (cùng iat, exp chuẩn JWT).
     */
    public String generateToken(User user, Set<String> roles, Set<String> permissions) {
        try {
            long now = Instant.now().getEpochSecond();
            long exp = now + expirationSeconds;

            Map<String, Object> header = new LinkedHashMap<>();
            header.put("alg", "HS256");
            header.put("typ", "JWT");

            Set<String> safeRoles = roles != null ? roles : Set.of();
            Set<String> safePermissions = permissions != null ? permissions : Set.of();
            String primaryRole = safeRoles.stream().findFirst().orElse("CUSTOMER");

            Map<String, Object> payload = new LinkedHashMap<>();
            payload.put("id", user != null ? user.getId() : null);
            payload.put("role", primaryRole);
            payload.put("roles", safeRoles);
            payload.put("permissions", safePermissions);
            payload.put("iat", now);
            payload.put("exp", exp);

            String encodedHeader = BASE64_URL_ENCODER.encodeToString(objectMapper.writeValueAsBytes(header));
            String encodedPayload = BASE64_URL_ENCODER.encodeToString(objectMapper.writeValueAsBytes(payload));
            String signingInput = encodedHeader + "." + encodedPayload;
            String signature = sign(signingInput);

            return signingInput + "." + signature;
        } catch (Exception ex) {
            log.error("[JWT] Lỗi khi tạo JWT token cho userId={}: {}", user != null ? user.getId() : null, ex.getMessage());
            throw new IllegalStateException("Không thể khởi tạo JWT token", ex);
        }
    }

    /**
     * Xác thực chữ ký & thời hạn của JWT, trả về id người dùng (Long) nếu hợp lệ hoặc null nếu không hợp lệ.
     */
    public Long validateAndExtractUserId(String token) {
        if (token == null || token.isBlank()) {
            return null;
        }
        try {
            String[] parts = token.trim().split("\\.");
            if (parts.length != 3) {
                return null;
            }

            String signingInput = parts[0] + "." + parts[1];
            String expectedSignature = sign(signingInput);

            // So sánh chữ ký theo thời gian hằng số để chống timing attack
            if (!MessageDigest.isEqual(
                    expectedSignature.getBytes(StandardCharsets.UTF_8),
                    parts[2].getBytes(StandardCharsets.UTF_8))) {
                log.debug("[JWT] Chữ ký JWT không hợp lệ.");
                return null;
            }

            byte[] payloadBytes = BASE64_URL_DECODER.decode(parts[1]);
            Map<String, Object> claims = objectMapper.readValue(
                    payloadBytes, new TypeReference<Map<String, Object>>() {});

            Object expObj = claims.get("exp");
            if (expObj instanceof Number expNum) {
                long now = Instant.now().getEpochSecond();
                if (now >= expNum.longValue()) {
                    log.debug("[JWT] Token đã hết hạn (exp={}).", expNum.longValue());
                    return null;
                }
            } else {
                return null;
            }

            Object idObj = claims.get("id");
            if (idObj == null) {
                idObj = claims.get("uid");
            }
            if (idObj instanceof Number idNum) {
                return idNum.longValue();
            }
            if (idObj != null) {
                return Long.parseLong(String.valueOf(idObj));
            }
            return null;
        } catch (Exception ex) {
            log.debug("[JWT] Không thể giải mã/xác thực JWT: {}", ex.getMessage());
            return null;
        }
    }

    private String sign(String data) throws Exception {
        Mac mac = Mac.getInstance(HMAC_ALGO);
        mac.init(new SecretKeySpec(secretBytes, HMAC_ALGO));
        byte[] rawHmac = mac.doFinal(data.getBytes(StandardCharsets.UTF_8));
        return BASE64_URL_ENCODER.encodeToString(rawHmac);
    }
}

