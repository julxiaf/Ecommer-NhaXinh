package vn.nhaxinh.catalog;

import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface CollectionRepository extends JpaRepository<Collection, Long> {

    Optional<Collection> findBySlug(String slug);

    Optional<Collection> findBySlugAndIsDeletedFalse(String slug);

    boolean existsBySlug(String slug);

    boolean existsBySlugAndIdNot(String slug, Long id);

    List<Collection> findByIsDeletedFalse(Sort sort);

    List<Collection> findByIsDeletedTrue(Sort sort);

    List<Collection> findByStatusAndIsDeletedFalse(String status, Sort sort);

    @org.springframework.data.jpa.repository.Query("SELECT c.slug FROM Collection c JOIN c.products p WHERE p.id = :productId AND c.isDeleted = false")
    List<String> findCollectionSlugsByProductId(@org.springframework.data.repository.query.Param("productId") Long productId);
}

