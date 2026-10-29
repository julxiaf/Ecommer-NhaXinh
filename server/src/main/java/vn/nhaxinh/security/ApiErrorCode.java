package vn.nhaxinh.security;

import org.springframework.http.HttpStatus;

/**
 * Danh sách mã lỗi tập trung của hệ thống.
 *
 * Mỗi mã lỗi gồm:
 *  - code        : chuỗi định danh kỹ thuật (gửi cho frontend để xử lý logic)
 *  - httpStatus  : HTTP status code trả về
 *  - userMessage : thông điệp tiếng Việt thân thiện, KHÔNG tiết lộ thông tin nội bộ
 *
 * Quy ước đặt tên:
 *  AUTH_*        : xác thực / phân quyền
 *  VALIDATION_*  : dữ liệu đầu vào không hợp lệ
 *  RESOURCE_*    : tài nguyên không tìm thấy / xung đột
 *  ORDER_*       : nghiệp vụ đơn hàng
 *  PRODUCT_*     : nghiệp vụ sản phẩm
 *  CART_*        : giỏ hàng
 *  PAYMENT_*     : thanh toán
 *  SYSTEM_*      : lỗi hệ thống (không lộ chi tiết)
 */
public enum ApiErrorCode {

    // ------------------------------------------------------------------ AUTH
    /** Sai tên đăng nhập hoặc mật khẩu */
    AUTH_INVALID_CREDENTIALS(
            HttpStatus.UNAUTHORIZED,
            "Tên đăng nhập hoặc mật khẩu không đúng. Vui lòng thử lại."
    ),
    /** Token hết hạn hoặc không hợp lệ */
    AUTH_TOKEN_EXPIRED(
            HttpStatus.UNAUTHORIZED,
            "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại."
    ),
    /** Chưa đăng nhập */
    AUTH_UNAUTHENTICATED(
            HttpStatus.UNAUTHORIZED,
            "Bạn cần đăng nhập để thực hiện thao tác này."
    ),
    /** Không có quyền truy cập */
    AUTH_FORBIDDEN(
            HttpStatus.FORBIDDEN,
            "Bạn không có quyền thực hiện thao tác này."
    ),
    /** Tài khoản bị khóa */
    AUTH_ACCOUNT_LOCKED(
            HttpStatus.FORBIDDEN,
            "Tài khoản của bạn tạm thời bị khóa. Vui lòng liên hệ hỗ trợ."
    ),
    /** Tài khoản bị vô hiệu hóa */
    AUTH_ACCOUNT_DISABLED(
            HttpStatus.FORBIDDEN,
            "Tài khoản của bạn đã bị vô hiệu hóa. Vui lòng liên hệ hỗ trợ."
    ),

    // -------------------------------------------------------------- VALIDATION
    /** Dữ liệu đầu vào không hợp lệ (bean validation) */
    VALIDATION_FAILED(
            HttpStatus.BAD_REQUEST,
            "Dữ liệu nhập vào không hợp lệ. Vui lòng kiểm tra lại."
    ),
    /** Request body thiếu hoặc sai định dạng */
    VALIDATION_MALFORMED_REQUEST(
            HttpStatus.BAD_REQUEST,
            "Định dạng yêu cầu không hợp lệ. Vui lòng kiểm tra lại dữ liệu gửi lên."
    ),
    /** Tham số URL/query không hợp lệ */
    VALIDATION_INVALID_PARAM(
            HttpStatus.BAD_REQUEST,
            "Tham số truy vấn không hợp lệ."
    ),
    /** Phương thức HTTP không được hỗ trợ */
    VALIDATION_METHOD_NOT_ALLOWED(
            HttpStatus.METHOD_NOT_ALLOWED,
            "Phương thức yêu cầu không được hỗ trợ."
    ),
    /** Content-Type không được hỗ trợ */
    VALIDATION_UNSUPPORTED_MEDIA(
            HttpStatus.UNSUPPORTED_MEDIA_TYPE,
            "Loại nội dung không được hỗ trợ."
    ),

