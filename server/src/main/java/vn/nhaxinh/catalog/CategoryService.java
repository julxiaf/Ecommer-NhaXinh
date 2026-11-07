package vn.nhaxinh.catalog;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

@Service
@Transactional
public class CategoryService {

    private static final Logger log = LoggerFactory.getLogger(CategoryService.class);
    private final Path categoryUploadDir = Path.of("uploads/categories").toAbsolutePath().normalize();

    private final CategoryRepository repository;

    public CategoryService(CategoryRepository repository) {
        this.repository = repository;
    }

    public String storeCategoryImage(MultipartFile file) {
        if (file == null || file.isEmpty()) return null;
        try {
            Files.createDirectories(categoryUploadDir);
            String ext = "";
            String orig = file.getOriginalFilename();
            if (orig != null && orig.lastIndexOf('.') != -1) {
                ext = orig.substring(orig.lastIndexOf('.')).toLowerCase();
            }
            if (!List.of(".jpg", ".jpeg", ".png", ".webp", ".avif", ".svg", ".gif", ".mp4", ".webm", ".mov").contains(ext)) {
                ext = ".png";
            }
            String filename = System.currentTimeMillis() + "_" + UUID.randomUUID().toString().substring(0, 8) + ext;
            Path dest = categoryUploadDir.resolve(filename).normalize();
            try (InputStream in = file.getInputStream()) {
                Files.copy(in, dest, StandardCopyOption.REPLACE_EXISTING);
            }
            return "/uploads/categories/" + filename;
        } catch (IOException e) {
            log.error("Failed to store category image", e);
            throw new IllegalStateException("Không thể lưu ảnh danh mục: " + e.getMessage(), e);
        }
    }

    @Transactional(readOnly = true)
    public List<Category> findAll() {
        return findAll(false, false, null);
    }

    @Transactional(readOnly = true)
    public List<Category> findAll(boolean includeInactive) {
        return findAll(includeInactive, false, null);
    }

    @Transactional(readOnly = true)
    public List<Category> findAll(boolean includeInactive, boolean includeDeleted) {
        return findAll(includeInactive, includeDeleted, null);
    }

    @Transactional(readOnly = true)
    public List<Category> findAll(boolean includeInactive, boolean includeDeleted, String categoryGroup) {
        Sort sort = Sort.by(Sort.Order.asc("sortOrder"), Sort.Order.asc("name"));
        if (categoryGroup != null && !categoryGroup.isBlank()) {
            String group = categoryGroup.trim().toUpperCase();
            if (includeDeleted) {
                return repository.findByCategoryGroup(group, sort);
            }
            if (includeInactive) {
                return repository.findByCategoryGroupAndIsDeletedFalse(group, sort);
            }
            return repository.findByCategoryGroupAndIsActiveTrueAndIsDeletedFalse(group, sort);
        }
        if (includeDeleted) {
            return repository.findAll(sort);
        }
        if (includeInactive) {
            return repository.findByIsDeletedFalse(sort);
        }
        return repository.findByIsActiveTrueAndIsDeletedFalse(sort);
    }

    @Transactional(readOnly = true)
    public List<Category> findTrash() {
        Sort sort = Sort.by(Sort.Order.desc("updatedAt"));
        return repository.findByIsDeletedTrue(sort);
    }

    @Transactional(readOnly = true)
    public List<Category> findCollections() {
        Sort sort = Sort.by(Sort.Order.asc("sortOrder"), Sort.Order.asc("name"));
        return repository.findByCategoryGroupAndIsActiveTrueAndIsDeletedFalse("COLLECTION", sort);
    }

    @Transactional(readOnly = true)
    public List<Category> findRooms() {
        Sort sort = Sort.by(Sort.Order.asc("sortOrder"), Sort.Order.asc("name"));
        return repository.findByCategoryGroupAndIsActiveTrueAndIsDeletedFalse("ROOM", sort);
    }

    @Transactional(readOnly = true)
    public List<Category> findProductCategories() {
        Sort sort = Sort.by(Sort.Order.asc("sortOrder"), Sort.Order.asc("name"));
        return repository.findByCategoryGroupAndIsActiveTrueAndIsDeletedFalse("PRODUCT", sort);
    }

    @Transactional(readOnly = true)
    public Optional<Category> findById(Long id) {
        return repository.findById(id);
    }

    @Transactional(readOnly = true)
    public Optional<Category> findBySlug(String slug) {
        return repository.findBySlug(slug);
    }

