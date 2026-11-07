package vn.nhaxinh.coupon;

import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1")
public class AdminCouponController {

    private final CouponService couponService;

    public AdminCouponController(CouponService couponService) {
        this.couponService = couponService;
    }

    @GetMapping("/admin/coupons")
    public List<CouponDTO> getAllCoupons() {
        return couponService.findAllDTOs();
    }

    @PostMapping("/admin/coupons")
    public ResponseEntity<CouponDTO> createCoupon(@RequestBody CouponDTO dto) {
        CouponDTO created = couponService.saveFromDTO(dto);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PutMapping("/admin/coupons/{id}")
    public ResponseEntity<CouponDTO> updateCoupon(
            @PathVariable Long id,
            @RequestBody CouponDTO dto
    ) {
        CouponDTO merged = new CouponDTO(
                id,
                dto.code(),
                dto.name(),
                dto.description(),
                dto.discountType(),
                dto.discountValue(),
                dto.minOrderAmount(),
                dto.maxDiscountAmount(),
                dto.usageLimit(),
                dto.usagePerUser(),
                dto.usedCount(),
                dto.startsAt(),
                dto.endsAt(),
                dto.status(),
                dto.targetCustomer(),
                dto.scopeType(),
                dto.applicableCollections(),
                dto.applicableCategories(),
                dto.applicableProductIds(),
                dto.createdAt(),
                dto.updatedAt()
        );
        CouponDTO updated = couponService.saveFromDTO(merged);
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/admin/coupons/{id}")
    public ResponseEntity<Void> deleteCoupon(@PathVariable Long id) {
        couponService.deleteCoupon(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/coupons/public")
    public List<CouponDTO> getPublicCoupons() {
        return couponService.findActivePublicCoupons();
    }
}

