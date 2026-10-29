package vn.nhaxinh.risk;

import java.util.List;
import java.util.Optional;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class OrderRiskService {

    private final OrderRiskAssessmentRepository assessmentRepository;
    private final OrderAlertRepository alertRepository;

    public OrderRiskService(
            OrderRiskAssessmentRepository assessmentRepository,
            OrderAlertRepository alertRepository
    ) {
        this.assessmentRepository = assessmentRepository;
        this.alertRepository = alertRepository;
    }

    @Transactional(readOnly = true)
    public List<OrderRiskAssessment> getAssessmentsByOrderId(Long orderId) {
        return assessmentRepository.findByOrderId(orderId);
    }

    public OrderRiskAssessment saveAssessment(OrderRiskAssessment assessment) {
        return assessmentRepository.save(assessment);
    }

    @Transactional(readOnly = true)
    public List<OrderAlert> getAlertsByOrderId(Long orderId) {
        return alertRepository.findByOrderId(orderId);
    }

    @Transactional(readOnly = true)
    public List<OrderAlert> getActiveAlerts() {
        return alertRepository.findByStatus("NEW");
    }

    @Transactional(readOnly = true)
    public Optional<OrderAlert> findAlertById(Long alertId) {
        return alertRepository.findById(alertId);
    }

    public OrderAlert saveAlert(OrderAlert alert) {
        return alertRepository.save(alert);
    }
}
