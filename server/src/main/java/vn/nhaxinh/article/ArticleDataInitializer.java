// package vn.nhaxinh.article;

// import org.slf4j.Logger;
// import org.slf4j.LoggerFactory;
// import org.springframework.boot.CommandLineRunner;
// import org.springframework.core.annotation.Order;
// import org.springframework.stereotype.Component;

// @Component
// @Order(10)
// public class ArticleDataInitializer implements CommandLineRunner {

//     private static final Logger log = LoggerFactory.getLogger(ArticleDataInitializer.class);
//     private final ArticleRepository articleRepository;

//     public ArticleDataInitializer(ArticleRepository articleRepository) {
//         this.articleRepository = articleRepository;
//     }

//     @Override
//     public void run(String... args) {
//         log.info("[ARTICLE] Kiểm tra và khởi tạo dữ liệu bài viết bộ sưu tập...");

//         // 1. Bộ sưu tập Victoria
//         saveIfAbsent(
//                 "bo-suu-tap-victoria-kiet-tac-tan-co-dien",
//                 "Bộ Sưu Tập Victoria: Kiệt tác thanh lịch từ cảm hứng tân cổ điển châu Âu",
//                 "Bộ sưu tập",
//                 "victoria",
//                 "KTS. Lê Quang Huy",
//                 5420L,
//                 "published",
//                 "/uploads/collections/victoria.webp",
//                 "Bộ sưu tập Victoria tôn vinh nghệ thuật chế tác thủ công tinh xảo với những đường may rút múi truyền thống, chất liệu da bò Ý mềm mại và khung gỗ tần bì ấm áp cho không gian phòng khách đẳng cấp.",
//                 "<h2>Cảm hứng thiết kế từ di sản châu Âu</h2><p>Bộ sưu tập <strong>Victoria</strong> được Nhà Xinh kiến tạo từ niềm đam mê với những đường nét tân cổ điển quý phái. Từng chi tiết chạm khắc tinh tế, tỉ lệ cân đối hoàn mỹ giữa khung gỗ tần bì và lớp đệm bọc da bò thượng hạng.</p><blockquote>Vẻ đẹp thanh lịch vượt thời gian là linh hồn của bộ sưu tập Victoria, nơi mỗi món đồ đều mang câu chuyện về sự chỉn chu và xa hoa thầm lặng.</blockquote><h3>Chất liệu chủ đạo</h3><ul><li><strong>Da bò Ý cao cấp:</strong> Thuộc thủ công tại Tuscany, giữ trọn vẹn vân da tự nhiên và độ mềm mịn tuyệt đối.</li><li><strong>Gỗ tần bì tự nhiên:</strong> Được tẩm sấy công nghệ châu Âu, chống cong vênh và kháng ẩm hoàn hảo.</li><li><strong>Đá Marble Carrara:</strong> Vân mây xám tự nhiên trên nền trắng sứ sang trọng.</li></ul>"
//         );

//         // 2. Bộ sưu tập Nét Đương Đại
//         saveIfAbsent(
//                 "bo-suu-tap-net-duong-dai-toi-gian-cong-nang",
//                 "Bộ Sưu Tập Nét Đương Đại: Tối giản đường nét, tối đa công năng sống",
//                 "Bộ sưu tập",
//                 "net-duong-dai",
//                 "Ban Biên Tập Nhà Xinh",
//                 4190L,
//                 "published",
//                 "/uploads/collections/net-duong-dai.jpg",
//                 "Lấy cảm hứng từ nhịp sống năng động tại các đô thị lớn, Nét Đương Đại mang đến những thiết kế gọn gàng, tỷ lệ chuẩn xác và bảng màu trung tính sang trọng dễ dàng phối hợp mọi không gian.",
//                 "<h2>Tự do và phóng khoáng trong không gian hiện đại</h2><p><strong>Nét Đương Đại</strong> là câu trả lời hoàn hảo cho lối sống thành thị: không rườm rà, tập trung vào trải nghiệm xúc giác và sự tiện nghi tối ưu.</p><h3>Điểm nhấn chất liệu</h3><ul><li><strong>Vải nỉ Bouclé Bỉ:</strong> Sợi dệt xù độc đáo tạo cảm giác êm ái, bồng bềnh và ấm áp.</li><li><strong>Gỗ sồi hun khói:</strong> Tông màu nâu xám trầm ấm, tôn lên đường nét kỷ hà mạch lạc.</li><li><strong>Kim loại sơn tĩnh điện:</strong> Khung thanh mảnh nhưng chịu lực vượt trội.</li></ul>"
//         );

