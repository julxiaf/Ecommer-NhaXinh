package vn.nhaxinh.catalog;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

@Service
@Transactional
public class CollectionService {

    private static final Logger log = LoggerFactory.getLogger(CollectionService.class);
    private final Path collectionUploadDir = Path.of("uploads/collections").toAbsolutePath().normalize();

    private final CollectionRepository collectionRepository;
    private final ProductRepository productRepository;
    private final ProductService productService;

    public CollectionService(
            CollectionRepository collectionRepository,
            ProductRepository productRepository,
            ProductService productService
    ) {
        this.collectionRepository = collectionRepository;
        this.productRepository = productRepository;
        this.productService = productService;
    }

    public String storeCoverImage(MultipartFile file) {
        if (file == null || file.isEmpty()) return null;
        try {
            Files.createDirectories(collectionUploadDir);
            String ext = "";
            String orig = file.getOriginalFilename();
            if (orig != null && orig.lastIndexOf('.') != -1) {
                ext = orig.substring(orig.lastIndexOf('.')).toLowerCase();
            }
            if (!List.of(".jpg", ".jpeg", ".png", ".webp", ".avif", ".svg", ".gif", ".mp4", ".webm", ".mov").contains(ext)) {
                ext = ".webp";
            }
            String filename = System.currentTimeMillis() + "_" + UUID.randomUUID().toString().substring(0, 8) + ext;
            Path dest = collectionUploadDir.resolve(filename).normalize();
            try (InputStream in = file.getInputStream()) {
                Files.copy(in, dest, StandardCopyOption.REPLACE_EXISTING);
            }
            return "/uploads/collections/" + filename;
        } catch (IOException e) {
            log.error("Failed to store collection cover image", e);
            throw new IllegalStateException("Không thể lưu ảnh bộ sưu tập: " + e.getMessage(), e);
        }
    }

