package vn.nhaxinh.user;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByUsername(String username);

    Optional<User> findByEmail(String email);

    Optional<User> findByPhone(String phone);

    boolean existsByUsername(String username);

    boolean existsByEmail(String email);

    boolean existsByPhone(String phone);

    List<User> findByAccountType(String accountType);

    List<User> findByStatus(String status);

    @Query("SELECT u FROM User u JOIN u.roles r WHERE r.code = :roleCode")
    List<User> findByRoleCode(String roleCode);
}