    // -------------------------------------------------------------- RESOURCE
    /** Tài nguyên không tồn tại */
    RESOURCE_NOT_FOUND(
            HttpStatus.NOT_FOUND,
            "Không tìm thấy thông tin yêu cầu."
    ),
    /** Xung đột dữ liệu (ví dụ: email đã tồn tại) */
    RESOURCE_CONFLICT(
            HttpStatus.CONFLICT,
            "Dữ liệu đã tồn tại trong hệ thống. Vui lòng kiểm tra lại."
    ),

    // -------------------------------------------------------------- RBAC (phân quyền)
    /** Vai trò không tồn tại */
    RBAC_ROLE_NOT_FOUND(
            HttpStatus.NOT_FOUND,
            "Không tìm thấy vai trò."
    ),
    /** Quyền hạn không tồn tại */
    RBAC_PERMISSION_NOT_FOUND(
            HttpStatus.NOT_FOUND,
            "Không tìm thấy quyền hạn."
    ),
    /** Người dùng không tồn tại */
    RBAC_USER_NOT_FOUND(
            HttpStatus.NOT_FOUND,
            "Không tìm thấy người dùng."
    ),
    /** Mã vai trò đã tồn tại */
    RBAC_ROLE_CODE_EXISTS(
            HttpStatus.CONFLICT,
            "Mã vai trò đã tồn tại. Vui lòng chọn mã khác."
    ),
    /** Mã quyền hạn đã tồn tại */
    RBAC_PERMISSION_CODE_EXISTS(
            HttpStatus.CONFLICT,
            "Mã quyền hạn đã tồn tại. Vui lòng chọn mã khác."
    ),
    /** Không được xóa vai trò hệ thống */
    RBAC_SYSTEM_ROLE_PROTECTED(
            HttpStatus.CONFLICT,
            "Không thể xóa vai trò mặc định của hệ thống."
    ),
    /** Vai trò đang được gán cho người dùng */
    RBAC_ROLE_IN_USE(
            HttpStatus.CONFLICT,
            "Vai trò đang được gán cho người dùng. Vui lòng gỡ vai trò khỏi người dùng trước khi xóa."
    ),
    /** Quyền hạn đang được gán cho vai trò */
    RBAC_PERMISSION_IN_USE(
            HttpStatus.CONFLICT,
            "Quyền hạn đang được sử dụng bởi vai trò. Hãy gỡ khỏi vai trò hoặc dùng tùy chọn xóa cưỡng bức."
    ),
    /** Admin tự gỡ quyền quản trị của chính mình */
    RBAC_SELF_LOCKOUT(
            HttpStatus.CONFLICT,
            "Bạn không thể tự gỡ vai trò quản trị của chính mình."
    ),
    /** Gỡ quản trị viên cuối cùng */
    RBAC_LAST_ADMIN(
            HttpStatus.CONFLICT,
            "Hệ thống phải còn ít nhất một quản trị viên đang hoạt động."
    ),

    // -------------------------------------------------------------- PRODUCT
    /** Sản phẩm không tồn tại hoặc đã ngừng bán */
    PRODUCT_NOT_FOUND(
            HttpStatus.NOT_FOUND,
            "Sản phẩm không tồn tại hoặc đã ngừng kinh doanh."
    ),
    /** Sản phẩm hết hàng */
    PRODUCT_OUT_OF_STOCK(
            HttpStatus.CONFLICT,
            "Sản phẩm hiện đang hết hàng. Vui lòng quay lại sau."
    ),
    /** Số lượng đặt vượt quá tồn kho */
    PRODUCT_INSUFFICIENT_STOCK(
            HttpStatus.CONFLICT,
            "Số lượng sản phẩm trong kho không đủ cho yêu cầu của bạn."
    ),

