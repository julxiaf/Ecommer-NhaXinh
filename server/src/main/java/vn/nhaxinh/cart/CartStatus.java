package vn.nhaxinh.cart;

/**
 * Trạng thái vòng đời của giỏ hàng.
 */
public enum CartStatus {
    /** Giỏ hàng đang hoạt động, có thể thêm/sửa/xóa sản phẩm. */
    ACTIVE,

    /** Giỏ hàng đã chuyển đổi thành đơn hàng (thanh toán hoàn tất hoặc gộp giỏ). */
    CONVERTED,

    /** Giỏ hàng đã hoàn tất checkout. */
    CHECKED_OUT,

    /** Giỏ hàng bị bỏ quên. */
    ABANDONED;

    public boolean isActive() {
        return this == ACTIVE;
    }
}

