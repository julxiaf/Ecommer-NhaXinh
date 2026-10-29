package vn.nhaxinh.review;

import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class ProductReviewService {

    private final ProductReviewRepository repository;

    public ProductReviewService(ProductReviewRepository repository) {
        this.repository = repository;
    }

    @Transactional(readOnly = true)
    public Page<ProductReview> getApprovedReviews(Long productId, Pageable pageable) {
        return repository.findByProductIdAndStatusOrderByCreatedAtDesc(productId, "PUBLISHED", pageable);
    }

    @Transactional(readOnly = true)
    public List<ProductReview> getReviewsByCustomer(Long customerId) {
        return repository.findByCustomerIdOrderByCreatedAtDesc(customerId);
    }

    @Transactional(readOnly = true)
    public List<ProductReview> getPendingReviews() {
        return repository.findByStatusOrderByCreatedAtDesc("PENDING");
    }

    public ProductReview submitReview(ProductReview review) {
        return repository.save(review);
    }

    public ProductReview updateStatus(Long reviewId, String status) {
        ProductReview review = repository.findById(reviewId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy đánh giá với ID: " + reviewId));
        review.setStatus(status);
        return repository.save(review);
    }

    public Optional<ProductReview> findById(Long id) {
        return repository.findById(id);
    }
}
