package vn.nhaxinh.coupon;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.nhaxinh.user.User;

@Service
@Transactional
public class CouponService {

    private final CouponRepository couponRepository;
    private final CouponUsageRepository usageRepository;

    public CouponService(CouponRepository couponRepository, CouponUsageRepository usageRepository) {
        this.couponRepository = couponRepository;
        this.usageRepository = usageRepository;
    }

    @Transactional(readOnly = true)
    public List<Coupon> findAll() {
        return couponRepository.findAll();
    }

    @Transactional(readOnly = true)
    public Optional<Coupon> findByCode(String code) {
        return couponRepository.findByCode(code);
    }

    @Transactional(readOnly = true)
    public Optional<Coupon> validateCoupon(String code, BigDecimal orderAmount, Long userId) {
        Optional<Coupon> opt = couponRepository.findByCode(code);
        if (opt.isEmpty()) {
            return Optional.empty();
        }
        Coupon coupon = opt.get();
        if (!coupon.isValidNow()) {
            return Optional.empty();
        }
        if (coupon.getMinOrderAmount() != null && orderAmount.compareTo(coupon.getMinOrderAmount()) < 0) {
            return Optional.empty();
        }
        if (coupon.getUsageLimit() != null && usageRepository.countByCouponId(coupon.getId()) >= coupon.getUsageLimit()) {
            return Optional.empty();
        }
        if (userId != null && coupon.getUsagePerUser() != null
                && usageRepository.countByCouponIdAndUserId(coupon.getId(), userId) >= coupon.getUsagePerUser()) {
            return Optional.empty();
        }
        return Optional.of(coupon);
    }

    public Coupon save(Coupon coupon) {
        return couponRepository.save(coupon);
    }

    public CouponUsage recordUsage(Coupon coupon, User user, Long orderId, BigDecimal discountAmount) {
        return usageRepository.save(new CouponUsage(coupon, user, orderId, discountAmount));
    }
}
