package vn.nhaxinh.catalog;

import static vn.nhaxinh.admin.RbacAuditRecorder.details;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import java.net.URI;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
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
            @RequestParam(defaultValue = "false") boolean includeInactive,
            @RequestParam(defaultValue = "false") boolean includeDeleted,
            @RequestParam(required = false) String group
    ) {
        return ResponseEntity.ok(categoryService.findAll(includeInactive, includeDeleted, group).stream()
                .map(CategoryResponse::from)
                .toList());
    }

    @GetMapping("/trash")
    public ResponseEntity<List<CategoryResponse>> listTrash() {
        return ResponseEntity.ok(categoryService.findTrash().stream()
                .map(CategoryResponse::from)
                .toList());
    }

    @GetMapping("/collections")
    public ResponseEntity<List<CategoryResponse>> listCollections() {
        return ResponseEntity.ok(categoryService.findCollections().stream()
                .map(CategoryResponse::from)
                .toList());
    }

    @GetMapping("/rooms")
    public ResponseEntity<List<CategoryResponse>> listRooms() {
        return ResponseEntity.ok(categoryService.findRooms().stream()
                .map(CategoryResponse::from)
                .toList());
    }

    @GetMapping("/products")
    public ResponseEntity<List<CategoryResponse>> listProductCategories() {
        return ResponseEntity.ok(categoryService.findProductCategories().stream()
                .map(CategoryResponse::from)
                .toList());
    }

    @GetMapping("/check-slug")
    public ResponseEntity<java.util.Map<String, Object>> checkSlug(
            @RequestParam String slug,
            @RequestParam(required = false) Long excludeId
    ) {
        boolean exists = excludeId == null
                ? categoryService.existsBySlug(slug)
                : categoryService.existsBySlugAndIdNot(slug, excludeId);
        String suggested = exists ? categoryService.resolveUniqueCategorySlug(slug, excludeId) : slug;
        return ResponseEntity.ok(java.util.Map.of("exists", exists, "slug", slug, "suggestedSlug", suggested));
    }

    @PostMapping(value = "/upload-image", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<java.util.Map<String, String>> uploadCategoryImage(
            @RequestParam("file") MultipartFile file
    ) {
        String url = categoryService.storeCategoryImage(file);
        return ResponseEntity.ok(java.util.Map.of("url", url != null ? url : ""));
    }

    @PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<CategoryResponse> createCategory(
            @Valid @RequestBody CategoryRequest request,
            @AuthenticationPrincipal UserDetails principal,
            HttpServletRequest httpRequest
    ) {
        return doCreateCategory(request, null, principal, httpRequest);
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<CategoryResponse> createCategoryMultipart(
            @Valid @RequestPart("request") CategoryRequest request,
            @RequestPart(value = "imageFile", required = false) MultipartFile imageFile,
            @AuthenticationPrincipal UserDetails principal,
            HttpServletRequest httpRequest
    ) {
        return doCreateCategory(request, imageFile, principal, httpRequest);
    }

    private ResponseEntity<CategoryResponse> doCreateCategory(
            CategoryRequest request,
            MultipartFile imageFile,
            UserDetails principal,
            HttpServletRequest httpRequest
    ) {
        CategoryResponse category = CategoryResponse.from(categoryService.save(null, request, imageFile, RbacAuditRecorder.actorName(principal)));
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

    @PutMapping(value = "/{id}", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<CategoryResponse> updateCategory(
            @PathVariable Long id,
            @Valid @RequestBody CategoryRequest request,
            @AuthenticationPrincipal UserDetails principal,
            HttpServletRequest httpRequest
    ) {
        return doUpdateCategory(id, request, null, principal, httpRequest);
    }

    @PutMapping(value = "/{id}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<CategoryResponse> updateCategoryMultipart(
            @PathVariable Long id,
            @Valid @RequestPart("request") CategoryRequest request,
            @RequestPart(value = "imageFile", required = false) MultipartFile imageFile,
            @AuthenticationPrincipal UserDetails principal,
            HttpServletRequest httpRequest
    ) {
        return doUpdateCategory(id, request, imageFile, principal, httpRequest);
    }

    private ResponseEntity<CategoryResponse> doUpdateCategory(
            Long id,
            CategoryRequest request,
            MultipartFile imageFile,
            UserDetails principal,
            HttpServletRequest httpRequest
    ) {
        Category before = categoryService.findById(id).orElse(null);
        java.util.Map<String, Object> changes = new java.util.LinkedHashMap<>();
        if (before != null) {
            if (!java.util.Objects.equals(before.getName(), request.name().trim())) {
                changes.put("name", java.util.Map.of("old", String.valueOf(before.getName()), "new", request.name().trim()));
            }
            if (request.slug() != null && !java.util.Objects.equals(before.getSlug(), request.slug().trim())) {
                changes.put("slug", java.util.Map.of("old", String.valueOf(before.getSlug()), "new", request.slug().trim()));
            }
            Long oldParentId = before.getParent() != null ? before.getParent().getId() : null;
            if (!java.util.Objects.equals(oldParentId, request.parentId())) {
                changes.put("parentId", java.util.Map.of("old", String.valueOf(oldParentId), "new", String.valueOf(request.parentId())));
            }
            if (!java.util.Objects.equals(before.getDescription(), request.description())) {
                changes.put("description", java.util.Map.of("old", String.valueOf(before.getDescription()), "new", String.valueOf(request.description())));
            }
            if (request.sortOrder() != null && !java.util.Objects.equals(before.getSortOrder(), request.sortOrder())) {
                changes.put("sortOrder", java.util.Map.of("old", String.valueOf(before.getSortOrder()), "new", String.valueOf(request.sortOrder())));
            }
            if (request.isActive() != null && !java.util.Objects.equals(before.getIsActive(), request.isActive())) {
                changes.put("isActive", java.util.Map.of("old", String.valueOf(before.getIsActive()), "new", String.valueOf(request.isActive())));
            }
        }

        CategoryResponse category = CategoryResponse.from(categoryService.save(id, request, imageFile));
        log.info("[ADMIN-CATEGORY-UPDATE] Admin='{}' (ip={}) cập nhật danh mục id={} name='{}' slug='{}' | Chi tiết thay đổi: {}",
                RbacAuditRecorder.actorName(principal), RbacAuditRecorder.clientIp(httpRequest),
                category.id(), category.name(), category.slug(), changes);
        audit.record(principal, httpRequest, "ADMIN_UPDATE_CATEGORY", "CATEGORY", category.id(), details(
                "name", category.name(),
                "slug", category.slug(),
                "parentId", category.parentId(),
                "description", category.description(),
                "imageUrl", category.imageUrl(),
                "sortOrder", category.sortOrder(),
                "changes", changes
        ));
        return ResponseEntity.ok(category);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> softDeleteCategory(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails principal,
            HttpServletRequest httpRequest
    ) {
        categoryService.softDelete(id);
        log.warn("[ADMIN-CATEGORY-DELETE] Admin='{}' (ip={}) xóa mềm danh mục/bộ sưu tập id={}",
                RbacAuditRecorder.actorName(principal), RbacAuditRecorder.clientIp(httpRequest), id);
        audit.record(principal, httpRequest, "ADMIN_DELETE_CATEGORY", "CATEGORY", id, details(
                "isDeleted", true
        ));
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id}/restore")
    public ResponseEntity<Void> restoreCategory(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails principal,
            HttpServletRequest httpRequest
    ) {
        categoryService.restore(id);
        log.info("[ADMIN-CATEGORY-RESTORE] Admin='{}' (ip={}) khôi phục danh mục/bộ sưu tập id={}",
                RbacAuditRecorder.actorName(principal), RbacAuditRecorder.clientIp(httpRequest), id);
        audit.record(principal, httpRequest, "ADMIN_RESTORE_CATEGORY", "CATEGORY", id, details(
                "isDeleted", false
        ));
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/restore")
    public ResponseEntity<Void> restoreCategoryPost(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails principal,
            HttpServletRequest httpRequest
    ) {
        return restoreCategory(id, principal, httpRequest);
    }

    @DeleteMapping("/{id}/permanent")
    public ResponseEntity<Void> permanentDeleteCategory(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails principal,
            HttpServletRequest httpRequest
    ) {
        categoryService.permanentDelete(id);
        log.warn("[ADMIN-CATEGORY-PERMANENT-DELETE] Admin='{}' (ip={}) xóa vĩnh viễn danh mục/bộ sưu tập id={}",
                RbacAuditRecorder.actorName(principal), RbacAuditRecorder.clientIp(httpRequest), id);
        audit.record(principal, httpRequest, "ADMIN_PERMANENT_DELETE_CATEGORY", "CATEGORY", id, details(
                "permanent", true
        ));
        return ResponseEntity.noContent().build();
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