    // -------------------------------------------------------------- CART
    /** Giỏ hàng trống */
    CART_EMPTY(
            HttpStatus.BAD_REQUEST,
            "Giỏ hàng của bạn đang trống."
    ),
    /** Sản phẩm không có trong giỏ */
    CART_ITEM_NOT_FOUND(
            HttpStatus.NOT_FOUND,
            "Sản phẩm không có trong giỏ hàng."
    ),

    // -------------------------------------------------------------- ORDER
    /** Đơn hàng không tồn tại */
    ORDER_NOT_FOUND(
            HttpStatus.NOT_FOUND,
            "Không tìm thấy đơn hàng."
    ),
    /** Không thể hủy đơn hàng ở trạng thái hiện tại */
    ORDER_CANNOT_CANCEL(
            HttpStatus.CONFLICT,
            "Đơn hàng không thể hủy ở trạng thái hiện tại. Vui lòng liên hệ hỗ trợ."
    ),
    /** Mã giảm giá không hợp lệ */
    ORDER_COUPON_INVALID(
            HttpStatus.BAD_REQUEST,
            "Mã giảm giá không hợp lệ hoặc đã hết hạn."
    ),
    /** Mã giảm giá đã được sử dụng */
    ORDER_COUPON_ALREADY_USED(
            HttpStatus.CONFLICT,
            "Mã giảm giá này đã được sử dụng."
    ),
    /** Phương thức COD bị từ chối do rủi ro hoặc không hỗ trợ */
    ORDER_COD_NOT_ALLOWED(
            HttpStatus.BAD_REQUEST,
            "Phương thức thanh toán khi nhận hàng (COD) không khả dụng cho đơn hàng này. Vui lòng thanh toán trực tuyến."
    ),

    // -------------------------------------------------------------- PAYMENT
    /** Thanh toán thất bại */
    PAYMENT_FAILED(
            HttpStatus.PAYMENT_REQUIRED,
            "Thanh toán không thành công. Vui lòng thử lại hoặc chọn phương thức khác."
    ),
    /** Số tiền thanh toán không khớp */
    PAYMENT_AMOUNT_MISMATCH(
            HttpStatus.BAD_REQUEST,
            "Số tiền thanh toán không khớp. Vui lòng thử lại."
    ),

    // -------------------------------------------------------------- SYSTEM
    /**
     * Lỗi hệ thống không xác định.
     * KHÔNG bao giờ trả về stack trace hay message nội bộ cho client.
     */
    SYSTEM_ERROR(
            HttpStatus.INTERNAL_SERVER_ERROR,
            "Hệ thống đang gặp sự cố. Vui lòng thử lại sau hoặc liên hệ hỗ trợ nếu lỗi vẫn tiếp tục."
    ),
    /** Dịch vụ tạm thời không khả dụng */
    SYSTEM_SERVICE_UNAVAILABLE(
            HttpStatus.SERVICE_UNAVAILABLE,
            "Dịch vụ tạm thời không khả dụng. Vui lòng thử lại sau ít phút."
    ),
    /** Quá nhiều yêu cầu (rate limiting) */
    SYSTEM_TOO_MANY_REQUESTS(
            HttpStatus.TOO_MANY_REQUESTS,
            "Bạn đang thực hiện quá nhiều yêu cầu. Vui lòng chờ một lúc rồi thử lại."
    );

    // -----------------------------------------------------------------------

    private final HttpStatus httpStatus;
    private final String userMessage;

    ApiErrorCode(HttpStatus httpStatus, String userMessage) {
        this.httpStatus = httpStatus;
        this.userMessage = userMessage;
    }

    public HttpStatus getHttpStatus() {
        return httpStatus;
    }

    /** Thông điệp thân thiện trả về cho người dùng (không chứa thông tin nội bộ). */
    public String getUserMessage() {
        return userMessage;
    }
}