//         // 3. Bộ sưu tập Coastal Living (Khớp chính xác với URL http://.../bo-suu-tap/coastal-living)
//         saveIfAbsent(
//                 "bo-suu-tap-coastal-living-hoi-tho-nhiet-doi",
//                 "Bộ Sưu Tập Coastal Living: Hơi thở miền nhiệt đới phóng khoáng và ánh sáng tự nhiên",
//                 "Bộ sưu tập",
//                 "coastal-living",
//                 "KTS. Đặng Thanh Tùng",
//                 6250L,
//                 "published",
//                 "/uploads/collections/coastal-living.jpg",
//                 "Mang cảm giác nghỉ dưỡng resort 5 sao vào ngôi nhà của bạn với bảng màu kem sáng, xanh biển nhạt cùng chất liệu gỗ Teak ấm áp, đón trọn ánh sáng và gió tự nhiên.",
//                 "<h2>Tận hưởng kỳ nghỉ dưỡng ngay trong chính ngôi nhà bạn</h2><p>Bộ sưu tập <strong>Coastal Living</strong> được thiết kế dành riêng cho những ai yêu thích vẻ đẹp tự nhiên, khoáng đạt và bình yên của biển cả. Sự kết hợp giữa gỗ Teak tự nhiên, vải Linen mộc mạc và đá cẩm thạch mang đến một không gian tràn ngập năng lượng thư thái.</p><blockquote>Coastal Living không chỉ là nội thất, mà là phong cách sống tận hưởng trọn vẹn từng khoảnh khắc bình yên bên gia đình.</blockquote><h3>Chất liệu và bảng màu đặc trưng</h3><ul><li><strong>Gỗ Teak tự nhiên:</strong> Kháng nước tuyệt hảo, vân gỗ óng ả và độ bền vĩnh cửu theo thời gian.</li><li><strong>Vải Linen màu cát biển:</strong> Dệt thủ công từ sợi lanh tự nhiên, mềm mại và thoáng khí.</li><li><strong>Đá tự nhiên:</strong> Bề mặt mài mờ mộc mạc, lưu giữ dấu ấn của thiên nhiên.</li></ul>"
//         );

//         // 4. Bộ sưu tập Osaka (Japandi)
//         saveIfAbsent(
//                 "bo-suu-tap-osaka-japandi-tinh-tai",
//                 "Bộ Sưu Tập Osaka (Japandi): Sự giao thoa tĩnh tại giữa triết lý Wabi-Sabi & Bắc Âu",
//                 "Bộ sưu tập",
//                 "osaka",
//                 "KTS. Mori Kenzo & Nhà Xinh",
//                 3910L,
//                 "published",
//                 "/uploads/collections/osaka.jpg",
//                 "Osaka là bản giao hưởng nhẹ nhàng của gỗ tự nhiên sáng màu, đường cong bo tròn an toàn và chất liệu vải Linen thoáng mát, kiến tạo tổ ấm bình yên sau mỗi ngày làm việc.",
//                 "<h2>Nét đẹp của sự mộc mạc và an yên</h2><p>Lấy cảm hứng từ phong cách <strong>Japandi</strong>, bộ sưu tập Osaka kết hợp sự tối giản tinh tế của Nhật Bản và tính công năng ấm áp của Scandinavia.</p><h3>Vật liệu tuyển chọn</h3><ul><li><strong>Gỗ sồi trắng tự nhiên:</strong> Xử lý bề mặt mờ nhám nguyên bản.</li><li><strong>Mây đan mắt cáo:</strong> Thủ công tỉ mỉ cho phần tựa lưng và cánh tủ.</li><li><strong>Vải Linen hữu cơ:</strong> Thân thiện với làn da và môi trường.</li></ul>"
//         );

