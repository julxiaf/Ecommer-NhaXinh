package vn.nhaxinh.coupon;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record CouponDTO(
        Long id,
        String code,
        String name,
        String description,
        String discountType,
        BigDecimal discountValue,
        BigDecimal minOrderAmount,
        BigDecimal maxDiscountAmount,
        Integer usageLimit,
        Integer usagePerUser,
        Long usedCount,
        LocalDateTime startsAt,
        LocalDateTime endsAt,
        String status,
        String targetCustomer,
        String scopeType,
        String applicableCollections,
        String applicableCategories,
        String applicableProductIds,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
    public CouponDTO {
        if (targetCustomer == null || targetCustomer.isBlank()) {
            targetCustomer = "ALL";
        }
        if (scopeType == null || scopeType.isBlank()) {
            scopeType = "ALL";
        }
        if (discountType == null || discountType.isBlank()) {
            discountType = "PERCENT";
        }
        if (status == null || status.isBlank()) {
            status = "ACTIVE";
        }
    }
}

