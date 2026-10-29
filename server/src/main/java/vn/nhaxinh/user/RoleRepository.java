package vn.nhaxinh.user;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface RoleRepository extends JpaRepository<Role, Long> {

    Optional<Role> findByCode(String code);

    @Query("SELECT r FROM Role r LEFT JOIN FETCH r.permissions WHERE r.code = :code")
    Optional<Role> findByCodeWithPermissions(@Param("code") String code);

    boolean existsByCode(String code);

    /** Danh sách vai trò đang chứa một quyền hạn. */
    @Query("SELECT DISTINCT r FROM Role r JOIN r.permissions p WHERE p.id = :permissionId")
    List<Role> findByPermissionId(@Param("permissionId") Long permissionId);

    /** Số người dùng đang được gán một vai trò. */
    @Query("SELECT COUNT(u) FROM User u JOIN u.roles r WHERE r.id = :roleId")
    long countUsersByRoleId(@Param("roleId") Long roleId);

    /** Thống kê số người dùng theo từng vai trò: mỗi phần tử là [roleId, count]. */
    @Query("SELECT r.id, COUNT(u) FROM User u JOIN u.roles r GROUP BY r.id")
    List<Object[]> countUsersGroupByRole();
}
