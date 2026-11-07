package vn.nhaxinh.catalog;

import static vn.nhaxinh.admin.RbacAuditRecorder.details;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import vn.nhaxinh.admin.RbacAuditRecorder;
import vn.nhaxinh.controller.BaseController;

@RestController
@RequestMapping({BaseController.API_V1 + "/collections", BaseController.API_V1 + "/admin/collections"})
public class CollectionController extends BaseController {

    private static final Logger log = LoggerFactory.getLogger(CollectionController.class);

    private final CollectionService collectionService;
    private final RbacAuditRecorder audit;

    public CollectionController(CollectionService collectionService, RbacAuditRecorder audit) {
        this.collectionService = collectionService;
        this.audit = audit;
    }

    @GetMapping
    public ResponseEntity<List<CollectionDTO.CollectionResponse>> listCollections(
            @RequestParam(defaultValue = "false") boolean includeDeleted
    ) {
        return ResponseEntity.ok(collectionService.findAll(includeDeleted));
    }

    @GetMapping("/trash")
    public ResponseEntity<List<CollectionDTO.CollectionResponse>> listTrash() {
        return ResponseEntity.ok(collectionService.findTrash());
    }

    @GetMapping("/{id}")
    public ResponseEntity<CollectionDTO.CollectionResponse> getCollectionById(@PathVariable Long id) {
        return collectionService.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/slug/{slug}")
    public ResponseEntity<CollectionDTO.CollectionResponse> getCollectionBySlug(@PathVariable String slug) {
        return collectionService.findBySlug(slug)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/check-slug")
    public ResponseEntity<Map<String, Object>> checkSlug(
            @RequestParam String slug,
            @RequestParam(required = false) Long excludeId
    ) {
        boolean exists = excludeId == null
                ? collectionService.existsBySlug(slug)
                : collectionService.existsBySlugAndIdNot(slug, excludeId);
        String suggested = exists ? collectionService.resolveUniqueSlug(slug, excludeId) : slug;
        return ResponseEntity.ok(Map.of("exists", exists, "slug", slug, "suggestedSlug", suggested));
    }

    @PostMapping(value = "/upload-image", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Map<String, String>> uploadCoverImage(@RequestParam("file") MultipartFile file) {
        String url = collectionService.storeCoverImage(file);
        return ResponseEntity.ok(Map.of("url", url != null ? url : ""));
    }

    @PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<CollectionDTO.CollectionResponse> createCollection(
            @Valid @RequestBody CollectionDTO.CollectionRequest request,
            @AuthenticationPrincipal UserDetails principal,
            HttpServletRequest httpRequest
    ) {
        return doCreate(request, null, principal, httpRequest);
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<CollectionDTO.CollectionResponse> createCollectionMultipart(
            @Valid @RequestPart("request") CollectionDTO.CollectionRequest request,
            @RequestPart(value = "coverImage", required = false) MultipartFile coverImage,
            @AuthenticationPrincipal UserDetails principal,
            HttpServletRequest httpRequest
    ) {
        return doCreate(request, coverImage, principal, httpRequest);
    }

    private ResponseEntity<CollectionDTO.CollectionResponse> doCreate(
            CollectionDTO.CollectionRequest request,
            MultipartFile coverImage,
            UserDetails principal,
            HttpServletRequest httpRequest
    ) {
        CollectionDTO.CollectionResponse res = collectionService.save(null, request, coverImage, RbacAuditRecorder.actorName(principal));
        log.info("[ADMIN-COLLECTION-CREATE] Admin='{}' (ip={}) tạo bộ sưu tập id={} name='{}' slug='{}'",
                RbacAuditRecorder.actorName(principal), RbacAuditRecorder.clientIp(httpRequest),
                res.id(), res.name(), res.slug());
        audit.record(principal, httpRequest, "ADMIN_CREATE_COLLECTION", "COLLECTION", res.id(), details(
                "name", res.name(),
                "slug", res.slug(),
                "status", res.status()
        ));
        return ResponseEntity.status(HttpStatus.CREATED).body(res);
    }

    @PutMapping(value = "/{id}", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<CollectionDTO.CollectionResponse> updateCollection(
            @PathVariable Long id,
            @Valid @RequestBody CollectionDTO.CollectionRequest request,
            @AuthenticationPrincipal UserDetails principal,
            HttpServletRequest httpRequest
    ) {
        return doUpdate(id, request, null, principal, httpRequest);
    }

    @PutMapping(value = "/{id}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<CollectionDTO.CollectionResponse> updateCollectionMultipart(
            @PathVariable Long id,
            @Valid @RequestPart("request") CollectionDTO.CollectionRequest request,
            @RequestPart(value = "coverImage", required = false) MultipartFile coverImage,
            @AuthenticationPrincipal UserDetails principal,
            HttpServletRequest httpRequest
    ) {
        return doUpdate(id, request, coverImage, principal, httpRequest);
    }

    private ResponseEntity<CollectionDTO.CollectionResponse> doUpdate(
            Long id,
            CollectionDTO.CollectionRequest request,
            MultipartFile coverImage,
            UserDetails principal,
            HttpServletRequest httpRequest
    ) {
        CollectionDTO.CollectionResponse before = collectionService.findById(id).orElse(null);
        java.util.Map<String, Object> changes = new java.util.LinkedHashMap<>();
        if (before != null) {
            if (!java.util.Objects.equals(before.name(), request.name().trim())) {
                changes.put("name", java.util.Map.of("old", String.valueOf(before.name()), "new", request.name().trim()));
            }
            if (request.slug() != null && !java.util.Objects.equals(before.slug(), request.slug().trim())) {
                changes.put("slug", java.util.Map.of("old", String.valueOf(before.slug()), "new", request.slug().trim()));
            }
            if (!java.util.Objects.equals(before.description(), request.description())) {
                changes.put("description", java.util.Map.of("old", String.valueOf(before.description()), "new", String.valueOf(request.description())));
            }
            if (request.status() != null && !java.util.Objects.equals(before.status(), request.status())) {
                changes.put("status", java.util.Map.of("old", String.valueOf(before.status()), "new", String.valueOf(request.status())));
            }
            if (request.sortOrder() != null && !java.util.Objects.equals(before.sortOrder(), request.sortOrder())) {
                changes.put("sortOrder", java.util.Map.of("old", String.valueOf(before.sortOrder()), "new", String.valueOf(request.sortOrder())));
            }
        }

        CollectionDTO.CollectionResponse res = collectionService.save(id, request, coverImage);
        log.info("[ADMIN-COLLECTION-UPDATE] Admin='{}' (ip={}) cập nhật bộ sưu tập id={} name='{}' slug='{}' | Chi tiết thay đổi: {}",
                RbacAuditRecorder.actorName(principal), RbacAuditRecorder.clientIp(httpRequest),
                res.id(), res.name(), res.slug(), changes);
        audit.record(principal, httpRequest, "ADMIN_UPDATE_COLLECTION", "COLLECTION", res.id(), details(
                "name", res.name(),
                "slug", res.slug(),
                "status", res.status(),
                "changes", changes
        ));
        return ResponseEntity.ok(res);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> softDeleteCollection(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails principal,
            HttpServletRequest httpRequest
    ) {
        collectionService.softDelete(id);
        log.warn("[ADMIN-COLLECTION-DELETE] Admin='{}' (ip={}) xóa mềm bộ sưu tập id={}",
                RbacAuditRecorder.actorName(principal), RbacAuditRecorder.clientIp(httpRequest), id);
        audit.record(principal, httpRequest, "ADMIN_DELETE_COLLECTION", "COLLECTION", id, details(
                "isDeleted", true
        ));
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id}/restore")
    public ResponseEntity<Void> restoreCollection(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails principal,
            HttpServletRequest httpRequest
    ) {
        collectionService.restore(id);
        log.info("[ADMIN-COLLECTION-RESTORE] Admin='{}' (ip={}) khôi phục bộ sưu tập id={}",
                RbacAuditRecorder.actorName(principal), RbacAuditRecorder.clientIp(httpRequest), id);
        audit.record(principal, httpRequest, "ADMIN_RESTORE_COLLECTION", "COLLECTION", id, details(
                "isDeleted", false
        ));
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/restore")
    public ResponseEntity<Void> restoreCollectionPost(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails principal,
            HttpServletRequest httpRequest
    ) {
        return restoreCollection(id, principal, httpRequest);
    }

    @DeleteMapping("/{id}/permanent")
    public ResponseEntity<Void> permanentDeleteCollection(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails principal,
            HttpServletRequest httpRequest
    ) {
        collectionService.permanentDelete(id);
        log.warn("[ADMIN-COLLECTION-PERMANENT-DELETE] Admin='{}' (ip={}) xóa vĩnh viễn bộ sưu tập id={}",
                RbacAuditRecorder.actorName(principal), RbacAuditRecorder.clientIp(httpRequest), id);
        audit.record(principal, httpRequest, "ADMIN_PERMANENT_DELETE_COLLECTION", "COLLECTION", id, details(
                "permanent", true
        ));
        return ResponseEntity.noContent().build();
    }
}

