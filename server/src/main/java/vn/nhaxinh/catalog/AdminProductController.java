package vn.nhaxinh.catalog;

import static vn.nhaxinh.admin.RbacAuditRecorder.details;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import java.net.URI;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
// import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import vn.nhaxinh.admin.RbacAuditRecorder;
import vn.nhaxinh.controller.BaseController;

/**
 * Controller quản lý sản phẩm dành cho Admin & Staff.
 *
 * <pre>
 * GET    /api/v1/admin/products?includeArchived=true|false - Danh sách sản phẩm quản trị
 * GET    /api/v1/admin/products/{id}                       - Chi tiết sản phẩm
 * POST   /api/v1/admin/products                            - Tạo sản phẩm (JSON hoặc multipart)
 * PUT    /api/v1/admin/products/{id}                       - Cập nhật sản phẩm (JSON hoặc multipart)
 * PATCH  /api/v1/admin/products/{id}/status                - Đổi trạng thái (DRAFT | ACTIVE | ARCHIVED)
 * DELETE /api/v1/admin/products/{id}                       - Lưu trữ/xóa mềm sản phẩm (ARCHIVED)
 * </pre>
 */
@RestController
@RequestMapping(BaseController.API_V1 + "/admin/products")
// @PreAuthorize("hasAnyRole('ADMIN', 'STAFF')")
public class AdminProductController extends BaseController {

    private static final Logger log = LoggerFactory.getLogger(AdminProductController.class);

    private final ProductService productService;
    private final RbacAuditRecorder audit;

    public AdminProductController(ProductService productService, RbacAuditRecorder audit) {
        this.productService = productService;
        this.audit = audit;
    }

    @GetMapping
    public ResponseEntity<List<ProductDetailResponse>> listProducts(
            @RequestParam(defaultValue = "false") boolean includeArchived
    ) {
        List<ProductDetailResponse> products = productService.findAdminProducts();
        if (includeArchived) {
            return ResponseEntity.ok(products);
        }
        return ResponseEntity.ok(products.stream()
                .filter(product -> !"ARCHIVED".equals(product.status()))
                .toList());
    }

