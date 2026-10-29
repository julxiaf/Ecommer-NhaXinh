package vn.nhaxinh.risk;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface OrderRiskAssessmentRepository extends JpaRepository<OrderRiskAssessment, Long> {

    List<OrderRiskAssessment> findByOrderId(Long orderId);

    List<OrderRiskAssessment> findByRiskLevel(String riskLevel);
}
