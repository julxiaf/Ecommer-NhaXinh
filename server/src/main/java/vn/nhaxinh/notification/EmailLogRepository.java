package vn.nhaxinh.notification;

import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface EmailLogRepository extends JpaRepository<EmailLog, Long> {

    List<EmailLog> findByOrderId(Long orderId);

    List<EmailLog> findByOrderIdOrderByCreatedAtDesc(Long orderId);

    List<EmailLog> findBySendStatus(String sendStatus);

    Page<EmailLog> findBySendStatusOrderByCreatedAtDesc(String sendStatus, Pageable pageable);

    Page<EmailLog> findAllByOrderByCreatedAtDesc(Pageable pageable);
}
