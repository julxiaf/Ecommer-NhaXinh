package vn.nhaxinh.article;

import jakarta.validation.constraints.NotBlank;
import java.time.LocalDateTime;

public class ArticleDTO {

    public record ArticleRequest(
            @NotBlank(message = "Tiêu đề bài viết không được để trống")
            String title,
            String slug,
            String category,
            String collectionSlug,
            String author,
            String status,
            String image,
            String summary,
            String content
    ) {
    }

    public record ArticleResponse(
            Long id,
            String title,
            String slug,
            String category,
            String collectionSlug,
            String author,
            Long views,
            String status,
            String image,
            String summary,
            String content,
            Boolean isDeleted,
            LocalDateTime createdAt,
            LocalDateTime updatedAt
    ) {
        public static ArticleResponse fromEntity(Article a) {
            return new ArticleResponse(
                    a.getId(),
                    a.getTitle(),
                    a.getSlug(),
                    a.getCategory(),
                    a.getCollectionSlug(),
                    a.getAuthor(),
                    a.getViews(),
                    a.getStatus(),
                    a.getImage(),
                    a.getSummary(),
                    a.getContent(),
                    a.getIsDeleted(),
                    a.getCreatedAt(),
                    a.getUpdatedAt()
            );
        }
    }
}

