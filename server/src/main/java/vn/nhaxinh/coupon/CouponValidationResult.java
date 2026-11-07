package vn.nhaxinh.coupon;

public record CouponValidationResult(
        boolean valid,
        String message,
        Coupon coupon
) {
    public static CouponValidationResult ok(Coupon coupon) {
        return new CouponValidationResult(true, "Mã giảm giá hợp lệ.", coupon);
    }

    public static CouponValidationResult error(String message) {
        return new CouponValidationResult(false, message, null);
    }
}

