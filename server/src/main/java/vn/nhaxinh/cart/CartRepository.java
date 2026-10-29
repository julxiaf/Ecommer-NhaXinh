package vn.nhaxinh.cart;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface CartRepository extends JpaRepository<Cart, Long> {

    Optional<Cart> findByUserIdAndStatus(Long userId, String status);

    Optional<Cart> findBySessionTokenAndStatus(String sessionToken, String status);
}
