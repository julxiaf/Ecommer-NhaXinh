// package vn.nhaxinh.system;

// import org.slf4j.Logger;
// import org.slf4j.LoggerFactory;
// import org.springframework.boot.CommandLineRunner;
// import org.springframework.core.annotation.Order;
// import org.springframework.stereotype.Component;
// import org.springframework.transaction.annotation.Transactional;

// @Component
// @Order(13)
// public class SystemConfigDataInitializer implements CommandLineRunner {

//     private static final Logger log = LoggerFactory.getLogger(SystemConfigDataInitializer.class);

//     private final SystemConfigRepository systemConfigRepository;

//     public SystemConfigDataInitializer(SystemConfigRepository systemConfigRepository) {
//         this.systemConfigRepository = systemConfigRepository;
//     }

//     @Override
//     @Transactional
//     public void run(String... args) {
//         if (systemConfigRepository.count() > 0) {
//             log.info("[SYSTEM-CONFIG-INIT] Đã có cấu hình trong DB, bỏ qua khởi tạo.");
//             return;
//         }

//         log.info("[SYSTEM-CONFIG-INIT] Khởi tạo cấu hình CMS Nhà Xinh vào Database Server...");

//         // 1. Menu điều hướng chuẩn
//         String navMenuJson = """
//                 [
//                   {"id":"nav-1-san-pham-moi","label":"Sản phẩm mới","to":"/san-pham-moi","kind":"link","isVisible":true,"order":1},
//                   {"id":"nav-2-san-pham","label":"Sản phẩm","to":"/san-pham","kind":"products","isVisible":true,"order":2},
//                   {"id":"nav-3-phong","label":"Phòng","to":"/phong","kind":"rooms","isVisible":true,"order":3},
//                   {"id":"nav-4-bo-suu-tap","label":"Bộ sưu tập","to":"/bo-suu-tap","kind":"link","isVisible":true,"order":4},
//                   {"id":"nav-5-thuong-hieu","label":"Thương hiệu","to":"/thuong-hieu","kind":"brands","isVisible":true,"order":5},
//                   {"id":"nav-6-tu-van-thiet-ke","label":"Tư vấn thiết kế","to":"/tu-van-thiet-ke","kind":"link","isVisible":true,"order":6},
//                   {"id":"nav-7-goc-cam-hung","label":"Góc cảm hứng","to":"/bai-viet","kind":"link","isVisible":true,"order":7}
//                 ]
//                 """.trim();

//         SystemConfig navConfig = new SystemConfig("navigation_menu", navMenuJson, "JSON", "Client Navigation Menu");
//         systemConfigRepository.save(navConfig);

//         // 2. Hero Banners chính thức
//         String bannersJson = """
//                 [
//                   {
//                     "id":"banner-official-1",
//                     "title":"Không Gian Sống Tinh Tế & Hiện Đại",
//                     "subtitle":"BỘ SƯU TẬP MỚI 2026",
//                     "description":"Đường nét tinh giản, chất liệu gỗ tự nhiên bền vững mang đậm dấu ấn phong cách sống Nhà Xinh.",
//                     "backgroundImage":"https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1400&q=80",
//                     "mediaType":"image",
//                     "videoUrl":"",
//                     "actions":[{"label":"Khám phá ngay","url":"/san-pham","isPrimary":true}],
//                     "isActive":true,
//                     "order":1
//                   }
//                 ]
//                 """.trim();

//         SystemConfig bannerConfig = new SystemConfig("hero_banners", bannersJson, "JSON", "Client Home Hero Banners");
//         systemConfigRepository.save(bannerConfig);

//         // 3. Pandora Suggestion Config
//         String pandoraJson = """
//                 {
//                   "isEnabled": true,
//                   "badgeTitle": "PANDORA EXCLUSIVE",
//                   "mainTitle": "Gợi Ý Không Gian Tinh Tế Dành Riêng Cho Bạn",
//                   "subtitle": "Tuyển tập thiết kế nội thất mang linh hồn nghệ thuật Pandora.",
//                   "bannerImage": "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=1200&q=80",
//                   "curatedTagFilter": ["Tất cả", "Sofa", "Bàn", "Ghế", "Giường", "Tủ"],
//                   "apiLimit": 8,
//                   "products": []
//                 }
//                 """.trim();

//         SystemConfig pandoraConfig = new SystemConfig("pandora_config", pandoraJson, "JSON", "Client Pandora Suggestion Config");
//         systemConfigRepository.save(pandoraConfig);

//         log.info("[SYSTEM-CONFIG-INIT] Hoàn tất khởi tạo 3 cấu hình CMS vào Database.");
//     }
// }

