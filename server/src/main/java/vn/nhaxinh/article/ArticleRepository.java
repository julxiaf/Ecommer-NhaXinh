package vn.nhaxinh.article;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ArticleRepository extends JpaRepository<Article, Long> {

    Optional<Article> findBySlug(String slug);

    Optional<Article> findBySlugAndIsDeletedFalse(String slug);

    List<Article> findByIsDeletedFalseOrderByCreatedAtDesc();

    List<Article> findAllByOrderByCreatedAtDesc();

    List<Article> findByCategoryAndIsDeletedFalseOrderByCreatedAtDesc(String category);

    List<Article> findByCollectionSlugAndIsDeletedFalseOrderByCreatedAtDesc(String collectionSlug);

    @Query("SELECT a FROM Article a WHERE a.isDeleted = false " +
           "AND (a.status IS NULL OR a.status = '' OR a.status = 'published') " +
           "AND (:category IS NULL OR :category = '' OR a.category = :category) " +
           "AND (:collectionSlug IS NULL OR :collectionSlug = '' OR a.collectionSlug = :collectionSlug) " +
           "AND (:search IS NULL OR :search = '' OR LOWER(a.title) LIKE LOWER(CONCAT('%', :search, '%')) OR LOWER(a.summary) LIKE LOWER(CONCAT('%', :search, '%'))) " +
           "ORDER BY a.createdAt DESC")
    List<Article> searchArticles(@Param("category") String category,
                                 @Param("collectionSlug") String collectionSlug,
                                 @Param("search") String search);

    @Query("SELECT a FROM Article a WHERE " +
           "(:category IS NULL OR :category = '' OR a.category = :category) " +
           "AND (:collectionSlug IS NULL OR :collectionSlug = '' OR a.collectionSlug = :collectionSlug) " +
           "AND (:isDeleted IS NULL OR a.isDeleted = :isDeleted) " +
           "AND (:status IS NULL OR :status = '' OR a.status = :status) " +
           "AND (:search IS NULL OR :search = '' OR LOWER(a.title) LIKE LOWER(CONCAT('%', :search, '%')) OR LOWER(a.summary) LIKE LOWER(CONCAT('%', :search, '%'))) " +
           "ORDER BY a.createdAt DESC")
    List<Article> searchAdminArticles(@Param("category") String category,
                                       @Param("collectionSlug") String collectionSlug,
                                       @Param("isDeleted") Boolean isDeleted,
                                       @Param("status") String status,
                                       @Param("search") String search);
}
