package vn.nhaxinh.catalog;


import java.net.URI;
import java.util.List;
import java.util.Optional;
import org.springframework.core.io.Resource;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import vn.nhaxinh.controller.BaseController;
import vn.nhaxinh.inventory.InventoryService;

/**
 * Public REST API for product catalog.
 *
 * Endpoints:
 *   GET    /api/v1/products                           - Paged list (summaries)
 *   GET    /api/v1/products/search?keyword=...        - Full-text search (summaries)
 *   GET    /api/v1/products/category/{categoryId}     - Products by category (summaries)
 *   GET    /api/v1/products/brand/{brandId}           - Products by brand (summaries)
 *   GET    /api/v1/products/{id}                      - Full detail by numeric ID
 *   GET    /api/v1/products/slug/{slug}               - Full detail by slug
 *   GET    /api/v1/products/featured                  - Product featured
 *   POST   /api/v1/products/create                    - Create product
 *   PUT    /api/v1/products/update                    - Update product
 *   DELETE /api/v1/products/delete                    - Delete product
 *   POST   /api/v1/products/restore                   - Restore product
 */
@RestController
@RequestMapping(BaseController.API_V1 + "/products")
@Transactional(readOnly = true)
public class ProductController extends BaseController {

    private final ProductService productService;
    private final InventoryService inventoryService;

    public ProductController(ProductService productService, InventoryService inventoryService) {
        this.productService = productService;
        this.inventoryService = inventoryService;
    }

    // -----------------------------------------------------------------------
    // LIST / SEARCH
    // -----------------------------------------------------------------------

