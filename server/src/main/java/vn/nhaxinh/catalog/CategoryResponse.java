package vn.nhaxinh.catalog;

import java.time.LocalDateTime;

public record CategoryResponse(
        Long id,
        String name,
        String slug,
        Long parentId,
        String description,
        String imageUrl,
        Integer sortOrder,
        Boolean isActive,
        Boolean isDeleted,
        Boolean isCollection,
        LocalDateTime deletedAt,
        String categoryGroup,
        String createdBy
) {
    public CategoryResponse(
            Long id,
            String name,
            String slug,
            Long parentId,
            String description,
            String imageUrl,
            Integer sortOrder,
            Boolean isActive
    ) {
        this(id, name, slug, parentId, description, imageUrl, sortOrder, isActive, false, false, null, "PRODUCT", null);
    }

    public static CategoryResponse from(Category category) {
        String group = category.getCategoryGroup() != null && !category.getCategoryGroup().isBlank()
                ? category.getCategoryGroup().toUpperCase()
                : "PRODUCT";
        return new CategoryResponse(
                category.getId(),
                category.getName(),
                category.getSlug(),
                category.getParent() == null ? null : category.getParent().getId(),
                category.getDescription(),
                category.getImageUrl(),
                category.getSortOrder(),
                category.getIsActive(),
                category.getIsDeleted() != null ? category.getIsDeleted() : false,
                "COLLECTION".equalsIgnoreCase(group),
                category.getDeletedAt(),
                group,
                category.getCreatedBy()
        );
    }
}