    @Transactional(readOnly = true)
    public List<Category> findRootCategories() {
        return repository.findByParentIsNullAndIsActiveTrueAndIsDeletedFalseOrderBySortOrderAsc();
    }

    @Transactional(readOnly = true)
    public List<Category> findSubCategories(Long parentId) {
        return repository.findByParentIdAndIsActiveTrueAndIsDeletedFalseOrderBySortOrderAsc(parentId);
    }

    public Category save(Category category) {
        return repository.save(category);
    }

    public Category save(Long id, CategoryRequest request) {
        return save(id, request, null);
    }

    public Category save(Long id, CategoryRequest request, MultipartFile imageFile) {
        return save(id, request, imageFile, null);
    }

    public Category save(Long id, CategoryRequest request, MultipartFile imageFile, String createdBy) {
        String slug = resolveUniqueCategorySlug(request.slug(), id);
        boolean isCreate = (id == null);

        Category category = isCreate
                ? new Category()
                : repository.findById(id).orElseThrow(() -> new IllegalArgumentException("Không tìm thấy danh mục"));
        if (isCreate) {
            category.setCreatedBy(createdBy != null && !createdBy.isBlank() ? createdBy.trim() : "Quản trị viên");
        }
        Category parent = null;
        if (request.parentId() != null) {
            parent = repository.findById(request.parentId())
                    .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy danh mục cha"));
            Category ancestor = parent;
            while (ancestor != null) {
                if (id != null && id.equals(ancestor.getId())) {
                    throw new IllegalArgumentException("Không thể tạo vòng lặp phân cấp danh mục");
                }
                ancestor = ancestor.getParent();
            }
        }

        String finalImageUrl = request.imageUrl();
        if (imageFile != null && !imageFile.isEmpty()) {
            String uploadedUrl = storeCategoryImage(imageFile);
            if (uploadedUrl != null) {
                finalImageUrl = uploadedUrl;
            }
        }

        String nextName = request.name().trim();
        Integer nextSortOrder = request.sortOrder() == null ? 0 : request.sortOrder();
        Boolean nextIsActive = request.isActive() == null
                ? category.getIsActive() == null || category.getIsActive()
                : request.isActive();
        String nextGroup = category.getCategoryGroup();
        if (request.categoryGroup() != null && !request.categoryGroup().isBlank()) {
            nextGroup = request.categoryGroup().trim().toUpperCase();
        } else if (Boolean.TRUE.equals(request.isCollection())) {
            nextGroup = "COLLECTION";
        } else if (nextGroup == null) {
            nextGroup = "PRODUCT";
        }

        Map<String, Object> changes = new LinkedHashMap<>();
        if (!isCreate) {
            Long oldParentId = category.getParent() != null ? category.getParent().getId() : null;
            Long newParentId = parent != null ? parent.getId() : null;
            if (!Objects.equals(category.getName(), nextName)) {
                changes.put("name", Map.of("old", String.valueOf(category.getName()), "new", nextName));
            }
            if (!Objects.equals(category.getSlug(), slug)) {
                changes.put("slug", Map.of("old", String.valueOf(category.getSlug()), "new", slug));
            }
            if (!Objects.equals(oldParentId, newParentId)) {
                changes.put("parentId", Map.of("old", String.valueOf(oldParentId), "new", String.valueOf(newParentId)));
            }
            if (!Objects.equals(category.getDescription(), request.description())) {
                changes.put("description", Map.of("old", String.valueOf(category.getDescription()), "new", String.valueOf(request.description())));
            }
            if (!Objects.equals(category.getImageUrl(), finalImageUrl)) {
                changes.put("imageUrl", Map.of("old", String.valueOf(category.getImageUrl()), "new", String.valueOf(finalImageUrl)));
            }
            if (!Objects.equals(category.getSortOrder(), nextSortOrder)) {
                changes.put("sortOrder", Map.of("old", String.valueOf(category.getSortOrder()), "new", String.valueOf(nextSortOrder)));
            }
            if (!Objects.equals(category.getIsActive(), nextIsActive)) {
                changes.put("isActive", Map.of("old", String.valueOf(category.getIsActive()), "new", String.valueOf(nextIsActive)));
            }
            if (!Objects.equals(category.getCategoryGroup(), nextGroup)) {
                changes.put("categoryGroup", Map.of("old", String.valueOf(category.getCategoryGroup()), "new", String.valueOf(nextGroup)));
            }
        }

        category.setName(nextName);
        category.setSlug(slug);
        category.setParent(parent);
        category.setDescription(request.description());
        category.setImageUrl(finalImageUrl);
        category.setSortOrder(nextSortOrder);
        category.setIsActive(nextIsActive);
        if (request.isDeleted() != null) {
            if (!isCreate && !Objects.equals(category.getIsDeleted(), request.isDeleted())) {
                changes.put("isDeleted", Map.of("old", String.valueOf(category.getIsDeleted()), "new", String.valueOf(request.isDeleted())));
            }
            category.setIsDeleted(request.isDeleted());
            if (request.isDeleted()) {
                category.setDeletedAt(java.time.LocalDateTime.now());
            } else {
                category.setDeletedAt(null);
            }
        }
        category.setCategoryGroup(nextGroup);
        Category saved = repository.save(category);

        if (isCreate) {
            log.info("[CATEGORY-CREATE] Tạo mới danh mục id={} name='{}' slug='{}' group='{}' parentId={} sortOrder={} isActive={} | người tạo='{}'",
                    saved.getId(), saved.getName(), saved.getSlug(), saved.getCategoryGroup(),
                    parent != null ? parent.getId() : null, saved.getSortOrder(), saved.getIsActive(), saved.getCreatedBy());
        } else {
            log.info("[CATEGORY-UPDATE] Cập nhật danh mục id={} name='{}' slug='{}' | Chi tiết các trường thay đổi ({}): {}",
                    saved.getId(), saved.getName(), saved.getSlug(), changes.size(), changes);
        }
        return saved;
    }