//         // 5. Bộ sưu tập Mây
//         saveIfAbsent(
//                 "bo-suu-tap-may-giao-thoa-truyen-thong-hien-dai",
//                 "Bộ Sưu Tập Mây: Sự giao thoa giữa thủ công truyền thống và nội thất hiện đại",
//                 "Bộ sưu tập",
//                 "may",
//                 "Nghệ nhân Nguyễn Văn Thành",
//                 3820L,
//                 "published",
//                 "/uploads/collections/may.jpg",
//                 "Khai thác chất liệu mây tre tự nhiên thân thiện với môi trường, bộ sưu tập Mây đem lại cảm giác mộc mạc, thư thái như một kỳ nghỉ dưỡng nhiệt đới ngay trong ngôi nhà bạn.",
//                 "<h2>Hơi thở thiên nhiên trong kiến trúc hiện đại</h2><p>Bộ sưu tập <strong>Mây</strong> sử dụng mây tự nhiên được tuyển chọn kỹ lưỡng, đan lát tỉ mỉ dưới bàn tay của các nghệ nhân làng nghề truyền thống.</p><p>Mỗi chi tiết đan mắt cáo đều phản chiếu ánh sáng tự nhiên, mang lại sự thông thoáng tuyệt đối cho phòng khách và góc thư giãn.</p>"
//         );

//         // 5b. Bộ sưu tập Hùng King (Khớp chính xác với URL https://nhaxinh.com/bst-hung-king-gia-tri-truyen-thong-net-dep-hien-dai/)
//         saveIfAbsent(
//                 "bst-hung-king-gia-tri-truyen-thong-net-dep-hien-dai",
//                 "BST Hùng King: Giá trị truyền thống – Nét đẹp hiện đại (Sử Việt – Nhà Nay)",
//                 "Bộ sưu tập",
//                 "hung-king",
//                 "KTS. Lê Quang Huy & Ban Thiết Kế Nhà Xinh",
//                 4860L,
//                 "published",
//                 "/uploads/collections/hero-lookbook.jpg",
//                 "Bộ sưu tập Hùng King tái hiện những đường nét kiến trúc và giá trị văn hóa ngàn năm của người Việt, tạo nên sự giao thoa độc đáo giữa quá khứ và hiện tại với phom dáng vững chãi, thanh lịch.",
//                 "<h2>Sử Việt – Nhà Nay: Khi giá trị ngàn năm hòa vào nhịp sống hiện đại</h2><p>Bộ sưu tập <strong>Hùng King</strong> là bản tuyên ngôn đầy tự hào của Nhà Xinh về bản sắc thiết kế Việt Nam. Không sao chép nguyên bản nét cổ, các kiến trúc sư đã tinh gọn những đường nét kỷ hà truyền thống vào các hình khối nội thất thanh thoát, hiện đại và chuẩn công năng.</p><blockquote>Hùng King không đơn thuần là nội thất, mà là sự tôn vinh cội nguồn và gu thẩm mỹ đỉnh cao của gia chủ trong không gian sống đương đại.</blockquote><h3>Chất liệu & Điểm nhấn chế tác</h3><ul><li><strong>Gỗ Beech (Dẻ gai) tự nhiên:</strong> Được tuyển chọn khắt khe với thớ gỗ dẻo dai, vân mịn màng và độ bền cơ học cao.</li><li><strong>Kỹ thuật xử lý màu trầm ấm:</strong> Tông màu nâu ấm áp của gỗ tự nhiên gợi nhớ sắc màu của đền đài, mái đình cổ kính nhưng tinh tế cho nhà phố, biệt thự.</li><li><strong>Sofa & Armchair Hùng King:</strong> Tay vịn vững chãi, đệm bọc vải dệt cao cấp êm ái tạo tâm điểm bề thế cho phòng khách.</li></ul>"
//         );

