package vn.nhaxinh.order;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface OrderItemRepository extends JpaRepository<OrderItem, Long> {

    @Query("SELECT DISTINCT oi FROM OrderItem oi LEFT JOIN FETCH oi.variant v LEFT JOIN FETCH v.product WHERE oi.order.id = :orderId")
    List<OrderItem> findByOrderId(@Param("orderId") Long orderId);

    @Query("SELECT DISTINCT oi FROM OrderItem oi LEFT JOIN FETCH oi.variant v LEFT JOIN FETCH v.product WHERE oi.order.id IN :orderIds")
    List<OrderItem> findByOrderIdIn(@Param("orderIds") List<Long> orderIds);
}
