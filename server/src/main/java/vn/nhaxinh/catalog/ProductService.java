package vn.nhaxinh.catalog;

import java.net.URI;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.Set;
import org.springframework.web.multipart.MultipartFile;
import vn.nhaxinh.inventory.Inventory;
import vn.nhaxinh.inventory.InventoryMovement;
import vn.nhaxinh.inventory.InventoryService;
import java.nio.file.Files;
import java.nio.file.Path;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import com.fasterxml.jackson.databind.ObjectMapper;
import vn.nhaxinh.audit.AuditLogService;
import vn.nhaxinh.user.User;
import vn.nhaxinh.user.UserRepository;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

@Service
@Transactional
public class ProductService {

    private static final Logger log = LoggerFactory.getLogger(ProductService.class);

    private final ProductRepository productRepository;
    private final ProductVariantRepository variantRepository;
    private final ProductMediaRepository mediaRepository;
    private final CategoryRepository categoryRepository;
    private final BrandRepository brandRepository;
    private final InventoryService inventoryService;
    private final ProductMediaStorage mediaStorage;
    private final AuditLogService auditLogService;
    private final UserRepository userRepository;
    private final ObjectMapper objectMapper;

    public ProductService(
            ProductRepository productRepository,
            ProductVariantRepository variantRepository,
            ProductMediaRepository mediaRepository,
            CategoryRepository categoryRepository,
            BrandRepository brandRepository,
            InventoryService inventoryService,
            ProductMediaStorage mediaStorage,
            AuditLogService auditLogService,
            UserRepository userRepository,
            ObjectMapper objectMapper
    ) {
        this.productRepository = productRepository;
        this.variantRepository = variantRepository;
        this.mediaRepository = mediaRepository;
        this.categoryRepository = categoryRepository;
        this.brandRepository = brandRepository;
        this.inventoryService = inventoryService;
        this.mediaStorage = mediaStorage;
        this.auditLogService = auditLogService;
        this.userRepository = userRepository;
        this.objectMapper = objectMapper;
    }

    @Transactional(readOnly = true)
    public Page<Product> findPublishedProducts(Pageable pageable) {
        return productRepository.findByStatus("ACTIVE", pageable);
    }

    @Transactional(readOnly = true)
    public Optional<Product> findById(Long id) {
        return productRepository.findById(id);
    }

    @Transactional(readOnly = true)
    public Optional<Product> findByIdAndStatus(Long id, String status) {
        return productRepository.findByIdAndStatus(id, status);
    }

    @Transactional(readOnly = true)
    public Optional<Product> findBySlug(String slug) {
        return productRepository.findBySlug(slug);
    }

    @Transactional(readOnly = true)
    public Optional<Product> findBySlugAndStatus(String slug, String status) {
        return productRepository.findBySlugAndStatus(slug, status);
    }

    @Transactional(readOnly = true)
    public Page<Product> findByCategory(Long categoryId, Pageable pageable) {
        return productRepository.findByCategoryId(categoryId, pageable);
    }

    @Transactional(readOnly = true)
    public Page<Product> findByBrand(Long brandId, Pageable pageable) {
        return productRepository.findByBrandId(brandId, pageable);
    }

    @Transactional(readOnly = true)
    public Page<Product> search(String keyword, Pageable pageable) {
        return productRepository.searchByNameOrDescription(keyword, pageable);
    }

    // --- Summary projections (with images, promotional price, stock & category) ---

    @Transactional(readOnly = true)
    public Page<ProductSummary> findActiveSummaries(Pageable pageable) {
        return productRepository.findByStatus("ACTIVE", pageable).map(this::toSummary);
    }

    @Transactional(readOnly = true)
    public Page<ProductSummary> findActiveSummariesByCategory(Long categoryId, Pageable pageable) {
        return productRepository.findByCategoryId(categoryId, pageable).map(this::toSummary);
    }

    @Transactional(readOnly = true)
    public Page<ProductSummary> findActiveSummariesByBrand(Long brandId, Pageable pageable) {
        return productRepository.findByBrandId(brandId, pageable).map(this::toSummary);
    }

    @Transactional(readOnly = true)
    public Page<ProductSummary> searchActiveSummaries(String keyword, Pageable pageable) {
        return productRepository.searchByNameOrDescription(keyword, pageable).map(this::toSummary);
    }

