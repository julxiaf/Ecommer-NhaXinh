package vn.nhaxinh.order;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface OrderStatusHistoryRepository extends JpaRepository<OrderStatusHistory, Long> {

    @org.springframework.data.jpa.repository.EntityGraph(attributePaths = {"changedBy"})
    List<OrderStatusHistory> findByOrderIdOrderByCreatedAtDesc(Long orderId);

    @org.springframework.data.jpa.repository.EntityGraph(attributePaths = {"changedBy"})
    List<OrderStatusHistory> findByOrderIdInOrderByCreatedAtDesc(List<Long> orderIds);
}
