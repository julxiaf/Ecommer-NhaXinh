package vn.nhaxinh.order;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface OrderDepositRepository extends JpaRepository<OrderDeposit, Long> {

    Optional<OrderDeposit> findByOrderId(Long orderId);

    List<OrderDeposit> findByDepositStatus(String depositStatus);
}
