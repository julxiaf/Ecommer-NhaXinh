package vn.nhaxinh.security;

import java.time.Instant;
import java.util.List;

/**
 * Response body chuẩn cho mọi lỗi API.
 *
 * <pre>
 * {
 *   "code"      : "PRODUCT_OUT_OF_STOCK",   // mã lỗi - frontend dùng để xử lý logic
 *   "message"   : "Sản phẩm đang hết hàng.",// thông điệp tiếng Việt thân thiện
 *   "timestamp" : "2026-10-26T11:30:00Z",   // thời điểm xảy ra lỗi (UTC)
 *   "path"      : "/api/v1/orders",         // endpoint bị lỗi
 *   "details"   : [...]                     // danh sách lỗi chi tiết (chỉ có khi validation fails)
 * }
 * </pre>
 *
 * Lưu ý bảo mật:
 *  - Trường {@code message} CHỈ chứa thông điệp user-friendly từ {@link ApiErrorCode}.
 *  - Stack trace, tên class, DB errors KHÔNG BAO GIỜ được đưa vào response.
 *  - {@code details} chỉ chứa tên field và mô tả vi phạm validation, không chứa giá trị.
 */
public record ApiError(
        String code,
        String message,
        Instant timestamp,
        String path,
        List<FieldError> details
) {

    /** Lỗi chi tiết cho từng field (dùng trong validation). */
    public record FieldError(String field, String reason) {}

    // -----------------------------------------------------------------------
    // Factory methods
    // -----------------------------------------------------------------------

    public static ApiError of(ApiErrorCode errorCode, String path) {
        return new ApiError(
                errorCode.name(),
                errorCode.getUserMessage(),
                Instant.now(),
                path,
                List.of()
        );
    }

    public static ApiError of(ApiErrorCode errorCode, String path, List<FieldError> details) {
        return new ApiError(
                errorCode.name(),
                errorCode.getUserMessage(),
                Instant.now(),
                path,
                details
        );
    }
}
