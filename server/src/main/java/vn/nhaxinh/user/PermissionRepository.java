package vn.nhaxinh.user;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

@Repository
public interface PermissionRepository extends JpaRepository<Permission, Long> {

    Optional<Permission> findByCode(String code);

    List<Permission> findByModule(String module);

    boolean existsByCode(String code);

    List<Permission> findByCodeIn(Collection<String> codes);

    List<Permission> findAllByOrderByModuleAscCodeAsc();

    List<Permission> findByModuleOrderByCodeAsc(String module);

    @Query("SELECT DISTINCT p.module FROM Permission p ORDER BY p.module")
    List<String> findDistinctModules();
}
