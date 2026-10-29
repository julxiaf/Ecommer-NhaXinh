package vn.nhaxinh.security;

import java.util.List;

/**
 * Exception nghiệp vụ mang theo {@link ApiErrorCode}.
 *
 * - {@code getMessage()} : thông điệp NỘI BỘ, chỉ dùng để ghi log (không trả về client).
 * - {@code details}      : danh sách lỗi chi tiết an toàn để trả về client (tùy chọn).
 */
public class ApiException extends RuntimeException {

    private final ApiErrorCode errorCode;
    private final transient List<ApiError.FieldError> details;

    public ApiException(ApiErrorCode errorCode) {
        this(errorCode, errorCode.name(), List.of());
    }

    public ApiException(ApiErrorCode errorCode, String internalMessage) {
        this(errorCode, internalMessage, List.of());
    }

    public ApiException(ApiErrorCode errorCode, String internalMessage, List<ApiError.FieldError> details) {
        super(internalMessage);
        this.errorCode = errorCode;
        this.details = details != null ? List.copyOf(details) : List.of();
    }

    /** Tiện ích: tạo exception kèm một lỗi chi tiết cho một field. */
    public static ApiException withField(ApiErrorCode errorCode, String field, String reason) {
        return new ApiException(errorCode, field + ": " + reason, List.of(new ApiError.FieldError(field, reason)));
    }

    public ApiErrorCode getErrorCode() {
        return errorCode;
    }

    public List<ApiError.FieldError> getDetails() {
        return details;
    }
}