    /**
     * Chuyển đổi Product entity thành ProductSummary đầy đủ ảnh, giá khuyến mại, danh mục.
     */
    public ProductSummary toSummary(Product p) {
        // 1. Tìm variant có giá bán thấp nhất (minPrice) và giá gốc (compareAtPrice)
        java.math.BigDecimal minPrice = null;
        java.math.BigDecimal compareAtPrice = null;
        Long defaultVariantId = null;
        long totalStock = 0L;

        if (p.getVariants() != null) {
            for (ProductVariant v : p.getVariants()) {
                if ("ACTIVE".equalsIgnoreCase(v.getStatus()) && v.getPrice() != null) {
                    if (minPrice == null || v.getPrice().compareTo(minPrice) < 0) {
                        minPrice = v.getPrice();
                        compareAtPrice = v.getCompareAtPrice();
                        defaultVariantId = v.getId();
                    }
                }
                if (v.getId() != null && inventoryService != null) {
                    try {
                        totalStock += inventoryService.findByVariantId(v.getId())
                                .map(inv -> Math.max(0L, (long) inv.getQuantityOnHand() - (long) inv.getQuantityReserved()))
                                .orElse(0L);
                    } catch (Exception ignored) {
                    }
                }
            }
        }

        // Tính phần trăm giảm giá nếu có giá gốc cao hơn giá bán
        Integer discount = null;
        if (compareAtPrice != null && minPrice != null && compareAtPrice.compareTo(minPrice) > 0) {
            java.math.BigDecimal diff = compareAtPrice.subtract(minPrice);
            discount = diff.multiply(java.math.BigDecimal.valueOf(100))
                    .divide(compareAtPrice, 0, java.math.RoundingMode.HALF_UP)
                    .intValue();
        }

        // 2. Tìm ảnh đại diện chính (image) và ảnh thứ 2 (image2)
        String primaryImage = null;
        String secondaryImage = null;
        if (p.getMedia() != null && !p.getMedia().isEmpty()) {
            List<ProductMedia> sortedMedia = p.getMedia().stream()
                    .sorted((m1, m2) -> {
                        int p1 = Boolean.TRUE.equals(m1.getIsPrimary()) ? 0 : 1;
                        int p2 = Boolean.TRUE.equals(m2.getIsPrimary()) ? 0 : 1;
                        if (p1 != p2) return Integer.compare(p1, p2);
                        return Integer.compare(
                                m1.getSortOrder() != null ? m1.getSortOrder() : 0,
                                m2.getSortOrder() != null ? m2.getSortOrder() : 0
                        );
                    })
                    .toList();

            if (!sortedMedia.isEmpty()) {
                primaryImage = sortedMedia.get(0).getMediaUrl();
            }
            if (sortedMedia.size() > 1) {
                secondaryImage = sortedMedia.get(1).getMediaUrl();
            }
        }

        // 3. Lấy tên danh mục và thương hiệu
        String categoryName = null;
        if (p.getCategories() != null && !p.getCategories().isEmpty()) {
            categoryName = p.getCategories().iterator().next().getName();
        }
        String brandName = p.getBrand() != null ? p.getBrand().getName() : null;

        return new ProductSummary(
                p.getId(),
                p.getName(),
                p.getSlug(),
                p.getShortDescription(),
                minPrice,
                compareAtPrice,
                discount,
                primaryImage,
                secondaryImage,
                categoryName,
                brandName,
                totalStock,
                defaultVariantId,
                p.getIsPreorder(),
                p.getStockStatus()
        );
    }

    public Product save(Product product) {
        return productRepository.save(product);
    }

    @Transactional(readOnly = true)
    public List<ProductDetailResponse> findAdminProducts() {
        return productRepository.findAll(Sort.by(Sort.Order.desc("updatedAt"), Sort.Order.asc("name")))
                .stream()
                .map(product -> ProductDetailResponse.from(product, variantId -> {
                    boolean isPre = Boolean.TRUE.equals(product.getIsPreorder()) || "PRE_ORDER".equalsIgnoreCase(product.getStockStatus());
                    return inventoryService.findByVariantId(variantId)
                            .map(inventory -> {
                                int qty = Math.max(0, inventory.getQuantityOnHand() - inventory.getQuantityReserved());
                                return new ProductDetailResponse.StockInfo(qty, qty > 0 && !isPre, isPre, isPre ? "PRE_ORDER" : (qty > 0 ? "IN_STOCK" : "OUT_OF_STOCK"));
                            })
                            .orElse(new ProductDetailResponse.StockInfo(0, false, isPre, isPre ? "PRE_ORDER" : "OUT_OF_STOCK"));
                }))
                .toList();
    }

