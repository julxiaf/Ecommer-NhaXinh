package vn.nhaxinh.coupon;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface CouponUsageRepository extends JpaRepository<CouponUsage, Long> {

    Optional<CouponUsage> findByOrderId(Long orderId);

    List<CouponUsage> findByUserId(Long userId);

    long countByCouponIdAndUserId(Long couponId, Long userId);

    long countByCouponId(Long couponId);
}