    /**
     * Paged list of active products (lightweight summary).
     *
     * @param page    0-based page index (default 0)
     * @param size    items per page (default 20, max 100)
     * @param sort    sort field (default "name")
     * @param dir     sort direction: asc | desc (default asc)
     */
    @GetMapping
    public ResponseEntity<Page<ProductSummary>> listProducts(
            @RequestParam(defaultValue = "0")  int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "name") String sort,
            @RequestParam(defaultValue = "asc")  String dir) {

        Pageable pageable = toPageable(page, size, sort, dir);
        return ResponseEntity.ok(productService.findActiveSummaries(pageable));
    }

    /**
     * Full-text keyword search across product name and short description.
     */
    @GetMapping("/search")
    public ResponseEntity<Page<ProductSummary>> searchProducts(
            @RequestParam String keyword,
            @RequestParam(defaultValue = "0")  int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "name") String sort,
            @RequestParam(defaultValue = "asc")  String dir) {

        if (keyword == null || keyword.isBlank()) {
            return listProducts(page, size, sort, dir);
        }
        Pageable pageable = toPageable(page, size, sort, dir);
        return ResponseEntity.ok(productService.searchActiveSummaries(keyword.trim(), pageable));
    }

    /**
     * Products belonging to a given category.
     */
    @GetMapping("/category/{categoryId}")
    public ResponseEntity<Page<ProductSummary>> listByCategory(
            @PathVariable Long categoryId,
            @RequestParam(defaultValue = "0")  int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "name") String sort,
            @RequestParam(defaultValue = "asc")  String dir) {

        Pageable pageable = toPageable(page, size, sort, dir);
        return ResponseEntity.ok(productService.findActiveSummariesByCategory(categoryId, pageable));
    }

    /**
     * Products from a given brand.
     */
    @GetMapping("/brand/{brandId}")
    public ResponseEntity<Page<ProductSummary>> listByBrand(
            @PathVariable Long brandId,
            @RequestParam(defaultValue = "0")  int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "name") String sort,
            @RequestParam(defaultValue = "asc")  String dir) {

        Pageable pageable = toPageable(page, size, sort, dir);
        return ResponseEntity.ok(productService.findActiveSummariesByBrand(brandId, pageable));
    }

    // -----------------------------------------------------------------------
    // DETAIL
    // -----------------------------------------------------------------------

    /**
     * Full product detail by numeric ID (only ACTIVE products are visible).
     */
    @GetMapping("/{id}")
    public ResponseEntity<ProductDetailResponse> getProductById(@PathVariable Long id) {
        return productService.findByIdAndStatus(id, "ACTIVE")
                .map(this::toDetailResponse)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Full product detail by SEO-friendly slug (only ACTIVE products are visible).
     */
    @GetMapping("/slug/{slug}")
    public ResponseEntity<ProductDetailResponse> getProductBySlug(@PathVariable String slug) {
        return productService.findBySlugAndStatus(slug, "ACTIVE")
                .map(this::toDetailResponse)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    // -----------------------------------------------------------------------
    // FEATURED PRODUCTS
    // -----------------------------------------------------------------------

    /**
     * Danh sách sản phẩm nổi bật (Featured Products).
     *
     * @param limit số lượng sản phẩm cần lấy (mặc định 8, tối đa 50)
     */
    @GetMapping("/featured")
    public ResponseEntity<List<ProductSummary>> getFeaturedProducts(
            @RequestParam(defaultValue = "8") int limit) {
        return ResponseEntity.ok(productService.findFeaturedProducts(limit));
    }

    // -----------------------------------------------------------------------
    // MEDIA & IMAGES
    // -----------------------------------------------------------------------

    /**
     * Lấy danh sách media của sản phẩm theo numeric ID.
     * Có thể lọc theo mediaType (?type=IMAGE hoặc ?type=VIDEO hoặc ?type=MODEL_3D).
     */
    @GetMapping("/{id}/media")
    public ResponseEntity<List<ProductDetailResponse.MediaInfo>> getProductMedia(
            @PathVariable Long id,
            @RequestParam(required = false) String type) {
        List<ProductMedia> mediaList = productService.findMediaByProductId(id, type);
        List<ProductDetailResponse.MediaInfo> response = mediaList.stream()
                .map(m -> new ProductDetailResponse.MediaInfo(
                        m.getId(),
                        m.getMediaType(),
                        m.getMediaUrl(),
                        m.getAltText(),
                        m.getSortOrder(),
                        m.getIsPrimary(),
                        m.getVariant() != null ? m.getVariant().getId() : null
                ))
                .toList();
        return ResponseEntity.ok(response);
    }

    /**
     * Lấy danh sách media của sản phẩm theo SEO-friendly slug.
     */
    @GetMapping("/slug/{slug}/media")
    public ResponseEntity<List<ProductDetailResponse.MediaInfo>> getProductMediaBySlug(
            @PathVariable String slug,
            @RequestParam(required = false) String type) {
        return productService.findBySlugAndStatus(slug, "ACTIVE")
                .map(p -> getProductMedia(p.getId(), type))
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * API chuyên biệt lấy toàn bộ ảnh (IMAGE) của sản phẩm theo numeric ID.
     */
    @GetMapping("/{id}/images")
    public ResponseEntity<List<ProductDetailResponse.MediaInfo>> getProductImages(@PathVariable Long id) {
        return getProductMedia(id, "IMAGE");
    }

    /**
     * API chuyên biệt lấy toàn bộ ảnh (IMAGE) của sản phẩm theo slug.
     */
    @GetMapping("/slug/{slug}/images")
    public ResponseEntity<List<ProductDetailResponse.MediaInfo>> getProductImagesBySlug(@PathVariable String slug) {
        return getProductMediaBySlug(slug, "IMAGE");
    }

    /**
     * API phục vụ/xem trực tiếp ảnh theo media ID.
     * Chỉ xử lý nếu media_type là IMAGE.
     */
    @GetMapping("/media/{mediaId}/image")
    public ResponseEntity<?> getMediaImage(@PathVariable Long mediaId) {
        Optional<ProductMedia> optionalMedia = productService.findMediaById(mediaId);
        if (optionalMedia.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        ProductMedia media = optionalMedia.get();
        if (!"IMAGE".equalsIgnoreCase(media.getMediaType())) {
            return ResponseEntity.badRequest().body("Media này không phải là ảnh (IMAGE)");
        }

        String mediaUrl = media.getMediaUrl();
        // 1. Nếu là URL tuyệt đối từ internet (http/https), redirect trực tiếp
        if (mediaUrl != null && (mediaUrl.startsWith("http://") || mediaUrl.startsWith("https://"))) {
            return ResponseEntity.status(HttpStatus.FOUND)
                    .location(URI.create(mediaUrl))
                    .build();
        }

        // 2. Nếu là file lưu trữ cục bộ, stream file ảnh
        Resource resource = productService.loadMediaAsResource(media);
        if (resource != null && resource.exists() && resource.isReadable()) {
            String filename = resource.getFilename();
            String contentType = determineContentType(filename);
            return ResponseEntity.ok()
                    .contentType(MediaType.parseMediaType(contentType))
                    .body(resource);
        }

        return ResponseEntity.notFound().build();
    }

    // -----------------------------------------------------------------------
    // Helpers
    // -----------------------------------------------------------------------

    /** Builds a {@link ProductDetailResponse} enriched with live stock data. */
    private ProductDetailResponse toDetailResponse(Product product) {
        return ProductDetailResponse.from(product, variantId ->
                inventoryService.findByVariantId(variantId)
                        .map(inv -> new ProductDetailResponse.StockInfo(
                                Math.max(0, inv.getQuantityOnHand() - inv.getQuantityReserved())
                        ))
                        .orElse(new ProductDetailResponse.StockInfo(0))
        );
    }

    /** Clamps size to [1, 100] and builds a {@link Pageable}. */
    private Pageable toPageable(int page, int size, String sort, String dir) {
        int safeSize = Math.min(Math.max(size, 1), 100);
        Sort.Direction direction = "desc".equalsIgnoreCase(dir)
                ? Sort.Direction.DESC
                : Sort.Direction.ASC;
        String safeSort = switch (sort != null ? sort.trim().toLowerCase() : "") {
            case "id" -> "id";
            case "createdat", "created_at" -> "createdAt";
            default -> "name";
        };
        return PageRequest.of(Math.max(page, 0), safeSize, Sort.by(direction, safeSort));
    }

    private String determineContentType(String filename) {
        if (filename == null) return "image/jpeg";
        String lower = filename.toLowerCase();
        if (lower.endsWith(".png")) return "image/png";
        if (lower.endsWith(".webp")) return "image/webp";
        if (lower.endsWith(".gif")) return "image/gif";
        if (lower.endsWith(".svg")) return "image/svg+xml";
        return "image/jpeg";
    }
}
