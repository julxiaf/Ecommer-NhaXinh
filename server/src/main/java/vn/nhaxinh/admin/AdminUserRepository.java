package vn.nhaxinh.admin;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import vn.nhaxinh.user.User;

@Repository
public interface AdminUserRepository extends JpaRepository<User, Long> {

    Optional<User> findByUsername(String username);
}
