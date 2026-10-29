package vn.nhaxinh.order;

import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface OrderRepository extends JpaRepository<Order, Long> {

    Optional<Order> findByOrderCode(String orderCode);

    Optional<Order> findByOrderCodeAndRecipientPhone(String orderCode, String recipientPhone);

    Optional<Order> findByOrderCodeAndUserId(String orderCode, Long userId);

    Page<Order> findByUserIdOrderByCreatedAtDesc(Long userId, Pageable pageable);

    Page<Order> findByOrderStatusOrderByCreatedAtDesc(String orderStatus, Pageable pageable);

    Page<Order> findByPaymentStatusOrderByCreatedAtDesc(String paymentStatus, Pageable pageable);

    List<Order> findByUserId(Long userId);

    List<Order> findByRecipientPhoneAndCreatedAtAfter(String recipientPhone, java.time.LocalDateTime after);

    @org.springframework.data.jpa.repository.Query(value = """
            SELECT o FROM Order o
            WHERE (:keyword IS NULL OR o.orderCode LIKE CONCAT('%', :keyword, '%')
                   OR o.recipientPhone LIKE CONCAT('%', :keyword, '%')
                   OR o.recipientName LIKE CONCAT('%', :keyword, '%'))
              AND (:orderStatus IS NULL OR o.orderStatus = :orderStatus)
              AND (:paymentStatus IS NULL OR o.paymentStatus = :paymentStatus)
            ORDER BY o.createdAt DESC
            """,
            countQuery = """
            SELECT COUNT(o) FROM Order o
            WHERE (:keyword IS NULL OR o.orderCode LIKE CONCAT('%', :keyword, '%')
                   OR o.recipientPhone LIKE CONCAT('%', :keyword, '%')
                   OR o.recipientName LIKE CONCAT('%', :keyword, '%'))
              AND (:orderStatus IS NULL OR o.orderStatus = :orderStatus)
              AND (:paymentStatus IS NULL OR o.paymentStatus = :paymentStatus)
            """)
    Page<Order> search(
            @org.springframework.data.repository.query.Param("keyword") String keyword,
            @org.springframework.data.repository.query.Param("orderStatus") String orderStatus,
            @org.springframework.data.repository.query.Param("paymentStatus") String paymentStatus,
            Pageable pageable
    );
}
