package vn.nhaxinh.customercare;

import java.time.LocalDateTime;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

@Repository
public interface CustomerCareLogRepository extends JpaRepository<CustomerCareLog, Long> {

    List<CustomerCareLog> findByCustomerIdOrderByCreatedAtDesc(Long customerId);

    List<CustomerCareLog> findByOrderIdOrderByCreatedAtDesc(Long orderId);

    @Query("SELECT l FROM CustomerCareLog l WHERE l.status = 'PENDING' AND l.followUpAt <= :now ORDER BY l.followUpAt ASC")
    List<CustomerCareLog> findPendingFollowUpsDue(LocalDateTime now);
}
