package vn.nhaxinh.catalog;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ProductMediaRepository extends JpaRepository<ProductMedia, Long> {

    List<ProductMedia> findByProductIdOrderBySortOrderAsc(Long productId);

    List<ProductMedia> findByVariantId(Long variantId);
}
