// package vn.nhaxinh.catalog;

// import java.util.List;
// import java.util.Optional;
// import org.slf4j.Logger;
// import org.slf4j.LoggerFactory;
// import org.springframework.boot.CommandLineRunner;
// import org.springframework.core.annotation.Order;
// import org.springframework.stereotype.Component;
// import org.springframework.transaction.annotation.Transactional;

// @Component
// @Order(8)
// public class CategoryDataInitializer implements CommandLineRunner {

//     private static final Logger log = LoggerFactory.getLogger(CategoryDataInitializer.class);
//     private final CategoryRepository categoryRepository;

//     public CategoryDataInitializer(CategoryRepository categoryRepository) {
//         this.categoryRepository = categoryRepository;
//     }

//     @Override
//     @Transactional
//     public void run(String... args) {
//         log.info("[CATEGORY-INIT] Kiểm tra và cập nhật category_group cho các danh mục...");
//         List<Category> allCategories = categoryRepository.findAll();

//         boolean anyUpdated = false;
//         for (Category cat : allCategories) {
//             String nameLower = (cat.getName() != null ? cat.getName() : "").trim().toLowerCase();
//             String slugLower = (cat.getSlug() != null ? cat.getSlug() : "").trim().toLowerCase();
//             String currentGroup = cat.getCategoryGroup();
//             String targetGroup = null;

//             // 1. Phân loại Không gian phòng (ROOM)
//             if (nameLower.startsWith("phòng ") || nameLower.startsWith("phong ")
//                     || slugLower.startsWith("phong-") || slugLower.equals("ngoai-that") || slugLower.equals("bep")) {
//                 targetGroup = "ROOM";
//             }
//             // 2. Phân loại Bộ sưu tập (COLLECTION)
//             else if (nameLower.contains("bộ sưu tập") || nameLower.contains("bo suu tap")
//                     || slugLower.contains("bo-suu-tap") || slugLower.contains("bst-")
//                     || slugLower.contains("victoria") || slugLower.contains("duong-dai")
//                     || slugLower.contains("osaka") || slugLower.contains("coastal") || slugLower.contains("hung-king")) {
//                 targetGroup = "COLLECTION";
//             }
//             // 3. Phân loại Trang tĩnh / Chân trang (PAGE / STATIC)
//             else if (slugLower.contains("gioi-thieu") || slugLower.contains("tuyen-dung")
//                     || slugLower.contains("doi-tra") || slugLower.contains("chinh-sach") || slugLower.contains("lien-he")) {
//                 targetGroup = "PAGE";
//             }
//             // 4. Nếu chưa có hoặc là null -> PRODUCT
//             else if (currentGroup == null || currentGroup.isBlank()) {
//                 targetGroup = "PRODUCT";
//             }

//             // Đồng bộ group của con theo cha nếu con thuộc phòng
//             if (cat.getParent() != null && "ROOM".equals(cat.getParent().getCategoryGroup())) {
//                 targetGroup = "ROOM";
//             }

//             if (targetGroup != null && !targetGroup.equalsIgnoreCase(currentGroup)) {
//                 cat.setCategoryGroup(targetGroup);
//                 categoryRepository.save(cat);
//                 anyUpdated = true;
//                 log.info("[CATEGORY-INIT] Cập nhật category_group id={} name='{}' -> {}", cat.getId(), cat.getName(), targetGroup);
//             }
//         }

//         if (anyUpdated) {
//             log.info("[CATEGORY-INIT] Hoàn tất cập nhật category_group cho danh mục.");
//         }
//     }
// }

