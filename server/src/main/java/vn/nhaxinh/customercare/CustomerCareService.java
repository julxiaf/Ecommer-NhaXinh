package vn.nhaxinh.customercare;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class CustomerCareService {

    private final CustomerCareLogRepository repository;

    public CustomerCareService(CustomerCareLogRepository repository) {
        this.repository = repository;
    }

    @Transactional(readOnly = true)
    public List<CustomerCareLog> getLogsByCustomer(Long customerId) {
        return repository.findByCustomerIdOrderByCreatedAtDesc(customerId);
    }

    @Transactional(readOnly = true)
    public List<CustomerCareLog> getLogsByOrder(Long orderId) {
        return repository.findByOrderIdOrderByCreatedAtDesc(orderId);
    }

    @Transactional(readOnly = true)
    public List<CustomerCareLog> getPendingFollowUpsDue() {
        return repository.findPendingFollowUpsDue(LocalDateTime.now());
    }

    public CustomerCareLog createLog(CustomerCareLog log) {
        return repository.save(log);
    }

    public Optional<CustomerCareLog> findById(Long id) {
        return repository.findById(id);
    }
}
