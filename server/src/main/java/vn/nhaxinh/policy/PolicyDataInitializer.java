// package vn.nhaxinh.policy;

// import java.time.LocalDateTime;
// import org.slf4j.Logger;
// import org.slf4j.LoggerFactory;
// import org.springframework.boot.CommandLineRunner;
// import org.springframework.core.annotation.Order;
// import org.springframework.stereotype.Component;
// import org.springframework.transaction.annotation.Transactional;

// @Component
// @Order(12)
// public class PolicyDataInitializer implements CommandLineRunner {

//     private static final Logger log = LoggerFactory.getLogger(PolicyDataInitializer.class);

//     private final PolicyRepository policyRepository;

//     public PolicyDataInitializer(PolicyRepository policyRepository) {
//         this.policyRepository = policyRepository;
//     }

//     @Override
//     @Transactional
//     public void run(String... args) {
//         if (policyRepository.count() > 0) {
//             log.info("[POLICY-INIT] Đã có {} chính sách trong DB, bỏ qua khởi tạo.", policyRepository.count());
//             return;
//         }

//         log.info("[POLICY-INIT] Khởi tạo các chính sách chuẩn của Nhà Xinh...");
//         LocalDateTime now = LocalDateTime.now();

//         // 1. Chính sách đổi trả & hoàn tiền
//         Policy returnPolicy = new Policy();
//         returnPolicy.setTitle("Chính sách đổi trả & hoàn tiền");
//         returnPolicy.setShortTitle("Đổi trả hàng");
//         returnPolicy.setSlug("chinh-sach-doi-tra");
//         returnPolicy.setTemplateType("return");
//         returnPolicy.setIntro("Nhà Xinh cam kết mang lại trải nghiệm mua sắm hài lòng và an tâm nhất với chính sách đổi trả minh bạch, linh hoạt trong vòng 03 ngày.");
//         returnPolicy.setFontFamily("Be Vietnam Pro, sans-serif");
//         returnPolicy.setFontSize("15px");
//         returnPolicy.setLineHeight("1.75");
//         returnPolicy.setAccentColor("#b38e5d");
//         returnPolicy.setStatus("PUBLISHED");
//         returnPolicy.setUpdatedBy("Hệ thống");
//         returnPolicy.setContent("""
//                 <h3>1. Điều kiện áp dụng đổi trả</h3>
//                 <ul>
//                   <li>Sản phẩm còn nguyên tem mác, chứng từ mua hàng và phiếu bảo hành chính hãng của Nhà Xinh.</li>
//                   <li>Sản phẩm không có dấu hiệu bị va đập, trầy xước, dơ bẩn hoặc đã qua can thiệp kỹ thuật bởi bên thứ ba.</li>
//                   <li>Thời gian áp dụng: Trong vòng <strong>03 ngày</strong> kể từ thời điểm bàn giao và nghiệm thu sản phẩm tại nhà.</li>
//                 </ul>
//                 <h3>2. Trường hợp được đổi trả miễn phí</h3>
//                 <ul>
//                   <li>Sản phẩm giao không đúng quy cách, kích thước, mẫu mã hoặc chất liệu theo hợp đồng đã ký kết.</li>
//                   <li>Phát hiện lỗi kỹ thuật từ nhà sản xuất trong quá trình lắp đặt hoàn thiện.</li>
//                 </ul>
//                 <h3>3. Quy trình xử lý và hoàn tiền</h3>
//                 <p>Khách hàng liên hệ hotline chăm sóc khách hàng <strong>0903 884 358</strong> hoặc đến trực tiếp showroom gần nhất. Bộ phận kỹ thuật sẽ tiến hành thẩm định và xử lý đổi mới hoặc hoàn tiền trong vòng <strong>03 - 05 ngày làm việc</strong>.</p>
//                 """);
//         policyRepository.save(returnPolicy);

