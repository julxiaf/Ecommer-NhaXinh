package vn.nhaxinh.security;

import jakarta.servlet.http.HttpServletRequest;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.authentication.LockedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.web.HttpMediaTypeNotSupportedException;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.servlet.NoHandlerFoundException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

/**
 * Xử lý tập trung tất cả exception của API.
 *
 * Nguyên tắc bảo mật:
 *  1. Response trả về CHỈ chứa mã lỗi ({@link ApiErrorCode}) + thông điệp tiếng Việt thân thiện.
 *  2. Stack trace, tên class, message gốc từ DB/framework KHÔNG BAO GIỜ được đưa ra client.
 *  3. Mọi lỗi hệ thống (5xx) được log ở mức ERROR với đầy đủ chi tiết để hỗ trợ debug nội bộ.
 *  4. Lỗi nghiệp vụ (4xx) được log ở mức WARN — không cần stack trace.
 */
@RestControllerAdvice
public class ApiExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(ApiExceptionHandler.class);

    // ====================================================================
    // 1. VALIDATION — 400
    // ====================================================================

    /**
     * Bean Validation (@Valid / @Validated) thất bại.
     * Trả về danh sách từng field bị lỗi — không chứa giá trị người dùng nhập.
     */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiError> handleValidation(
            MethodArgumentNotValidException ex, HttpServletRequest req) {

        List<ApiError.FieldError> details = ex.getBindingResult()
                .getFieldErrors()
                .stream()
                .map(fe -> new ApiError.FieldError(fe.getField(), fe.getDefaultMessage()))
                .toList();

        log.warn("Validation failed on {}: {}", req.getRequestURI(), details);
        return build(ApiErrorCode.VALIDATION_FAILED, req, details);
    }

    /**
     * Request body không thể đọc được (JSON sai cú pháp, thiếu body, sai kiểu dữ liệu).
     */
    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ApiError> handleMalformedRequest(
            HttpMessageNotReadableException ex, HttpServletRequest req) {

        log.warn("Malformed request body on {}", req.getRequestURI());
        return build(ApiErrorCode.VALIDATION_MALFORMED_REQUEST, req);
    }

    /**
     * Tham số query/path sai kiểu (ví dụ: id=abc thay vì id=123).
     */
    @ExceptionHandler({
            MethodArgumentTypeMismatchException.class,
            MissingServletRequestParameterException.class
    })
    public ResponseEntity<ApiError> handleInvalidParam(Exception ex, HttpServletRequest req) {
        log.warn("Invalid parameter on {}: {}", req.getRequestURI(), ex.getMessage());
        return build(ApiErrorCode.VALIDATION_INVALID_PARAM, req);
    }

    /**
     * HTTP method không được hỗ trợ (ví dụ: DELETE thay vì GET).
     */
    @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
    public ResponseEntity<ApiError> handleMethodNotAllowed(
            HttpRequestMethodNotSupportedException ex, HttpServletRequest req) {

        log.warn("Method {} not allowed on {}", ex.getMethod(), req.getRequestURI());
        return build(ApiErrorCode.VALIDATION_METHOD_NOT_ALLOWED, req);
    }

    /**
     * Content-Type không được hỗ trợ.
     */
    @ExceptionHandler(HttpMediaTypeNotSupportedException.class)
    public ResponseEntity<ApiError> handleUnsupportedMedia(
            HttpMediaTypeNotSupportedException ex, HttpServletRequest req) {

        log.warn("Unsupported media type on {}: {}", req.getRequestURI(), ex.getContentType());
        return build(ApiErrorCode.VALIDATION_UNSUPPORTED_MEDIA, req);
    }

    // ====================================================================
    // 2. AUTH — 401 / 403
    // ====================================================================

    /**
     * Xác thực thất bại — sai username/password hoặc token.
     * Xử lý cả BadCredentialsException và AuthenticationException tổng quát.
     */
    @ExceptionHandler(AuthenticationException.class)
    public ResponseEntity<ApiError> handleAuthentication(
            AuthenticationException ex, HttpServletRequest req) {

        ApiErrorCode code;
        if (ex instanceof BadCredentialsException) {
            code = ApiErrorCode.AUTH_INVALID_CREDENTIALS;
        } else if (ex instanceof LockedException) {
            code = ApiErrorCode.AUTH_ACCOUNT_LOCKED;
        } else if (ex instanceof DisabledException) {
            code = ApiErrorCode.AUTH_ACCOUNT_DISABLED;
        } else {
            code = ApiErrorCode.AUTH_UNAUTHENTICATED;
        }

        log.warn("Authentication failed on {}: {}", req.getRequestURI(), ex.getClass().getSimpleName());
        return build(code, req);
    }

    /**
     * Không có quyền truy cập (đã đăng nhập nhưng thiếu role/permission).
     *
     * Lưu ý: Spring Security ném AccessDeniedException trước khi vào đây
     * nên handler này chỉ bắt khi exception bị re-throw từ tầng service.
     */
    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ApiError> handleAccessDenied(
            AccessDeniedException ex, HttpServletRequest req) {

        log.warn("Access denied on {}", req.getRequestURI());
        return build(ApiErrorCode.AUTH_FORBIDDEN, req);
    }

    // ====================================================================
    // 3. RESOURCE — 404 / 409
    // ====================================================================

    /**
     * Endpoint hoặc tài nguyên không tồn tại (404).
     */
    @ExceptionHandler({NoHandlerFoundException.class, NoResourceFoundException.class})
    public ResponseEntity<ApiError> handleNotFound(
            Exception ex, HttpServletRequest req) {

        log.warn("Not found on {}: {}", req.getRequestURI(), ex.getMessage());
        return build(ApiErrorCode.RESOURCE_NOT_FOUND, req);
    }

    /**
     * Lỗi nghiệp vụ có mã lỗi tường minh ({@link ApiException}).
     * Message nội bộ chỉ ghi log; client nhận thông điệp thân thiện của {@link ApiErrorCode}.
     */
    @ExceptionHandler(ApiException.class)
    public ResponseEntity<ApiError> handleApiException(ApiException ex, HttpServletRequest req) {
        ApiErrorCode code = ex.getErrorCode();
        if (code.getHttpStatus().is5xxServerError()) {
            log.error("Business error {} on {} {}: {}", code, req.getMethod(), req.getRequestURI(), ex.getMessage(), ex);
        } else {
            log.warn("Business error {} on {} {}: {}", code, req.getMethod(), req.getRequestURI(), ex.getMessage());
        }
        return build(code, req, ex.getDetails());
    }

    /**
     * Nghiệp vụ ném IllegalArgumentException — thường là tham số không hợp lệ
     * hoặc vi phạm quy tắc nghiệp vụ nhẹ (không phải lỗi hệ thống).
     */
    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ApiError> handleIllegalArgument(
            IllegalArgumentException ex, HttpServletRequest req) {

        log.warn("Illegal argument on {}: {}", req.getRequestURI(), ex.getMessage());
        return build(ApiErrorCode.VALIDATION_FAILED, req);
    }

    /**
     * Trạng thái nghiệp vụ không hợp lệ (ví dụ: không thể hủy đơn đang giao).
     */
    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<ApiError> handleIllegalState(
            IllegalStateException ex, HttpServletRequest req) {

        // Log message nội bộ để debug, nhưng KHÔNG trả ra client
        log.warn("Illegal state on {}: {}", req.getRequestURI(), ex.getMessage());
        return build(ApiErrorCode.SYSTEM_ERROR, req);
    }

    // ====================================================================
    // 4. SYSTEM / FALLBACK — 500
    // ====================================================================

    /**
     * Fallback cho mọi exception chưa được xử lý.
     *
     * QUAN TRỌNG: Log đầy đủ stack trace nội bộ, nhưng KHÔNG để lộ bất kỳ
     * chi tiết kỹ thuật nào ra response trả về client.
     */
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiError> handleUnexpected(Exception ex, HttpServletRequest req) {
        // Log đầy đủ để team kỹ thuật có thể debug
        log.error("Unexpected error on {} {}", req.getMethod(), req.getRequestURI(), ex);
        return build(ApiErrorCode.SYSTEM_ERROR, req);
    }

    // ====================================================================
    // Helpers
    // ====================================================================

    private ResponseEntity<ApiError> build(ApiErrorCode code, HttpServletRequest req) {
        return build(code, req, List.of());
    }

    private ResponseEntity<ApiError> build(
            ApiErrorCode code, HttpServletRequest req, List<ApiError.FieldError> details) {

        ApiError body = ApiError.of(code, req.getRequestURI(), details);
        return ResponseEntity.status(code.getHttpStatus()).body(body);
    }
}
