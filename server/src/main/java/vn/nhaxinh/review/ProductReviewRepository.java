package vn.nhaxinh.review;

import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ProductReviewRepository extends JpaRepository<ProductReview, Long> {

    Page<ProductReview> findByProductIdAndStatusOrderByCreatedAtDesc(Long productId, String status, Pageable pageable);

    List<ProductReview> findByCustomerIdOrderByCreatedAtDesc(Long customerId);

    List<ProductReview> findByStatusOrderByCreatedAtDesc(String status);
}
