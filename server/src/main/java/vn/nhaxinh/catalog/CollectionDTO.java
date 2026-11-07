package vn.nhaxinh.catalog;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;

public class CollectionDTO {

    public record CollectionRequest(
            @NotBlank @Size(max = 180) String name,
            @NotBlank @Size(max = 200)
            @Pattern(regexp = "[a-z0-9]+(?:-[a-z0-9]+)*", message = "Slug chỉ gồm chữ thường, số và dấu gạch ngang")
            String slug,
            String description,
            String coverImageUrl,
            String status,
            LocalDateTime startsAt,
            LocalDateTime endsAt,
            Integer sortOrder,
            Boolean isDeleted,
            Set<Long> productIds
    ) {
        public CollectionRequest(
                String name,
                String slug,
                String description,
                String coverImageUrl,
                String status,
                LocalDateTime startsAt,
                LocalDateTime endsAt,
                Integer sortOrder,
                Set<Long> productIds
        ) {
            this(name, slug, description, coverImageUrl, status, startsAt, endsAt, sortOrder, false, productIds);
        }
    }

    public record CollectionResponse(
            Long id,
            String name,
            String slug,
            String description,
            String coverImageUrl,
            String status,
            Boolean isDeleted,
            LocalDateTime deletedAt,
            LocalDateTime startsAt,
            LocalDateTime endsAt,
            Integer sortOrder,
            LocalDateTime createdAt,
            LocalDateTime updatedAt,
            int productCount,
            List<ProductSummary> products,
            String createdBy
    ) {
        public static CollectionResponse from(Collection collection, List<ProductSummary> productSummaries) {
            return new CollectionResponse(
                    collection.getId(),
                    collection.getName(),
                    collection.getSlug(),
                    collection.getDescription(),
                    collection.getCoverImageUrl(),
                    collection.getStatus(),
                    collection.getIsDeleted() != null ? collection.getIsDeleted() : false,
                    collection.getDeletedAt(),
                    collection.getStartsAt(),
                    collection.getEndsAt(),
                    collection.getSortOrder(),
                    collection.getCreatedAt(),
                    collection.getUpdatedAt(),
                    collection.getProducts() != null ? collection.getProducts().size() : 0,
                    productSummaries != null ? productSummaries : List.of(),
                    collection.getCreatedBy()
            );
        }
    }
}

