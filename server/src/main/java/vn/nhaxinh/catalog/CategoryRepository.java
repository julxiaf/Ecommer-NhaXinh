package vn.nhaxinh.catalog;

import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface CategoryRepository extends JpaRepository<Category, Long> {

    Optional<Category> findBySlug(String slug);

    boolean existsBySlug(String slug);

    boolean existsBySlugAndIdNot(String slug, Long id);

    List<Category> findByParentIsNullAndIsActiveTrueOrderBySortOrderAsc();

    List<Category> findByParentIsNullAndIsActiveTrueAndIsDeletedFalseOrderBySortOrderAsc();

    List<Category> findByParentIsNullAndCategoryGroupAndIsActiveTrueAndIsDeletedFalseOrderBySortOrderAsc(String categoryGroup);

    List<Category> findByParentIdAndIsActiveTrueOrderBySortOrderAsc(Long parentId);

    List<Category> findByParentIdAndIsActiveTrueAndIsDeletedFalseOrderBySortOrderAsc(Long parentId);

    List<Category> findByIsActiveTrue(Sort sort);

    List<Category> findByIsActiveTrueAndIsDeletedFalse(Sort sort);

    List<Category> findByIsDeletedFalse(Sort sort);

    List<Category> findByIsDeletedTrue(Sort sort);

    List<Category> findByCategoryGroupAndIsActiveTrueAndIsDeletedFalse(String categoryGroup, Sort sort);

    List<Category> findByCategoryGroupAndIsDeletedFalse(String categoryGroup, Sort sort);

    List<Category> findByCategoryGroup(String categoryGroup, Sort sort);
}
