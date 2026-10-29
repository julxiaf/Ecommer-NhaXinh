package vn.nhaxinh.risk;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface OrderAlertRepository extends JpaRepository<OrderAlert, Long> {

    List<OrderAlert> findByOrderId(Long orderId);

    List<OrderAlert> findByStatus(String status);

    List<OrderAlert> findBySeverity(String severity);
}