//         // 2. Chính sách giao nhận & lắp đặt
//         Policy shippingPolicy = new Policy();
//         shippingPolicy.setTitle("Chính sách giao nhận & lắp đặt");
//         shippingPolicy.setShortTitle("Giao nhận & lắp đặt");
//         shippingPolicy.setSlug("chinh-sach-giao-hang");
//         shippingPolicy.setTemplateType("shipping");
//         shippingPolicy.setIntro("Dịch vụ giao nhận và lắp đặt tận nơi chuyên nghiệp bởi đội ngũ kỹ thuật viên lành nghề của Nhà Xinh trên toàn quốc.");
//         shippingPolicy.setFontFamily("Be Vietnam Pro, sans-serif");
//         shippingPolicy.setFontSize("15px");
//         shippingPolicy.setLineHeight("1.75");
//         shippingPolicy.setAccentColor("#b38e5d");
//         shippingPolicy.setStatus("PUBLISHED");
//         shippingPolicy.setUpdatedBy("Hệ thống");
//         shippingPolicy.setContent("""
//                 <h3>1. Phạm vi giao hàng</h3>
//                 <p>Nhà Xinh phục vụ giao hàng và lắp đặt tận nơi trên toàn quốc, bao gồm khu vực nội thành TP.HCM, Hà Nội và các tỉnh thành lân cận.</p>
//                 <h3>2. Phí giao hàng & lắp đặt</h3>
//                 <ul>
//                   <li><strong>Miễn phí giao hàng & lắp ráp</strong> cho đơn hàng từ 10.000.000₫ trong bán kính 30km từ showroom gần nhất.</li>
//                   <li>Đối với đơn hàng ngoại thành hoặc các tỉnh xa, mức phí vận chuyển được tính theo biểu phí ưu đãi của đối tác vận tải chuyên dụng nội thất.</li>
//                 </ul>
//                 <h3>3. Thời gian giao hàng tiêu chuẩn</h3>
//                 <ul>
//                   <li>Hàng có sẵn tại kho: Giao trong vòng <strong>24h - 48h</strong> làm việc.</li>
//                   <li>Hàng đặt sản xuất hoặc hoàn thiện theo yêu cầu (Pre-order): Từ <strong>07 - 14 ngày</strong> làm việc.</li>
//                 </ul>
//                 """);
//         policyRepository.save(shippingPolicy);

//         // 3. Chính sách bảo hành & bảo trì
//         Policy warrantyPolicy = new Policy();
//         warrantyPolicy.setTitle("Chính sách bảo hành & bảo trì");
//         warrantyPolicy.setShortTitle("Bảo hành bảo trì");
//         warrantyPolicy.setSlug("chinh-sach-bao-hanh");
//         warrantyPolicy.setTemplateType("warranty");
//         warrantyPolicy.setIntro("Chế độ bảo hành dài hạn đến 24 tháng cùng dịch vụ bảo trì trọn đời, đồng hành dài lâu cùng tổ ấm của bạn.");
//         warrantyPolicy.setFontFamily("Be Vietnam Pro, sans-serif");
//         warrantyPolicy.setFontSize("15px");
//         warrantyPolicy.setLineHeight("1.75");
//         warrantyPolicy.setAccentColor("#b38e5d");
//         warrantyPolicy.setStatus("PUBLISHED");
//         warrantyPolicy.setUpdatedBy("Hệ thống");
//         warrantyPolicy.setContent("""
//                 <h3>1. Thời hạn bảo hành</h3>
//                 <ul>
//                   <li>Sản phẩm đồ gỗ (bàn, ghế, tủ, giường): Bảo hành <strong>24 tháng</strong> đối với các lỗi cong vênh, mối mọt, co ngót kỹ thuật.</li>
//                   <li>Sản phẩm đệm mút, khung sofa, da & vải bọc cao cấp: Bảo hành <strong>12 tháng</strong> đối với lỗi sụt lún khung hoặc đường may.</li>
//                 </ul>
//                 <h3>2. Dịch vụ bảo trì trọn đời</h3>
//                 <p>Sau thời hạn bảo hành tiêu chuẩn, Nhà Xinh tiếp tục cung cấp dịch vụ bảo trì, đánh bóng và sửa chữa phụ kiện với chi phí ưu đãi dành riêng cho quý khách hàng thân thiết.</p>
//                 """);
//         policyRepository.save(warrantyPolicy);

