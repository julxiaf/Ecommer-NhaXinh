package vn.nhaxinh.payment;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.stereotype.Repository;

@Repository
public interface PaymentRepository extends JpaRepository<Payment, Long> {

    @Override
    @EntityGraph(attributePaths = "order")
    Page<Payment> findAll(Pageable pageable);

    @Override
    @EntityGraph(attributePaths = "order")
    Optional<Payment> findById(Long id);

    @EntityGraph(attributePaths = "order")
    Optional<Payment> findByTransactionCode(String transactionCode);

    @EntityGraph(attributePaths = "order")
    List<Payment> findByOrderId(Long orderId);

    @EntityGraph(attributePaths = "order")
    List<Payment> findByOrderIdIn(List<Long> orderIds);

    List<Payment> findByOrderIdAndPaymentStatus(Long orderId, String paymentStatus);

}