    @Transactional(readOnly = true)
    public List<CollectionDTO.CollectionResponse> findAll(boolean includeDeleted) {
        Sort sort = Sort.by(Sort.Order.asc("sortOrder"), Sort.Order.asc("name"));
        List<Collection> collections = includeDeleted
                ? collectionRepository.findAll(sort)
                : collectionRepository.findByIsDeletedFalse(sort);
        return collections.stream().map(this::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public List<CollectionDTO.CollectionResponse> findTrash() {
        Sort sort = Sort.by(Sort.Order.desc("updatedAt"));
        return collectionRepository.findByIsDeletedTrue(sort).stream().map(this::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public Optional<CollectionDTO.CollectionResponse> findById(Long id) {
        return collectionRepository.findById(id).map(this::toResponse);
    }

    @Transactional(readOnly = true)
    public Optional<CollectionDTO.CollectionResponse> findBySlug(String slug) {
        return collectionRepository.findBySlug(slug)
                .filter(c -> !Boolean.TRUE.equals(c.getIsDeleted()))
                .map(this::toResponse);
    }

    public CollectionDTO.CollectionResponse save(Long id, CollectionDTO.CollectionRequest request, MultipartFile coverImage) {
        return save(id, request, coverImage, null);
    }

    public CollectionDTO.CollectionResponse save(Long id, CollectionDTO.CollectionRequest request, MultipartFile coverImage, String createdBy) {
        String slug = resolveUniqueSlug(request.slug(), id);
        boolean isCreate = (id == null);

        Collection collection = isCreate
                ? new Collection()
                : collectionRepository.findById(id).orElseThrow(() -> new IllegalArgumentException("Không tìm thấy bộ sưu tập id=" + id));
        if (isCreate) {
            collection.setCreatedBy(createdBy != null && !createdBy.isBlank() ? createdBy.trim() : "Quản trị viên");
        }

        String finalImageUrl = request.coverImageUrl();
        if (coverImage != null && !coverImage.isEmpty()) {
            String uploadedUrl = storeCoverImage(coverImage);
            if (uploadedUrl != null) {
                finalImageUrl = uploadedUrl;
            }
        }

        String nextName = request.name().trim();
        String nextStatus = request.status() != null && !request.status().isBlank() ? request.status() : "PUBLISHED";
        Integer nextSortOrder = request.sortOrder() != null ? request.sortOrder() : 0;

        Map<String, Object> changes = new LinkedHashMap<>();
        if (!isCreate) {
            if (!Objects.equals(collection.getName(), nextName)) {
                changes.put("name", Map.of("old", String.valueOf(collection.getName()), "new", nextName));
            }
            if (!Objects.equals(collection.getSlug(), slug)) {
                changes.put("slug", Map.of("old", String.valueOf(collection.getSlug()), "new", slug));
            }
            if (!Objects.equals(collection.getDescription(), request.description())) {
                changes.put("description", Map.of("old", String.valueOf(collection.getDescription()), "new", String.valueOf(request.description())));
            }
            if (finalImageUrl != null && !Objects.equals(collection.getCoverImageUrl(), finalImageUrl)) {
                changes.put("coverImageUrl", Map.of("old", String.valueOf(collection.getCoverImageUrl()), "new", finalImageUrl));
            }
            if (!Objects.equals(collection.getStatus(), nextStatus)) {
                changes.put("status", Map.of("old", String.valueOf(collection.getStatus()), "new", nextStatus));
            }
            if (!Objects.equals(collection.getStartsAt(), request.startsAt())) {
                changes.put("startsAt", Map.of("old", String.valueOf(collection.getStartsAt()), "new", String.valueOf(request.startsAt())));
            }
            if (!Objects.equals(collection.getEndsAt(), request.endsAt())) {
                changes.put("endsAt", Map.of("old", String.valueOf(collection.getEndsAt()), "new", String.valueOf(request.endsAt())));
            }
            if (!Objects.equals(collection.getSortOrder(), nextSortOrder)) {
                changes.put("sortOrder", Map.of("old", String.valueOf(collection.getSortOrder()), "new", String.valueOf(nextSortOrder)));
            }
            if (request.productIds() != null) {
                Set<Long> oldProdIds = collection.getProducts() != null
                        ? collection.getProducts().stream().map(Product::getId).collect(Collectors.toSet())
                        : Set.of();
                Set<Long> newProdIds = new HashSet<>(request.productIds());
                if (!oldProdIds.equals(newProdIds)) {
                    Set<Long> added = new HashSet<>(newProdIds);
                    added.removeAll(oldProdIds);
                    Set<Long> removed = new HashSet<>(oldProdIds);
                    removed.removeAll(newProdIds);
                    changes.put("productIds", Map.of("oldCount", oldProdIds.size(), "newCount", newProdIds.size(), "added", added, "removed", removed));
                }
            }
        }

        collection.setName(nextName);
        collection.setSlug(slug);
        collection.setDescription(request.description());
        if (finalImageUrl != null) {
            collection.setCoverImageUrl(finalImageUrl);
        }
        collection.setStatus(nextStatus);
        collection.setStartsAt(request.startsAt());
        collection.setEndsAt(request.endsAt());
        collection.setSortOrder(nextSortOrder);

        if (request.isDeleted() != null) {
            if (!isCreate && !Objects.equals(collection.getIsDeleted(), request.isDeleted())) {
                changes.put("isDeleted", Map.of("old", String.valueOf(collection.getIsDeleted()), "new", String.valueOf(request.isDeleted())));
            }
            collection.setIsDeleted(request.isDeleted());
            if (request.isDeleted()) {
                collection.setDeletedAt(LocalDateTime.now());
                collection.setStatus("ARCHIVED");
            } else {
                collection.setDeletedAt(null);
            }
        }

        if (request.productIds() != null) {
            Set<Product> products = new HashSet<>(productRepository.findAllById(request.productIds()));
            collection.setProducts(products);
        }

        Collection saved = collectionRepository.save(collection);
        if (isCreate) {
            log.info("[COLLECTION-CREATE] Tạo mới bộ sưu tập id={} name='{}' slug='{}' status='{}' | số sản phẩm={} | người tạo='{}'",
                    saved.getId(), saved.getName(), saved.getSlug(), saved.getStatus(),
                    saved.getProducts() != null ? saved.getProducts().size() : 0, saved.getCreatedBy());
        } else {
            log.info("[COLLECTION-UPDATE] Cập nhật bộ sưu tập id={} name='{}' slug='{}' | Chi tiết các trường thay đổi ({}): {}",
                    saved.getId(), saved.getName(), saved.getSlug(), changes.size(), changes);
        }

        return toResponse(saved);
    }

    public void softDelete(Long id) {
        Collection collection = collectionRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy bộ sưu tập id=" + id));
        collection.setIsDeleted(true);
        collection.setStatus("ARCHIVED");
        collection.setDeletedAt(LocalDateTime.now());
        collectionRepository.save(collection);
        log.warn("[COLLECTION-SOFT-DELETE] Đã xóa mềm bộ sưu tập id={} name='{}'", id, collection.getName());
    }

    public void restore(Long id) {
        Collection collection = collectionRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy bộ sưu tập id=" + id));
        collection.setIsDeleted(false);
        collection.setStatus("PUBLISHED");
        collection.setDeletedAt(null);
        collectionRepository.save(collection);
        log.info("[COLLECTION-RESTORE] Đã khôi phục bộ sưu tập id={} name='{}'", id, collection.getName());
    }

    public void permanentDelete(Long id) {
        Collection collection = collectionRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy bộ sưu tập id=" + id));
        collectionRepository.delete(collection);
        log.warn("[COLLECTION-PERMANENT-DELETE] Đã xóa vĩnh viễn bộ sưu tập id={} name='{}'", id, collection.getName());
    }

    public void deleteById(Long id) {
        softDelete(id);
    }

    public boolean existsBySlug(String slug) {
        return slug != null && collectionRepository.existsBySlug(slug.trim());
    }

    public boolean existsBySlugAndIdNot(String slug, Long id) {
        return slug != null && collectionRepository.existsBySlugAndIdNot(slug.trim(), id);
    }

    public String resolveUniqueSlug(String inputSlug, Long currentId) {
        String base = (inputSlug == null || inputSlug.isBlank()) ? "bo-suu-tap" : inputSlug.trim().toLowerCase();
        base = base.replaceAll("[^a-z0-9-]+", "-").replaceAll("^-+|-+$", "");
        if (base.isBlank()) {
            base = "bo-suu-tap-" + System.currentTimeMillis();
        }

        String candidate = base;
        int count = 1;
        while (currentId == null
                ? collectionRepository.existsBySlug(candidate)
                : collectionRepository.existsBySlugAndIdNot(candidate, currentId)) {
            candidate = base + "-" + count++;
        }
        return candidate;
    }

    private CollectionDTO.CollectionResponse toResponse(Collection collection) {
        List<ProductSummary> productSummaries = collection.getProducts() != null
                ? collection.getProducts().stream()
                        .filter(p -> !Boolean.TRUE.equals(p.getIsDeleted()) && "ACTIVE".equalsIgnoreCase(p.getStatus()))
                        .map(productService::toSummary)
                        .toList()
                : List.of();
        return CollectionDTO.CollectionResponse.from(collection, productSummaries);
    }
}