//         // 4. Chính sách bảo mật thông tin
//         Policy privacyPolicy = new Policy();
//         privacyPolicy.setTitle("Chính sách bảo mật thông tin");
//         privacyPolicy.setShortTitle("Bảo mật thông tin");
//         privacyPolicy.setSlug("chinh-sach-bao-mat");
//         privacyPolicy.setTemplateType("privacy");
//         privacyPolicy.setIntro("Nhà Xinh cam kết tôn trọng và bảo vệ tuyệt đối thông tin riêng tư cá nhân của quý khách hàng khi trải nghiệm dịch vụ.");
//         privacyPolicy.setFontFamily("Be Vietnam Pro, sans-serif");
//         privacyPolicy.setFontSize("15px");
//         privacyPolicy.setLineHeight("1.75");
//         privacyPolicy.setAccentColor("#b38e5d");
//         privacyPolicy.setStatus("PUBLISHED");
//         privacyPolicy.setUpdatedBy("Hệ thống");
//         privacyPolicy.setContent("""
//                 <h3>1. Mục đích thu thập thông tin</h3>
//                 <p>Thông tin của khách hàng (họ tên, số điện thoại, địa chỉ nhận hàng, email) được sử dụng để xử lý đơn hàng, điều phối giao nhận và cung cấp dịch vụ chăm sóc hậu mãi.</p>
//                 <h3>2. Cam kết bảo mật</h3>
//                 <p>Nhà Xinh cam kết không chia sẻ, bán hoặc trao đổi thông tin khách hàng cho bất kỳ bên thứ ba nào vì mục đích thương mại khi chưa có sự đồng ý của khách hàng.</p>
//                 """);
//         policyRepository.save(privacyPolicy);

//         // 5. Điều khoản sử dụng dịch vụ
//         Policy termsPolicy = new Policy();
//         termsPolicy.setTitle("Điều khoản sử dụng dịch vụ");
//         termsPolicy.setShortTitle("Điều khoản sử dụng");
//         termsPolicy.setSlug("dieu-khoan-su-dung");
//         termsPolicy.setTemplateType("terms");
//         termsPolicy.setIntro("Các quy định và hướng dẫn chung khi khách hàng tham quan, giao kết và mua sắm trên hệ thống Nhà Xinh.");
//         termsPolicy.setFontFamily("Be Vietnam Pro, sans-serif");
//         termsPolicy.setFontSize("15px");
//         termsPolicy.setLineHeight("1.75");
//         termsPolicy.setAccentColor("#b38e5d");
//         termsPolicy.setStatus("PUBLISHED");
//         termsPolicy.setUpdatedBy("Hệ thống");
//         termsPolicy.setContent("""
//                 <h3>1. Chấp thuận điều khoản</h3>
//                 <p>Khi truy cập và mua sắm tại website hoặc showroom Nhà Xinh, quý khách mặc nhiên đồng thuận với các điều khoản và quy chế hoạt động được ban hành.</p>
//                 <h3>2. Quyền sở hữu trí tuệ</h3>
//                 <p>Mọi hình ảnh thiết kế, hình ảnh lookbook bộ sưu tập, thương hiệu và nội dung thuộc bản quyền của Nhà Xinh và Công ty Cổ phần Xây dựng Kiến trúc AA.</p>
//                 """);
//         policyRepository.save(termsPolicy);

//         // 6. Chương trình khách hàng thân thiết
//         Policy vipPolicy = new Policy();
//         vipPolicy.setTitle("Chương trình khách hàng thân thiết");
//         vipPolicy.setShortTitle("Khách hàng thân thiết");
//         vipPolicy.setSlug("khach-hang-than-thiet");
//         vipPolicy.setTemplateType("vip");
//         vipPolicy.setIntro("Hệ thống hạng thành viên Nhà Xinh VIP với nhiều đặc quyền mua sắm, tích lũy điểm và ưu đãi thiết kế độc quyền.");
//         vipPolicy.setFontFamily("Be Vietnam Pro, sans-serif");
//         vipPolicy.setFontSize("15px");
//         vipPolicy.setLineHeight("1.75");
//         vipPolicy.setAccentColor("#b38e5d");
//         vipPolicy.setStatus("PUBLISHED");
//         vipPolicy.setUpdatedBy("Hệ thống");
//         vipPolicy.setContent("""
//                 <h3>1. Các hạng thẻ thành viên</h3>
//                 <ul>
//                   <li><strong>Silver Member:</strong> Tích lũy chi tiêu từ 50.000.000₫ — Ưu đãi giảm 5% cho tất cả đơn hàng sau.</li>
//                   <li><strong>Gold Member:</strong> Tích lũy chi tiêu từ 150.000.000₫ — Ưu đãi giảm 8% cùng quà tặng sinh nhật đặc biệt.</li>
//                   <li><strong>Diamond VIP:</strong> Tích lũy chi tiêu từ 300.000.000₫ — Ưu đãi giảm 12% và miễn phí gói tư vấn thiết kế nội thất toàn diện.</li>
//                 </ul>
//                 """);
//         policyRepository.save(vipPolicy);

//         log.info("[POLICY-INIT] Đã khởi tạo thành công 6 chính sách mặc định của Nhà Xinh.");
//     }
// }

