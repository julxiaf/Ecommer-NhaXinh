package vn.nhaxinh.cart;

/**
 * Helper phục vụ ghi log giỏ hàng an toàn (không làm lộ dữ liệu nhạy cảm).
 */
public final class CartLoggingHelper {

    private static final int VISIBLE_CHARS = 6;

    private CartLoggingHelper() {
    }

    /**
     * Che session token: chỉ giữ 6 ký tự đầu + "***" (ví dụ "54EMDW***").
     * Tuyệt đối không log session_token đầy đủ.
     */
    public static String maskToken(String token) {
        if (token == null || token.isBlank()) {
            return "null";
        }
        if (token.length() <= VISIBLE_CHARS) {
            return token.substring(0, Math.min(token.length(), 2)) + "***";
        }
        return token.substring(0, VISIBLE_CHARS) + "***";
    }
}