    @GetMapping("/{id}")
    public ResponseEntity<ProductDetailResponse> getProductById(@PathVariable Long id) {
        return ResponseEntity.ok(productService.findAdminProducts().stream()
                .filter(product -> product.id().equals(id))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy sản phẩm")));
    }

    @PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<ProductDetailResponse> createProductFromUrls(
            @Valid @RequestBody CreateProductRequest request,
            @AuthenticationPrincipal UserDetails principal,
            HttpServletRequest httpRequest
    ) {
        ProductDetailResponse product = productService.createProduct(request, List.of());
        log.info("[ADMIN-PRODUCT-CREATE] Admin='{}' (ip={}) tạo sản phẩm id={} name='{}' slug='{}' với {} biến thể",
                RbacAuditRecorder.actorName(principal), RbacAuditRecorder.clientIp(httpRequest),
                product.id(), product.name(), product.slug(), product.variants().size());
        audit.record(principal, httpRequest, "ADMIN_CREATE_PRODUCT", "PRODUCT", product.id(), details(
                "name", product.name(),
                "slug", product.slug(),
                "status", product.status(),
                "variantsCount", product.variants().size()
        ));
        return ResponseEntity.created(URI.create(API_V1 + "/admin/products/" + product.id())).body(product);
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ProductDetailResponse> createProductWithUploads(
            @Valid @RequestPart("request") CreateProductRequest request,
            @RequestPart(value = "mediaFiles", required = false) List<MultipartFile> mediaFiles,
            @AuthenticationPrincipal UserDetails principal,
            HttpServletRequest httpRequest
    ) {
        ProductDetailResponse product = productService.createProduct(request, mediaFiles);
        log.info("[ADMIN-PRODUCT-CREATE] Admin='{}' (ip={}) tạo sản phẩm (kèm upload ảnh) id={} name='{}' slug='{}' với {} biến thể",
                RbacAuditRecorder.actorName(principal), RbacAuditRecorder.clientIp(httpRequest),
                product.id(), product.name(), product.slug(), product.variants().size());
        audit.record(principal, httpRequest, "ADMIN_CREATE_PRODUCT", "PRODUCT", product.id(), details(
                "name", product.name(),
                "slug", product.slug(),
                "status", product.status(),
                "variantsCount", product.variants().size(),
                "uploadedFiles", mediaFiles != null ? mediaFiles.size() : 0
        ));
        return ResponseEntity.created(URI.create(API_V1 + "/admin/products/" + product.id())).body(product);
    }

    @PutMapping(value = "/{id}", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<ProductDetailResponse> updateProductFromUrls(
            @PathVariable Long id,
            @Valid @RequestBody CreateProductRequest request,
            @AuthenticationPrincipal UserDetails principal,
            HttpServletRequest httpRequest
    ) {
        ProductDetailResponse product = productService.updateProduct(id, request, List.of());
        log.info("[ADMIN-PRODUCT-UPDATE] Admin='{}' (ip={}) cập nhật sản phẩm id={} name='{}'",
                RbacAuditRecorder.actorName(principal), RbacAuditRecorder.clientIp(httpRequest), id, product.name());
        audit.record(principal, httpRequest, "ADMIN_UPDATE_PRODUCT", "PRODUCT", id, details(
                "name", product.name(),
                "slug", product.slug(),
                "status", product.status(),
                "variantsCount", product.variants().size()
        ));
        return ResponseEntity.ok(product);
    }

    @PutMapping(value = "/{id}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ProductDetailResponse> updateProductWithUploads(
            @PathVariable Long id,
            @Valid @RequestPart("request") CreateProductRequest request,
            @RequestPart(value = "mediaFiles", required = false) List<MultipartFile> mediaFiles,
            @AuthenticationPrincipal UserDetails principal,
            HttpServletRequest httpRequest
    ) {
        ProductDetailResponse product = productService.updateProduct(id, request, mediaFiles);
        log.info("[ADMIN-PRODUCT-UPDATE] Admin='{}' (ip={}) cập nhật sản phẩm (kèm upload ảnh) id={} name='{}'",
                RbacAuditRecorder.actorName(principal), RbacAuditRecorder.clientIp(httpRequest), id, product.name());
        audit.record(principal, httpRequest, "ADMIN_UPDATE_PRODUCT", "PRODUCT", id, details(
                "name", product.name(),
                "slug", product.slug(),
                "status", product.status(),
                "variantsCount", product.variants().size(),
                "uploadedFiles", mediaFiles != null ? mediaFiles.size() : 0
        ));
        return ResponseEntity.ok(product);
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<Void> updateProductStatus(
            @PathVariable Long id,
            @Valid @RequestBody ProductStatusRequest request,
            @AuthenticationPrincipal UserDetails principal,
            HttpServletRequest httpRequest
    ) {
        productService.setStatus(id, request.status());
        log.info("[ADMIN-PRODUCT-STATUS] Admin='{}' (ip={}) đổi trạng thái sản phẩm id={}: {}",
                RbacAuditRecorder.actorName(principal), RbacAuditRecorder.clientIp(httpRequest), id, request.status());
        audit.record(principal, httpRequest, "ADMIN_STATUS_PRODUCT", "PRODUCT", id, details(
                "status", request.status()
        ));
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteProduct(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails principal,
            HttpServletRequest httpRequest
    ) {
        productService.setStatus(id, "ARCHIVED");
        log.warn("[ADMIN-PRODUCT-DELETE] Admin='{}' (ip={}) đã xóa/lưu trữ sản phẩm id={}",
                RbacAuditRecorder.actorName(principal), RbacAuditRecorder.clientIp(httpRequest), id);
        audit.record(principal, httpRequest, "ADMIN_DELETE_PRODUCT", "PRODUCT", id, details(
                "status", "ARCHIVED"
        ));
        return ResponseEntity.noContent().build();
    }

    public record ProductStatusRequest(
            @NotBlank @Pattern(regexp = "DRAFT|ACTIVE|ARCHIVED") String status
    ) {
    }
}