    public ProductDetailResponse createProduct(CreateProductRequest request, List<MultipartFile> files) {
        if (productRepository.existsBySlug(request.slug())) {
            throw new IllegalArgumentException("Slug sản phẩm đã tồn tại");
        }

        Product product = new Product();
        product.setName(request.name().trim());
        product.setSlug(request.slug());
        product.setShortDescription(request.shortDescription());
        product.setDescription(request.description());
        product.setSpecifications(request.specifications());
        product.setStatus(request.status() == null ? "DRAFT" : request.status());
        if (request.brandId() != null) {
            product.setBrand(brandRepository.findById(request.brandId())
                    .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy thương hiệu")));
        }
        if (request.categoryIds() != null) {
            Set<Long> categoryIds = new HashSet<>(request.categoryIds());
            if (categoryIds.size() != request.categoryIds().size()) {
                throw new IllegalArgumentException("Danh mục sản phẩm bị trùng");
            }
            product.setCategories(new HashSet<>(categoryRepository.findAllById(categoryIds)));
            if (product.getCategories().size() != categoryIds.size()) {
                throw new IllegalArgumentException("Không tìm thấy một hoặc nhiều danh mục");
            }
        }

        Set<String> skus = new HashSet<>();
        for (CreateProductRequest.VariantRequest variantRequest : request.variants()) {
            String sku = variantRequest.sku().trim();
            if (!skus.add(sku.toLowerCase(Locale.ROOT)) || variantRepository.existsBySku(sku)) {
                throw new IllegalArgumentException("SKU đã tồn tại: " + sku);
            }
            ProductVariant variant = new ProductVariant();
            variant.setProduct(product);
            variant.setSku(sku);
            variant.setName(variantRequest.name().trim());
            variant.setOptionValues(variantRequest.optionValues());
            variant.setPrice(variantRequest.price());
            variant.setCompareAtPrice(variantRequest.compareAtPrice());
            variant.setCostPrice(variantRequest.costPrice());
            variant.setWeightGrams(variantRequest.weightGrams());
            variant.setWidthMm(variantRequest.widthMm());
            variant.setHeightMm(variantRequest.heightMm());
            variant.setDepthMm(variantRequest.depthMm());
            product.getVariants().add(variant);
        }

        List<MultipartFile> uploadedFiles = files == null ? List.of() : files;
        List<CreateProductRequest.MediaRequest> mediaRequests =
                request.media() == null ? List.of() : request.media();
        validateMediaRequests(mediaRequests, uploadedFiles);
        long primaryCount = mediaRequests.stream().filter(media -> Boolean.TRUE.equals(media.isPrimary())).count();
        if (primaryCount > 1) {
            throw new IllegalArgumentException("Chỉ được chọn một media chính");
        }
        if (mediaRequests.stream().anyMatch(media ->
                Boolean.TRUE.equals(media.isPrimary()) && !"IMAGE".equals(media.mediaType()))) {
            throw new IllegalArgumentException("Media chính phải là ảnh");
        }

        for (CreateProductRequest.MediaRequest mediaRequest : mediaRequests) {
            String mediaUrl;
            if (mediaRequest.fileIndex() != null) {
                mediaUrl = mediaStorage.store(uploadedFiles.get(mediaRequest.fileIndex()), mediaRequest.mediaType());
            } else {
                mediaUrl = mediaRequest.mediaUrl().trim();
                validateMediaUrl(mediaUrl);
            }

            ProductMedia media = new ProductMedia();
            media.setProduct(product);
            media.setMediaType(mediaRequest.mediaType());
            media.setMediaUrl(mediaUrl);
            media.setAltText(mediaRequest.altText());
            media.setSortOrder(mediaRequest.sortOrder() == null ? 0 : mediaRequest.sortOrder());
            media.setIsPrimary(Boolean.TRUE.equals(mediaRequest.isPrimary()));
            product.getMedia().add(media);
        }

        Product savedProduct = productRepository.saveAndFlush(product);
        List<Map<String, Object>> createdVariantsLog = new ArrayList<>();
        for (int i = 0; i < request.variants().size(); i++) {
            int initialStock = request.variants().get(i).initialStock() == null
                    ? 0
                    : request.variants().get(i).initialStock();
            ProductVariant variant = product.getVariants().get(i);
            createdVariantsLog.add(Map.of(
                    "sku", variant.getSku(),
                    "name", variant.getName(),
                    "price", variant.getPrice() != null ? variant.getPrice() : 0,
                    "initialStock", initialStock
            ));
            if (initialStock > 0) {
                inventoryService.save(new Inventory(variant, initialStock, 0, 0));
                InventoryMovement movement = new InventoryMovement();
                movement.setVariant(variant);
                movement.setMovementType("IN");
                movement.setQuantity(initialStock);
                movement.setReferenceType("PRODUCT_CREATE");
                movement.setReferenceId(savedProduct.getId());
                movement.setNote("Tồn kho khởi tạo khi tạo sản phẩm");
                inventoryService.recordMovement(movement);
            } else {
                inventoryService.save(new Inventory(variant, 0, 0, 0));
            }
        }

        log.info("[PRODUCT-CREATE] Đã tạo sản phẩm id={} slug='{}' tên='{}' (thương hiệu={}, danh mục={}) | Thêm mới {} biến thể: {}",
                savedProduct.getId(), savedProduct.getSlug(), savedProduct.getName(),
                savedProduct.getBrand() != null ? savedProduct.getBrand().getName() : "N/A",
                savedProduct.getCategories().stream().map(Category::getName).toList(),
                createdVariantsLog.size(), createdVariantsLog);

        recordAudit("PRODUCT_CREATE", "PRODUCT", savedProduct.getId(), Map.of(
                "productId", savedProduct.getId(),
                "name", savedProduct.getName(),
                "slug", savedProduct.getSlug(),
                "status", savedProduct.getStatus(),
                "brandId", savedProduct.getBrand() != null ? savedProduct.getBrand().getId() : "N/A",
                "categories", savedProduct.getCategories().stream().map(Category::getId).toList(),
                "variantsCount", createdVariantsLog.size(),
                "addedVariants", createdVariantsLog
        ));

        return ProductDetailResponse.from(savedProduct, variantId -> {
            boolean isPre = Boolean.TRUE.equals(savedProduct.getIsPreorder()) || "PRE_ORDER".equalsIgnoreCase(savedProduct.getStockStatus());
            return inventoryService.findByVariantId(variantId)
                    .map(inventory -> {
                        int qty = Math.max(0, inventory.getQuantityOnHand() - inventory.getQuantityReserved());
                        return new ProductDetailResponse.StockInfo(qty, qty > 0 && !isPre, isPre, isPre ? "PRE_ORDER" : (qty > 0 ? "IN_STOCK" : "OUT_OF_STOCK"));
                    })
                    .orElse(new ProductDetailResponse.StockInfo(0, false, isPre, isPre ? "PRE_ORDER" : "OUT_OF_STOCK"));
        });
    }

    public ProductDetailResponse updateProduct(Long id, CreateProductRequest request, List<MultipartFile> files) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy sản phẩm"));
        if (productRepository.existsBySlugAndIdNot(request.slug(), id)) {
            throw new IllegalArgumentException("Slug sản phẩm đã tồn tại");
        }

        // 1. Phân tích chi tiết thay đổi thuộc tính sản phẩm (update gì)
        Map<String, Object> productChanges = new LinkedHashMap<>();
        if (!Objects.equals(product.getName(), request.name().trim())) {
            productChanges.put("name", Map.of("old", product.getName(), "new", request.name().trim()));
        }
        if (!Objects.equals(product.getSlug(), request.slug())) {
            productChanges.put("slug", Map.of("old", product.getSlug(), "new", request.slug()));
        }
        if (request.status() != null && !Objects.equals(product.getStatus(), request.status())) {
            productChanges.put("status", Map.of("old", product.getStatus(), "new", request.status()));
        }
        if (!Objects.equals(product.getShortDescription(), request.shortDescription())) {
            productChanges.put("shortDescription", "Đã cập nhật mô tả ngắn");
        }
        if (!Objects.equals(product.getDescription(), request.description())) {
            productChanges.put("description", "Đã cập nhật mô tả chi tiết");
        }
        if (!Objects.equals(product.getSpecifications(), request.specifications())) {
            productChanges.put("specifications", "Đã cập nhật thông số kỹ thuật");
        }
        Long oldBrandId = product.getBrand() != null ? product.getBrand().getId() : null;
        if (!Objects.equals(oldBrandId, request.brandId())) {
            productChanges.put("brandId", Map.of("old", String.valueOf(oldBrandId), "new", String.valueOf(request.brandId())));
        }
        Set<Long> oldCategoryIds = product.getCategories().stream().map(Category::getId).collect(Collectors.toSet());
        Set<Long> newCategoryIds = request.categoryIds() != null ? new HashSet<>(request.categoryIds()) : Set.of();
        if (!oldCategoryIds.equals(newCategoryIds)) {
            productChanges.put("categoryIds", Map.of("old", oldCategoryIds, "new", newCategoryIds));
        }

        // 2. Phân tích chi tiết thay đổi biến thể (thêm gì, update gì, xóa/ẩn gì)
        Map<String, ProductVariant> existingVariantsBySku = new HashMap<>();
        for (ProductVariant v : product.getVariants()) {
            existingVariantsBySku.put(v.getSku().toLowerCase(Locale.ROOT), v);
        }

        List<Map<String, Object>> addedVariants = new ArrayList<>();
        List<Map<String, Object>> updatedVariants = new ArrayList<>();
        List<Map<String, Object>> removedVariants = new ArrayList<>();

        Set<String> incomingSkus = new HashSet<>();
        for (CreateProductRequest.VariantRequest vr : request.variants()) {
            String cleanSku = vr.sku().trim();
            incomingSkus.add(cleanSku.toLowerCase(Locale.ROOT));
            ProductVariant existing = existingVariantsBySku.get(cleanSku.toLowerCase(Locale.ROOT));
            if (existing == null) {
                // Biến thể thêm mới
                addedVariants.add(Map.of(
                        "sku", cleanSku,
                        "name", vr.name(),
                        "price", vr.price() != null ? vr.price() : 0,
                        "initialStock", vr.initialStock() != null ? vr.initialStock() : 0
                ));
            } else {
                // Biến thể cũ được cập nhật
                Map<String, Object> varFieldChanges = new LinkedHashMap<>();
                if (!Objects.equals(existing.getName(), vr.name().trim())) {
                    varFieldChanges.put("name", Map.of("old", existing.getName(), "new", vr.name().trim()));
                }
                if (existing.getPrice() == null || existing.getPrice().compareTo(vr.price()) != 0) {
                    varFieldChanges.put("price", Map.of("old", existing.getPrice(), "new", vr.price()));
                }
                if (!Objects.equals(existing.getCompareAtPrice(), vr.compareAtPrice())) {
                    varFieldChanges.put("compareAtPrice", Map.of("old", String.valueOf(existing.getCompareAtPrice()), "new", String.valueOf(vr.compareAtPrice())));
                }
                if (!Objects.equals(existing.getCostPrice(), vr.costPrice())) {
                    varFieldChanges.put("costPrice", Map.of("old", String.valueOf(existing.getCostPrice()), "new", String.valueOf(vr.costPrice())));
                }
                if (!Objects.equals(existing.getWeightGrams(), vr.weightGrams())) {
                    varFieldChanges.put("weightGrams", Map.of("old", String.valueOf(existing.getWeightGrams()), "new", String.valueOf(vr.weightGrams())));
                }
                if (!"ACTIVE".equals(existing.getStatus())) {
                    varFieldChanges.put("status", Map.of("old", existing.getStatus(), "new", "ACTIVE"));
                }
                if (!varFieldChanges.isEmpty()) {
                    updatedVariants.add(Map.of("sku", cleanSku, "changes", varFieldChanges));
                }
            }
        }

        // Biến thể bị xóa / ẩn (không còn trong incoming variants)
        for (ProductVariant existing : product.getVariants()) {
            if (!incomingSkus.contains(existing.getSku().toLowerCase(Locale.ROOT)) && !"INACTIVE".equals(existing.getStatus())) {
                removedVariants.add(Map.of(
                        "sku", existing.getSku(),
                        "name", existing.getName(),
                        "action", "SET_INACTIVE"
                ));
            }
        }

        // 3. Tiến hành cập nhật
        product.setName(request.name().trim());
        product.setSlug(request.slug());
        product.setShortDescription(request.shortDescription());
        product.setDescription(request.description());
        product.setSpecifications(request.specifications());
        if (request.status() != null) {
            product.setStatus(request.status());
        }
        product.setBrand(request.brandId() == null ? null : brandRepository.findById(request.brandId())
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy thương hiệu")));
        product.setCategories(resolveCategories(request.categoryIds()));
        reconcileVariants(product, request.variants());

        List<MultipartFile> uploadedFiles = files == null ? List.of() : files;
        List<CreateProductRequest.MediaRequest> mediaRequests =
                request.media() == null ? List.of() : request.media();
        validateMediaRequests(mediaRequests, uploadedFiles);
        validatePrimaryMedia(mediaRequests);

        product.getMedia().clear();
        addMedia(product, mediaRequests, uploadedFiles);

        Product savedProduct = productRepository.saveAndFlush(product);
        createInitialInventoryForNewVariants(savedProduct, request.variants());

        // 4. Ghi log chi tiết SLF4J
        log.info("[PRODUCT-UPDATE] Cập nhật sản phẩm id={} code='{}' | Thuộc tính thay đổi: {} | Biến thể thêm mới ({}): {} | Biến thể cập nhật ({}): {} | Biến thể vô hiệu hóa ({}): {}",
                id, savedProduct.getSlug(), productChanges,
                addedVariants.size(), addedVariants,
                updatedVariants.size(), updatedVariants,
                removedVariants.size(), removedVariants);

        // 5. Ghi AuditLog
        recordAudit("PRODUCT_UPDATE", "PRODUCT", id, Map.of(
                "productId", id,
                "productSlug", savedProduct.getSlug(),
                "productChanges", productChanges,
                "addedVariants", addedVariants,
                "updatedVariants", updatedVariants,
                "removedVariants", removedVariants
        ));

        return toAdminDetail(savedProduct);
    }

    public void setStatus(Long id, String status) {
        if (status == null || !Set.of("DRAFT", "ACTIVE", "ARCHIVED").contains(status)) {
            throw new IllegalArgumentException("Trạng thái sản phẩm không hợp lệ");
        }
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy sản phẩm"));
        String oldStatus = product.getStatus();
        product.setStatus(status);
        productRepository.save(product);

        log.info("[PRODUCT-STATUS] Đổi trạng thái sản phẩm id={} (tên='{}'): {} -> {}",
                id, product.getName(), oldStatus, status);

        recordAudit("PRODUCT_STATUS_UPDATE", "PRODUCT", id, Map.of(
                "productId", id,
                "productName", product.getName(),
                "oldStatus", oldStatus,
                "newStatus", status
        ));
    }

    private void recordAudit(String action, String entityType, Object entityId, Map<String, Object> details) {
        try {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            String username = (auth != null && auth.isAuthenticated()) ? auth.getName() : "SYSTEM";
            User actor = userRepository.findByUsername(username).orElse(null);
            String json = objectMapper.writeValueAsString(details);
            auditLogService.record(actor, action, entityType, String.valueOf(entityId), json, null);
        } catch (Exception ex) {
            log.error("[PRODUCT-AUDIT-ERROR] Không thể ghi audit log: action={} | entityId={} | err={}",
                    action, entityId, ex.getMessage());
        }
    }

    private Set<Category> resolveCategories(List<Long> categoryIds) {
        if (categoryIds == null || categoryIds.isEmpty()) {
            return new HashSet<>();
        }
        Set<Long> uniqueIds = new HashSet<>(categoryIds);
        if (uniqueIds.size() != categoryIds.size()) {
            throw new IllegalArgumentException("Danh mục sản phẩm bị trùng");
        }
        Set<Category> categories = new HashSet<>(categoryRepository.findAllById(uniqueIds));
        if (categories.size() != uniqueIds.size()) {
            throw new IllegalArgumentException("Không tìm thấy một hoặc nhiều danh mục");
        }
        return categories;
    }

    private void reconcileVariants(Product product, List<CreateProductRequest.VariantRequest> requests) {
        Set<String> incomingSkus = new HashSet<>();
        for (CreateProductRequest.VariantRequest request : requests) {
            String sku = request.sku().trim();
            if (!incomingSkus.add(sku.toLowerCase(Locale.ROOT))) {
                throw new IllegalArgumentException("SKU bị trùng: " + sku);
            }
            ProductVariant variant = variantRepository.findBySku(sku).orElse(null);
            if (variant != null && !product.getId().equals(variant.getProduct().getId())) {
                throw new IllegalArgumentException("SKU đã tồn tại: " + sku);
            }
            if (variant == null) {
                variant = new ProductVariant();
                variant.setProduct(product);
                product.getVariants().add(variant);
            }
            applyVariant(variant, request, sku);
        }

        for (ProductVariant variant : product.getVariants()) {
            if (!incomingSkus.contains(variant.getSku().toLowerCase(Locale.ROOT))) {
                variant.setStatus("INACTIVE");
            }
        }
    }

    private static void applyVariant(
            ProductVariant variant,
            CreateProductRequest.VariantRequest request,
            String sku
    ) {
        variant.setSku(sku);
        variant.setName(request.name().trim());
        variant.setOptionValues(request.optionValues());
        variant.setPrice(request.price());
        variant.setCompareAtPrice(request.compareAtPrice());
        variant.setCostPrice(request.costPrice());
        variant.setWeightGrams(request.weightGrams());
        variant.setWidthMm(request.widthMm());
        variant.setHeightMm(request.heightMm());
        variant.setDepthMm(request.depthMm());
        variant.setStatus("ACTIVE");
    }

    private void createInitialInventoryForNewVariants(
            Product product,
            List<CreateProductRequest.VariantRequest> requests
    ) {
        for (CreateProductRequest.VariantRequest request : requests) {
            ProductVariant variant = product.getVariants().stream()
                    .filter(item -> item.getSku().equalsIgnoreCase(request.sku().trim()))
                    .findFirst()
                    .orElse(null);
            if (variant == null || variant.getId() == null) {
                continue;
            }
            if (inventoryService.findByVariantId(variant.getId()).isPresent()) {
                continue;
            }
            int quantity = request.initialStock() == null ? 0 : Math.max(0, request.initialStock());
            inventoryService.save(new Inventory(variant, quantity, 0, 0));
            if (quantity > 0) {
                InventoryMovement movement = new InventoryMovement();
                movement.setVariant(variant);
                movement.setMovementType("IN");
                movement.setQuantity(quantity);
                movement.setReferenceType("PRODUCT_CREATE");
                movement.setReferenceId(product.getId());
                movement.setNote("Tồn kho khởi tạo cho biến thể");
                inventoryService.recordMovement(movement);
            }
        }
    }

    private ProductDetailResponse toAdminDetail(Product product) {
        return ProductDetailResponse.from(product, variantId -> {
            boolean isPre = Boolean.TRUE.equals(product.getIsPreorder()) || "PRE_ORDER".equalsIgnoreCase(product.getStockStatus());
            return inventoryService.findByVariantId(variantId)
                    .map(inventory -> {
                        int qty = Math.max(0, inventory.getQuantityOnHand() - inventory.getQuantityReserved());
                        return new ProductDetailResponse.StockInfo(qty, qty > 0 && !isPre, isPre, isPre ? "PRE_ORDER" : (qty > 0 ? "IN_STOCK" : "OUT_OF_STOCK"));
                    })
                    .orElse(new ProductDetailResponse.StockInfo(0, false, isPre, isPre ? "PRE_ORDER" : "OUT_OF_STOCK"));
        });
    }

    private static void validatePrimaryMedia(List<CreateProductRequest.MediaRequest> mediaRequests) {
        long primaryCount = mediaRequests.stream().filter(media -> Boolean.TRUE.equals(media.isPrimary())).count();
        if (primaryCount > 1) {
            throw new IllegalArgumentException("Chỉ được chọn một media chính");
        }
        if (mediaRequests.stream().anyMatch(media ->
                Boolean.TRUE.equals(media.isPrimary()) && !"IMAGE".equals(media.mediaType()))) {
            throw new IllegalArgumentException("Media chính phải là ảnh");
        }
    }

    private void addMedia(
            Product product,
            List<CreateProductRequest.MediaRequest> mediaRequests,
            List<MultipartFile> uploadedFiles
    ) {
        for (CreateProductRequest.MediaRequest mediaRequest : mediaRequests) {
            String mediaUrl;
            if (mediaRequest.fileIndex() != null) {
                mediaUrl = mediaStorage.store(uploadedFiles.get(mediaRequest.fileIndex()), mediaRequest.mediaType());
            } else {
                mediaUrl = mediaRequest.mediaUrl().trim();
                validateMediaUrl(mediaUrl);
            }
            ProductMedia media = new ProductMedia();
            media.setProduct(product);
            media.setMediaType(mediaRequest.mediaType());
            media.setMediaUrl(mediaUrl);
            media.setAltText(mediaRequest.altText());
            media.setSortOrder(mediaRequest.sortOrder() == null ? 0 : mediaRequest.sortOrder());
            media.setIsPrimary(Boolean.TRUE.equals(mediaRequest.isPrimary()));
            product.getMedia().add(media);
        }
    }

    private static void validateMediaRequests(
            List<CreateProductRequest.MediaRequest> mediaRequests,
            List<MultipartFile> files
    ) {
        Set<Integer> fileIndexes = new HashSet<>();
        for (CreateProductRequest.MediaRequest media : mediaRequests) {
            if (media.sortOrder() != null && media.sortOrder() < 0) {
                throw new IllegalArgumentException("Thứ tự media không được âm");
            }
            boolean hasUpload = media.fileIndex() != null;
            boolean hasUrl = media.mediaUrl() != null && !media.mediaUrl().isBlank();
            if (hasUpload == hasUrl) {
                throw new IllegalArgumentException("Mỗi media phải có đúng một URL hoặc fileIndex");
            }
            if (hasUpload) {
                if (media.fileIndex() < 0 || media.fileIndex() >= files.size()
                        || !fileIndexes.add(media.fileIndex())) {
                    throw new IllegalArgumentException("fileIndex media không hợp lệ hoặc bị trùng");
                }
            }
        }
        if (fileIndexes.size() != files.size()) {
            throw new IllegalArgumentException("Có file upload không được khai báo trong media");
        }
    }

    private static void validateMediaUrl(String value) {
        try {
            URI uri = URI.create(value);
            String scheme = uri.getScheme();
            if (uri.getHost() == null || scheme == null
                    || (!"http".equalsIgnoreCase(scheme) && !"https".equalsIgnoreCase(scheme))) {
                throw new IllegalArgumentException("Media URL phải là địa chỉ HTTP hoặc HTTPS hợp lệ");
            }
        } catch (IllegalArgumentException ex) {
            throw new IllegalArgumentException("Media URL không hợp lệ", ex);
        }
    }

    public void deleteById(Long id) {
        productRepository.deleteById(id);
    }

    @Transactional(readOnly = true)
    public List<ProductVariant> findVariantsByProductId(Long productId) {
        return variantRepository.findByProductId(productId);
    }

    @Transactional(readOnly = true)
    public Optional<ProductVariant> findVariantBySku(String sku) {
        return variantRepository.findBySku(sku);
    }

    public ProductVariant saveVariant(ProductVariant variant) {
        return variantRepository.save(variant);
    }

    @Transactional(readOnly = true)
    public List<ProductSummary> findFeaturedProducts(int limit) {
        int safeLimit = Math.min(Math.max(limit, 1), 50);
        Pageable pageable = PageRequest.of(0, safeLimit);
        return productRepository.findFeaturedProducts(pageable)
                .stream()
                .map(this::toSummary)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<ProductMedia> findMediaByProductId(Long productId) {
        return mediaRepository.findByProductIdOrderBySortOrderAsc(productId);
    }

    @Transactional(readOnly = true)
    public List<ProductMedia> findMediaByProductId(Long productId, String mediaType) {
        List<ProductMedia> mediaList = mediaRepository.findByProductIdOrderBySortOrderAsc(productId);
        if (mediaType != null && !mediaType.isBlank()) {
            return mediaList.stream()
                    .filter(m -> mediaType.equalsIgnoreCase(m.getMediaType()))
                    .toList();
        }
        return mediaList;
    }

    @Transactional(readOnly = true)
    public Optional<ProductMedia> findMediaById(Long mediaId) {
        return mediaRepository.findById(mediaId);
    }

    @Transactional(readOnly = true)
    public Resource loadMediaAsResource(ProductMedia media) {
        if (media == null || media.getMediaUrl() == null) {
            return null;
        }
        String mediaUrl = media.getMediaUrl().trim();
        String filename = mediaUrl.contains("/") ? mediaUrl.substring(mediaUrl.lastIndexOf('/') + 1) : mediaUrl;

        // 1. Thử lấy từ mediaStorage directory
        if (mediaStorage != null && mediaStorage.getStorageDirectory() != null) {
            Path filePath = mediaStorage.getStorageDirectory().resolve(filename).normalize();
            if (Files.exists(filePath)) {
                return new FileSystemResource(filePath);
            }
        }

        // 2. Thử lấy từ uploads/products
        Path uploadsPath = Path.of("uploads/products").resolve(filename).normalize();
        if (Files.exists(uploadsPath)) {
            return new FileSystemResource(uploadsPath);
        }

        // 3. Thử lấy đường dẫn trực tiếp nếu mediaUrl là path tương đối
        if (mediaUrl.startsWith("/")) {
            Path directPath = Path.of(mediaUrl.substring(1)).normalize();
            if (Files.exists(directPath)) {
                return new FileSystemResource(directPath);
            }
        }

        return null;
    }
}
