package vn.nhaxinh.catalog;

import static vn.nhaxinh.admin.RbacAuditRecorder.details;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import java.net.URI;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import vn.nhaxinh.admin.RbacAuditRecorder;
import vn.nhaxinh.controller.BaseController;

@RestController
@RequestMapping({BaseController.API_V1 + "/categories", BaseController.API_V1 + "/admin/categories"})
public class CategoryController extends BaseController {

    private static final Logger log = LoggerFactory.getLogger(CategoryController.class);

    private final CategoryService categoryService;
    private final RbacAuditRecorder audit;

    public CategoryController(CategoryService categoryService, RbacAuditRecorder audit) {
        this.categoryService = categoryService;
        this.audit = audit;
    }

    @GetMapping
    public ResponseEntity<List<CategoryResponse>> listCategories(
            @RequestParam(defaultValue = "false") boolean includeInactive
    ) {
        return ResponseEntity.ok(categoryService.findAll(includeInactive).stream()
                .map(CategoryResponse::from)
                .toList());
    }

    @PostMapping
    public ResponseEntity<CategoryResponse> createCategory(
            @Valid @RequestBody CategoryRequest request,
            @AuthenticationPrincipal UserDetails principal,
            HttpServletRequest httpRequest
    ) {
        CategoryResponse category = CategoryResponse.from(categoryService.save(null, request));
        log.info("[ADMIN-CATEGORY-CREATE] Admin='{}' (ip={}) tạo danh mục/bộ sưu tập id={} name='{}' slug='{}'",
                RbacAuditRecorder.actorName(principal), RbacAuditRecorder.clientIp(httpRequest),
                category.id(), category.name(), category.slug());
        audit.record(principal, httpRequest, "ADMIN_CREATE_CATEGORY", "CATEGORY", category.id(), details(
                "name", category.name(),
                "slug", category.slug(),
                "parentId", category.parentId(),
                "description", category.description(),
                "imageUrl", category.imageUrl(),
                "sortOrder", category.sortOrder()
        ));
        return ResponseEntity.created(URI.create(API_V1 + "/admin/categories/" + category.id())).body(category);
    }

    @PutMapping("/{id}")
    public ResponseEntity<CategoryResponse> updateCategory(
            @PathVariable Long id,
            @Valid @RequestBody CategoryRequest request,
            @AuthenticationPrincipal UserDetails principal,
            HttpServletRequest httpRequest
    ) {
        CategoryResponse category = CategoryResponse.from(categoryService.save(id, request));
        log.info("[ADMIN-CATEGORY-UPDATE] Admin='{}' (ip={}) cập nhật danh mục/bộ sưu tập id={} name='{}' slug='{}'",
                RbacAuditRecorder.actorName(principal), RbacAuditRecorder.clientIp(httpRequest),
                category.id(), category.name(), category.slug());
        audit.record(principal, httpRequest, "ADMIN_UPDATE_CATEGORY", "CATEGORY", category.id(), details(
                "name", category.name(),
                "slug", category.slug(),
                "parentId", category.parentId(),
                "description", category.description(),
                "imageUrl", category.imageUrl(),
                "sortOrder", category.sortOrder()
        ));
        return ResponseEntity.ok(category);
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<Void> updateCategoryStatus(
            @PathVariable Long id,
            @Valid @RequestBody CategoryStatusRequest request,
            @AuthenticationPrincipal UserDetails principal,
            HttpServletRequest httpRequest
    ) {
        categoryService.setActive(id, request.isActive());
        log.info("[ADMIN-CATEGORY-STATUS] Admin='{}' (ip={}) đổi trạng thái danh mục/bộ sưu tập id={}: isActive={}",
                RbacAuditRecorder.actorName(principal), RbacAuditRecorder.clientIp(httpRequest),
                id, request.isActive());
        audit.record(principal, httpRequest,
                Boolean.TRUE.equals(request.isActive()) ? "ADMIN_RESTORE_CATEGORY" : "ADMIN_DELETE_CATEGORY",
                "CATEGORY", id, details(
                        "isActive", request.isActive()
                ));
        return ResponseEntity.noContent().build();
    }

    public record CategoryStatusRequest(Boolean isActive) {
        public CategoryStatusRequest {
            if (isActive == null) {
                throw new IllegalArgumentException("Trạng thái danh mục không được để trống");
            }
        }
    }
}
