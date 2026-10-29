package vn.nhaxinh.user;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface CustomerSummaryRepository extends JpaRepository<CustomerSummary, Long> {

    List<CustomerSummary> findAllByOrderByTotalSpentDesc();
}
