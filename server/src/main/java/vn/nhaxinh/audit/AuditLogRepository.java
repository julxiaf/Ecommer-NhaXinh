package vn.nhaxinh.audit;

import java.time.LocalDateTime;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface AuditLogRepository extends JpaRepository<AuditLog, Long> {

    Page<AuditLog> findByUserIdOrderByCreatedAtDesc(Long userId, Pageable pageable);

    List<AuditLog> findByEntityTypeAndEntityIdOrderByCreatedAtDesc(String entityType, String entityId);

    Page<AuditLog> findAllByOrderByCreatedAtDesc(Pageable pageable);

    /**
     * Tìm kiếm nhật ký với các bộ lọc tùy chọn (tham số null = bỏ qua điều kiện).
     */
    @Query(value = """
            SELECT a FROM AuditLog a LEFT JOIN FETCH a.user u
            WHERE (:action IS NULL OR a.action = :action)
              AND (:entityType IS NULL OR a.entityType = :entityType)
              AND (:entityId IS NULL OR a.entityId = :entityId)
              AND (:userId IS NULL OR u.id = :userId)
              AND (:fromTime IS NULL OR a.createdAt >= :fromTime)
              AND (:toTime IS NULL OR a.createdAt <= :toTime)
            ORDER BY a.createdAt DESC, a.id DESC
            """,
            countQuery = """
            SELECT COUNT(a) FROM AuditLog a LEFT JOIN a.user u
            WHERE (:action IS NULL OR a.action = :action)
              AND (:entityType IS NULL OR a.entityType = :entityType)
              AND (:entityId IS NULL OR a.entityId = :entityId)
              AND (:userId IS NULL OR u.id = :userId)
              AND (:fromTime IS NULL OR a.createdAt >= :fromTime)
              AND (:toTime IS NULL OR a.createdAt <= :toTime)
            """)
    Page<AuditLog> search(
            @Param("action") String action,
            @Param("entityType") String entityType,
            @Param("entityId") String entityId,
            @Param("userId") Long userId,
            @Param("fromTime") LocalDateTime fromTime,
            @Param("toTime") LocalDateTime toTime,
            Pageable pageable
    );
}
