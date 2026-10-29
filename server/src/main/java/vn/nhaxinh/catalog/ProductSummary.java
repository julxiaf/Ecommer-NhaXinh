package vn.nhaxinh.catalog;

import java.math.BigDecimal;

/**
 * DTO tóm tắt sản phẩm cho danh sách catalog và trang tìm kiếm.
 *
 * Cung cấp đầy đủ:
 * - Ảnh sản phẩm chính (image / thumbnailUrl) và ảnh phụ khi hover (image2)
 * - Giá bán hiện tại (price / minPrice)
 * - Giá gốc niêm yết (originalPrice / compareAtPrice)
 * - Phần trăm giảm giá (discount: ví dụ 20 = 20%)
 * - Tên danh mục (category) & Thương hiệu (brand)
 * - Tồn kho (totalStock) & Còn hàng (inStock)
 * - Trạng thái đặt trước (isPreorder) & Trạng thái tồn kho (stockStatus: IN_STOCK, PRE_ORDER, OUT_OF_STOCK)
 */
public record ProductSummary(
        Long id,
        String name,
        String slug,
        String shortDescription,
        BigDecimal price,
        BigDecimal originalPrice,
        Integer discount,
        String image,
        String image2,
        String category,
        String brand,
        Long totalStock,
        Boolean inStock,
        BigDecimal minPrice,
        BigDecimal compareAtPrice,
        String thumbnailUrl,
        Long defaultVariantId,
        Boolean isPreorder,
        String stockStatus
) {
    /**
     * Constructor tiện ích chính.
     */
    public ProductSummary(
            Long id,
            String name,
            String slug,
            String shortDescription,
            BigDecimal price,
            BigDecimal originalPrice,
            Integer discount,
            String image,
            String image2,
            String category,
            String brand,
            Long totalStock,
            Long defaultVariantId,
            Boolean isPreorder,
            String stockStatus
    ) {
        this(
                id,
                name,
                slug,
                shortDescription,
                price,
                originalPrice,
                discount,
                image,
                image2,
                category,
                brand,
                totalStock,
                totalStock != null && totalStock > 0 && !Boolean.TRUE.equals(isPreorder),
                price,
                originalPrice,
                image,
                defaultVariantId,
                Boolean.TRUE.equals(isPreorder) || "PRE_ORDER".equalsIgnoreCase(stockStatus),
                stockStatus != null ? stockStatus : (Boolean.TRUE.equals(isPreorder) ? "PRE_ORDER" : (totalStock != null && totalStock > 0 ? "IN_STOCK" : "OUT_OF_STOCK"))
        );
    }

    public ProductSummary(
            Long id,
            String name,
            String slug,
            String shortDescription,
            BigDecimal price,
            BigDecimal originalPrice,
            Integer discount,
            String image,
            String image2,
            String category,
            String brand,
            Long totalStock,
            Long defaultVariantId
    ) {
        this(
                id,
                name,
                slug,
                shortDescription,
                price,
                originalPrice,
                discount,
                image,
                image2,
                category,
                brand,
                totalStock,
                defaultVariantId,
                false,
                totalStock != null && totalStock > 0 ? "IN_STOCK" : "OUT_OF_STOCK"
        );
    }

    public ProductSummary(
            Long id,
            String name,
            String slug,
            String shortDescription,
            BigDecimal price,
            BigDecimal originalPrice,
            Integer discount,
            String image,
            String image2,
            String category,
            String brand,
            Long totalStock
    ) {
        this(
                id,
                name,
                slug,
                shortDescription,
                price,
                originalPrice,
                discount,
                image,
                image2,
                category,
                brand,
                totalStock,
                null
        );
    }

    /**
     * Constructor tương thích với các câu query cũ.
     */
    public ProductSummary(
            Long id,
            String name,
            String slug,
            String shortDescription,
            BigDecimal minPrice,
            Long totalStock
    ) {
        this(
                id,
                name,
                slug,
                shortDescription,
                minPrice,
                null,
                null,
                null,
                null,
                null,
                null,
                totalStock,
                null
        );
    }
}
