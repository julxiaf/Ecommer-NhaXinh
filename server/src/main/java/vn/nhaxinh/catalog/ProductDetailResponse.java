package vn.nhaxinh.catalog;

import java.math.BigDecimal;
import java.util.List;

public record ProductDetailResponse(
        Long id,
        String name,
        String slug,
        String status,
        String shortDescription,
        String description,
        String specifications,
        Boolean isPreorder,
        String stockStatus,
        BrandInfo brand,
        List<CategoryInfo> categories,
        List<MediaInfo> media,
        List<VariantInfo> variants,
        String createdAt,
        Boolean isNew,
        Boolean isDeleted,
        java.time.LocalDateTime deletedAt,
        String createdBy
) {
    public ProductDetailResponse(
            Long id,
            String name,
            String slug,
            String status,
            String shortDescription,
            String description,
            String specifications,
            BrandInfo brand,
            List<CategoryInfo> categories,
            List<MediaInfo> media,
            List<VariantInfo> variants
    ) {
        this(id, name, slug, status, shortDescription, description, specifications, false, "IN_STOCK", brand, categories, media, variants, null, true, "ARCHIVED".equalsIgnoreCase(status), null, null);
    }

    public ProductDetailResponse(
            Long id,
            String name,
            String slug,
            String status,
            String shortDescription,
            String description,
            String specifications,
            Boolean isPreorder,
            String stockStatus,
            BrandInfo brand,
            List<CategoryInfo> categories,
            List<MediaInfo> media,
            List<VariantInfo> variants
    ) {
        this(id, name, slug, status, shortDescription, description, specifications, isPreorder, stockStatus, brand, categories, media, variants, null, false, "ARCHIVED".equalsIgnoreCase(status), null, null);
    }

    public ProductDetailResponse(
            Long id,
            String name,
            String slug,
            String status,
            String shortDescription,
            String description,
            String specifications,
            Boolean isPreorder,
            String stockStatus,
            BrandInfo brand,
            List<CategoryInfo> categories,
            List<MediaInfo> media,
            List<VariantInfo> variants,
            String createdAt,
            Boolean isNew
    ) {
        this(id, name, slug, status, shortDescription, description, specifications, isPreorder, stockStatus, brand, categories, media, variants, createdAt, isNew, "ARCHIVED".equalsIgnoreCase(status), null, null);
    }

    public record BrandInfo(
            Long id,
            String name,
            String slug,
            String logoUrl
    ) {}

    public record CategoryInfo(
            Long id,
            String name,
            String slug,
            String categoryGroup,
            Boolean isCollection
    ) {
        public CategoryInfo(Long id, String name, String slug) {
            this(id, name, slug, "PRODUCT", false);
        }
    }

    public record MediaInfo(
            Long id,
            String mediaType,
            String mediaUrl,
            String altText,
            Integer sortOrder,
            Boolean isPrimary,
            Long variantId
    ) {
        public MediaInfo(Long id, String mediaType, String mediaUrl, String altText, Integer sortOrder, Boolean isPrimary) {
            this(id, mediaType, mediaUrl, altText, sortOrder, isPrimary, null);
        }
    }

    public record VariantInfo(
            Long id,
            String sku,
            String name,
            String optionValues,
            BigDecimal price,
            BigDecimal compareAtPrice,
            Integer weightGrams,
            Integer widthMm,
            Integer heightMm,
            Integer depthMm,
            StockInfo stock
    ) {}

    public record StockInfo(
            Integer availableQuantity,
            Boolean inStock,
            Boolean isPreorder,
            String stockStatus
    ) {
        public StockInfo(Integer availableQuantity) {
            this(availableQuantity, availableQuantity != null && availableQuantity > 0, false, availableQuantity != null && availableQuantity > 0 ? "IN_STOCK" : "OUT_OF_STOCK");
        }

        public StockInfo(Integer availableQuantity, Boolean inStock) {
            this(availableQuantity, inStock, false, Boolean.TRUE.equals(inStock) ? "IN_STOCK" : "OUT_OF_STOCK");
        }
    }

    public static ProductDetailResponse from(Product product, java.util.function.Function<Long, StockInfo> stockLookup) {
        BrandInfo brandInfo = product.getBrand() != null
                ? new BrandInfo(
                        product.getBrand().getId(),
                        product.getBrand().getName(),
                        product.getBrand().getSlug(),
                        product.getBrand().getLogoUrl()
                )
                : null;

        List<CategoryInfo> categoryInfos = product.getCategories() != null
                ? product.getCategories().stream()
                        .sorted(java.util.Comparator.comparingInt((Category c) -> {
                            String grp = c.getCategoryGroup() != null ? c.getCategoryGroup().toUpperCase() : "PRODUCT";
                            String nm = c.getName() != null ? c.getName().trim().toLowerCase() : "";
                            boolean isCol = "COLLECTION".equals(grp)
                                    || Boolean.TRUE.equals(c.getIsCollection())
                                    || nm.startsWith("bộ sưu tập")
                                    || nm.startsWith("bo suu tap");
                            if (isCol) return 2;
                            if ("ROOM".equals(grp)) return 1;
                            return 0; // Ưu tiên loại sản phẩm (PRODUCT) lên đầu tiên
                        }).thenComparing(c -> c.getId() != null ? c.getId() : 0L))
                        .map(c -> new CategoryInfo(
                                c.getId(),
                                c.getName(),
                                c.getSlug(),
                                c.getCategoryGroup(),
                                c.getIsCollection()
                        ))
                        .toList()
                : List.of();

        List<MediaInfo> mediaInfos = product.getMedia() != null
                ? product.getMedia().stream()
                        .sorted(java.util.Comparator.comparingInt(m -> m.getSortOrder() != null ? m.getSortOrder() : 0))
                        .map(m -> new MediaInfo(
                                m.getId(),
                                m.getMediaType(),
                                m.getMediaUrl(),
                                m.getAltText(),
                                m.getSortOrder(),
                                m.getIsPrimary(),
                                m.getVariant() != null ? m.getVariant().getId() : null
                        ))
                        .toList()
                : List.of();

        List<VariantInfo> variantInfos = product.getVariants() != null
                ? product.getVariants().stream()
                        .filter(v -> "ACTIVE".equalsIgnoreCase(v.getStatus()))
                        .map(v -> new VariantInfo(
                                v.getId(),
                                v.getSku(),
                                v.getName(),
                                v.getOptionValues(),
                                v.getPrice(),
                                v.getCompareAtPrice(),
                                v.getWeightGrams(),
                                v.getWidthMm(),
                                v.getHeightMm(),
                                v.getDepthMm(),
                                stockLookup != null ? stockLookup.apply(v.getId()) : new StockInfo(0)
                        ))
                        .toList()
                : List.of();

        boolean isPre = Boolean.TRUE.equals(product.getIsPreorder()) || "PRE_ORDER".equalsIgnoreCase(product.getStockStatus());
        String stockSt = product.getStockStatus() != null ? product.getStockStatus() : (isPre ? "PRE_ORDER" : "IN_STOCK");
        String createdStr = product.getCreatedAt() != null ? product.getCreatedAt().toString() : null;
        boolean isNew = product.getCreatedAt() != null && product.getCreatedAt().isAfter(java.time.LocalDateTime.now().minusDays(45));
        boolean isDel = Boolean.TRUE.equals(product.getIsDeleted()) || "ARCHIVED".equalsIgnoreCase(product.getStatus());

        return new ProductDetailResponse(
                product.getId(),
                product.getName(),
                product.getSlug(),
                product.getStatus(),
                product.getShortDescription(),
                product.getDescription(),
                product.getSpecifications(),
                isPre,
                stockSt,
                brandInfo,
                categoryInfos,
                mediaInfos,
                variantInfos,
                createdStr,
                isNew,
                isDel,
                product.getDeletedAt(),
                product.getCreatedBy()
        );
    }
}
