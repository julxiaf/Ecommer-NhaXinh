// package vn.nhaxinh.coupon;

// import java.math.BigDecimal;
// import java.time.LocalDateTime;
// import org.slf4j.Logger;
// import org.slf4j.LoggerFactory;
// import org.springframework.boot.CommandLineRunner;
// import org.springframework.core.annotation.Order;
// import org.springframework.stereotype.Component;
// import org.springframework.transaction.annotation.Transactional;

// @Component
// @Order(10)
// public class CouponDataInitializer implements CommandLineRunner {

//     private static final Logger log = LoggerFactory.getLogger(CouponDataInitializer.class);

//     private final CouponRepository couponRepository;

//     public CouponDataInitializer(CouponRepository couponRepository) {
//         this.couponRepository = couponRepository;
//     }

//     @Override
//     @Transactional
//     public void run(String... args) {
//         if (couponRepository.count() > 0) {
//             log.info("[COUPON-INIT] Đã có {} mã giảm giá trong DB, bỏ qua khởi tạo.", couponRepository.count());
//             return;
//         }

//         log.info("[COUPON-INIT] Khởi tạo các mã giảm giá mẫu chuẩn...");
//         LocalDateTime now = LocalDateTime.now();

//         // 1. Mã người mới đăng ký (thanh toán lần đầu)
//         Coupon newUserCoupon = new Coupon();
//         newUserCoupon.setCode("NEWUSER15");
//         newUserCoupon.setName("Giảm 15% Cho Thành Viên Mới");
//         newUserCoupon.setDescription("Ưu đãi đặc biệt giảm 15% tối đa 1.000.000₫ cho khách hàng mới đăng ký, áp dụng đơn hàng đầu tiên.");
//         newUserCoupon.setDiscountType("PERCENT");
//         newUserCoupon.setDiscountValue(new BigDecimal("15"));
//         newUserCoupon.setMinOrderAmount(new BigDecimal("2000000"));
//         newUserCoupon.setMaxDiscountAmount(new BigDecimal("1000000"));
//         newUserCoupon.setUsageLimit(1000);
//         newUserCoupon.setUsagePerUser(1);
//         newUserCoupon.setTargetCustomer("FIRST_ORDER");
//         newUserCoupon.setScopeType("ALL");
//         newUserCoupon.setStartsAt(now.minusDays(1));
//         newUserCoupon.setEndsAt(now.plusMonths(6));
//         newUserCoupon.setStatus("ACTIVE");
//         couponRepository.save(newUserCoupon);

//         // 2. Mã theo Bộ sưu tập Victoria
//         Coupon victoriaCoupon = new Coupon();
//         victoriaCoupon.setCode("VICTORIA10");
//         victoriaCoupon.setName("Ưu đãi Bộ sưu tập Victoria 10%");
//         victoriaCoupon.setDescription("Giảm 10% tối đa 3.000.000₫ cho toàn bộ sản phẩm thuộc BST Victoria.");
//         victoriaCoupon.setDiscountType("PERCENT");
//         victoriaCoupon.setDiscountValue(new BigDecimal("10"));
//         victoriaCoupon.setMinOrderAmount(new BigDecimal("5000000"));
//         victoriaCoupon.setMaxDiscountAmount(new BigDecimal("3000000"));
//         victoriaCoupon.setUsageLimit(200);
//         victoriaCoupon.setUsagePerUser(2);
//         victoriaCoupon.setTargetCustomer("ALL");
//         victoriaCoupon.setScopeType("COLLECTION");
//         victoriaCoupon.setApplicableCollections("victoria");
//         victoriaCoupon.setStartsAt(now.minusDays(1));
//         victoriaCoupon.setEndsAt(now.plusMonths(3));
//         victoriaCoupon.setStatus("ACTIVE");
//         couponRepository.save(victoriaCoupon);

//         // 3. Mã giảm theo tiền mặt & theo ngày trong tháng
//         Coupon weekendCoupon = new Coupon();
//         weekendCoupon.setCode("WEEKEND500");
//         weekendCoupon.setName("Voucher Mua Sắm 500.000₫");
//         weekendCoupon.setDescription("Tặng ngay 500.000₫ cho đơn hàng nội thất từ 10.000.000₫ trong tháng này.");
//         weekendCoupon.setDiscountType("FIXED");
//         weekendCoupon.setDiscountValue(new BigDecimal("500000"));
//         weekendCoupon.setMinOrderAmount(new BigDecimal("10000000"));
//         weekendCoupon.setMaxDiscountAmount(new BigDecimal("500000"));
//         weekendCoupon.setUsageLimit(300);
//         weekendCoupon.setUsagePerUser(1);
//         weekendCoupon.setTargetCustomer("ALL");
//         weekendCoupon.setScopeType("ALL");
//         weekendCoupon.setStartsAt(now.minusDays(2));
//         weekendCoupon.setEndsAt(now.plusMonths(1));
//         weekendCoupon.setStatus("ACTIVE");
//         couponRepository.save(weekendCoupon);

//         // 4. Mã Freeship toàn quốc
//         Coupon freeShipCoupon = new Coupon();
//         freeShipCoupon.setCode("FREESHIP");
//         freeShipCoupon.setName("Miễn Phí Vận Chuyển Toàn Quốc");
//         freeShipCoupon.setDescription("Miễn phí vận chuyển và lắp đặt tận nhà cho đơn hàng từ 3.000.000₫.");
//         freeShipCoupon.setDiscountType("FREESHIP");
//         freeShipCoupon.setDiscountValue(BigDecimal.ZERO);
//         freeShipCoupon.setMinOrderAmount(new BigDecimal("3000000"));
//         freeShipCoupon.setUsageLimit(500);
//         freeShipCoupon.setUsagePerUser(5);
//         freeShipCoupon.setTargetCustomer("ALL");
//         freeShipCoupon.setScopeType("ALL");
//         freeShipCoupon.setStartsAt(now.minusDays(1));
//         freeShipCoupon.setEndsAt(now.plusYears(1));
//         freeShipCoupon.setStatus("ACTIVE");
//         couponRepository.save(freeShipCoupon);

//         log.info("[COUPON-INIT] Khởi tạo thành công 4 mã giảm giá mẫu vào cơ sở dữ liệu.");
//     }
// }