    public void setActive(Long id, Boolean isActive) {
        Category category = repository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy danh mục"));
        Boolean oldActive = category.getIsActive();
        Boolean oldDeleted = category.getIsDeleted();
        category.setIsActive(isActive);
        if (Boolean.FALSE.equals(isActive)) {
            category.setIsDeleted(true);
            category.setDeletedAt(java.time.LocalDateTime.now());
        } else {
            category.setIsDeleted(false);
            category.setDeletedAt(null);
        }
        repository.save(category);
        log.info("[CATEGORY-STATUS-UPDATE] Đổi trạng thái danh mục id={} name='{}' | isActive: [{} -> {}] | isDeleted: [{} -> {}]",
                id, category.getName(), oldActive, category.getIsActive(), oldDeleted, category.getIsDeleted());
    }

    public void softDelete(Long id) {
        Category category = repository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy danh mục id=" + id));
        category.setIsDeleted(true);
        category.setIsActive(false);
        category.setDeletedAt(java.time.LocalDateTime.now());
        repository.save(category);
        log.warn("[CATEGORY-SOFT-DELETE] Đã xóa mềm danh mục/bộ sưu tập id={} name='{}'", id, category.getName());
    }

    public void restore(Long id) {
        Category category = repository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy danh mục id=" + id));
        category.setIsDeleted(false);
        category.setIsActive(true);
        category.setDeletedAt(null);
        repository.save(category);
        log.info("[CATEGORY-RESTORE] Đã khôi phục danh mục/bộ sưu tập id={} name='{}'", id, category.getName());
    }

    public void permanentDelete(Long id) {
        Category category = repository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy danh mục id=" + id));
        repository.delete(category);
        log.warn("[CATEGORY-PERMANENT-DELETE] Đã xóa vĩnh viễn danh mục/bộ sưu tập id={} name='{}'", id, category.getName());
    }

    public void deleteById(Long id) {
        softDelete(id);
    }

    public boolean existsBySlug(String slug) {
        return slug != null && repository.existsBySlug(slug.trim());
    }

    public boolean existsBySlugAndIdNot(String slug, Long id) {
        return slug != null && repository.existsBySlugAndIdNot(slug.trim(), id);
    }

    /**
     * Tự động xử lý trùng slug danh mục: nếu slug đã tồn tại ở danh mục khác,
     * tự động thêm hậu tố -1, -2, -3... đảm bảo tính duy nhất và an toàn.
     */
    public String resolveUniqueCategorySlug(String inputSlug, Long currentCategoryId) {
        String base = (inputSlug == null || inputSlug.isBlank()) ? "danh-muc" : inputSlug.trim().toLowerCase();
        base = base.replaceAll("[^a-z0-9-]+", "-").replaceAll("^-+|-+$", "");
        if (base.isBlank()) {
            base = "danh-muc-" + System.currentTimeMillis();
        }

        String candidate = base;
        int count = 1;
        while (currentCategoryId == null
                ? repository.existsBySlug(candidate)
                : repository.existsBySlugAndIdNot(candidate, currentCategoryId)) {
            candidate = base + "-" + count++;
        }
        return candidate;
    }
}