//         // 5c. Bộ sưu tập Victoria (Khớp chính xác với URL https://nhaxinh.com/bo-suu-tap-victoria-3/)
//         saveIfAbsent(
//                 "bo-suu-tap-victoria-3",
//                 "Bộ sưu tập Victoria: Từ cảm hứng miền quê Pháp đến cảm xúc ngôi nhà Việt",
//                 "Bộ sưu tập",
//                 "victoria",
//                 "Ban Biên Tập Nhà Xinh",
//                 6150L,
//                 "published",
//                 "/uploads/collections/victoria.webp",
//                 "Lấy cảm hứng giao thoa giữa vùng quê Pháp lãng mạn và hoa văn truyền thống Việt, BST Victoria đáp ứng trọn vẹn 3 không gian chính: Phòng khách, Phòng ăn và Phòng ngủ với chất liệu gỗ Ash tự nhiên chạm trổ thủ công.",
//                 "<h2>Vẻ đẹp giao thoa giữa lãng mạn phương Tây và tâm hồn Việt</h2><p>Bộ sưu tập <strong>Victoria</strong> của Nhà Xinh là một trong những dòng sản phẩm kinh điển được yêu thích nhất. Với sự kết hợp tài hoa giữa đường cong mềm mại của phong cách tân cổ điển Pháp và các chi tiết chạm tay tinh tế của nghệ nhân Việt, Victoria biến mọi không gian thành một tác phẩm nghệ thuật ấm cúng.</p><blockquote>Victoria là bản hòa tấu của sự thanh lịch, quý phái nhưng không xa lạ mà vô cùng ấm áp, gắn kết trọn vẹn các thành viên trong gia đình.</blockquote><h3>Đồng bộ trọn vẹn 3 không gian sống</h3><ul><li><strong>Không gian Phòng khách:</strong> Sofa 3 chỗ & Armchair bọc da thượng hạng, bàn nước hai tầng chạm hoa văn thủ công, tủ TV dáng thấp và bàn console thanh mảnh.</li><li><strong>Không gian Phòng ăn:</strong> Bộ bàn ăn gỗ Ash tự nhiên ấm cúng kết hợp ghế ăn bọc đệm êm ái cho những bữa cơm đoàn viên.</li><li><strong>Không gian Phòng ngủ:</strong> Giường ngủ phom dáng tao nhã, bàn đầu giường và bàn trang điểm đồng điệu màu sắc.</li></ul>"
//         );

//         // 6. Bài viết xu hướng
//         saveIfAbsent(
//                 "xu-huong-noi-that-phong-khach-scandinavian-2026",
//                 "Xu hướng nội thất phòng khách Scandinavian 2026: Tối giản mà ấm cúng",
//                 "Xu hướng nội thất",
//                 null,
//                 "KTS. Lê Quang Huy",
//                 4520L,
//                 "published",
//                 "/uploads/collections/hero-lookbook.jpg",
//                 "Khám phá cách kết hợp giữa chất liệu gỗ sồi tự nhiên, màu sắc nhã nhặn và ánh sáng tự nhiên để tạo nên không gian sống lý tưởng.",
//                 "<h2>Scandinavian 2026: Trở về với bình yên</h2><p>Phong cách Bắc Âu luôn giữ vị thế hàng đầu trong thiết kế không gian hiện đại. Năm 2026, xu hướng này được nâng tầm với các vật liệu bền vững và ánh sáng dịu nhẹ.</p>"
//         );

//         // 7. Cẩm nang bảo quản
//         saveIfAbsent(
//                 "cam-nang-cham-soc-va-bao-duong-sofa-da-bo-y",
//                 "Cẩm nang chăm sóc và bảo dưỡng sofa da bò Ý nhập khẩu bền đẹp 10 năm",
//                 "Cẩm nang bảo quản",
//                 null,
//                 "Chuyên gia Nhà Xinh",
//                 2890L,
//                 "published",
//                 "/uploads/collections/victoria.webp",
//                 "Hướng dẫn các bước lau sạch bụi bẩn, thoa kem dưỡng da định kỳ và tránh những sai lầm phổ biến khi dùng sofa da.",
//                 "<h2>Quy trình bảo dưỡng sofa da định kỳ</h2><p>Chất liệu da bò thật mang đến sự đẳng cấp, tuy nhiên cần được dưỡng ẩm định kỳ bằng dung dịch chuyên dụng mỗi 6 tháng một lần để giữ độ mềm và chống nứt nẻ.</p>"
//         );

//         log.info("[ARTICLE] Dữ liệu bài viết bộ sưu tập đã sẵn sàng.");
//     }

//     private void saveIfAbsent(
//             String slug,
//             String title,
//             String category,
//             String collectionSlug,
//             String author,
//             Long views,
//             String status,
//             String image,
//             String summary,
//             String content
//     ) {
//         if (articleRepository.findBySlug(slug).isPresent()) {
//             return;
//         }
//         Article art = new Article();
//         art.setSlug(slug);
//         art.setTitle(title);
//         art.setCategory(category);
//         art.setCollectionSlug(collectionSlug);
//         art.setAuthor(author);
//         art.setViews(views);
//         art.setStatus(status);
//         art.setImage(image);
//         art.setSummary(summary);
//         art.setContent(content);
//         art.setIsDeleted(false);
//         articleRepository.save(art);
//     }
// }
