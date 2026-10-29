package vn.nhaxinh.catalog;

public record CategoryResponse(
        Long id,
        String name,
        String slug,
        Long parentId,
        String description,
        String imageUrl,
        Integer sortOrder,
        Boolean isActive
) {
    public static CategoryResponse from(Category category) {
        return new CategoryResponse(
                category.getId(),
                category.getName(),
                category.getSlug(),
                category.getParent() == null ? null : category.getParent().getId(),
                category.getDescription(),
                category.getImageUrl(),
                category.getSortOrder(),
                category.getIsActive()
        );
    }
}
