package vn.nhaxinh.cart;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

@Repository
public interface CartRepository extends JpaRepository<Cart, Long> {

    Optional<Cart> findByUserIdAndStatus(Long userId, String status);

    Optional<Cart> findBySessionTokenAndStatus(String sessionToken, String status);

    /** Dùng để chẩn đoán: mọi giỏ (kể cả không ACTIVE) đang giữ token. */
    List<Cart> findBySessionToken(String sessionToken);

    /** Dùng để chẩn đoán: mọi giỏ của user theo mọi status. */
    List<Cart> findByUserId(Long userId);

    /** Nhả token đang bị giỏ không ACTIVE giữ (dữ liệu bẩn) trước khi tạo giỏ mới với token đó. */
    @Modifying
    @Query("UPDATE Cart c SET c.sessionToken = NULL WHERE c.sessionToken = :token AND c.status <> 'ACTIVE'")
    int releaseSessionToken(@org.springframework.data.repository.query.Param("token") String token);

    /** Dọn dữ liệu bẩn: nhả session_token của các giỏ không còn ACTIVE. */
    @Modifying
    @Query("UPDATE Cart c SET c.sessionToken = NULL WHERE c.status <> 'ACTIVE' AND c.sessionToken IS NOT NULL")
    int releaseSessionTokensForNonActiveCarts();
}
