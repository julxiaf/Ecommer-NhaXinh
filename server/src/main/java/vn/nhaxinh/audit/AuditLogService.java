package vn.nhaxinh.audit;

import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.nhaxinh.user.User;

@Service
@Transactional
public class AuditLogService {

    private static final Logger log = LoggerFactory.getLogger(AuditLogService.class);
    private final AuditLogRepository repository;

    public AuditLogService(AuditLogRepository repository) {
        this.repository = repository;
    }

    public AuditLog log(AuditLog logEntry) {
        return repository.save(logEntry);
    }

    public AuditLog record(User user, String action, String entityType, String entityId, String details, String ipAddress) {
        log.info("[AUDIT] action={} | user={} | entity={}:{} | ip={}",
                action, user != null ? user.getUsername() : "anonymous", entityType, entityId, ipAddress);

        String safeJson = formatJson(details);
        AuditLog auditLog = new AuditLog(user, action, entityType, entityId, safeJson, ipAddress);
        try {
            return repository.save(auditLog);
        } catch (Exception ex) {
            log.error("[AUDIT-SAVE-ERROR] Không thể lưu audit log: action={} | entity={}:{} | err={}",
                    action, entityType, entityId, ex.getMessage());
            return null;
        }
    }

    private String formatJson(String text) {
        if (text == null || text.isBlank()) {
            return "{}";
        }
        String trimmed = text.trim();
        if ((trimmed.startsWith("{") && trimmed.endsWith("}")) ||
            (trimmed.startsWith("[") && trimmed.endsWith("]"))) {
            return trimmed;
        }
        String escaped = trimmed.replace("\\", "\\\\")
                .replace("\"", "\\\"")
                .replace("\n", "\\n")
                .replace("\r", "\\r");
        return "{\"message\":\"" + escaped + "\"}";
    }

    @Transactional(readOnly = true)
    public Page<AuditLog> getLogsByUser(Long userId, Pageable pageable) {
        return repository.findByUserIdOrderByCreatedAtDesc(userId, pageable);
    }

    @Transactional(readOnly = true)
    public List<AuditLog> getLogsByEntity(String entityType, String entityId) {
        return repository.findByEntityTypeAndEntityIdOrderByCreatedAtDesc(entityType, entityId);
    }

    @Transactional(readOnly = true)
    public Page<AuditLog> findAll(Pageable pageable) {
        return repository.findAllByOrderByCreatedAtDesc(pageable);
    }

    @Transactional(readOnly = true)
    public java.util.Optional<AuditLog> findById(Long id) {
        return repository.findById(id).map(a -> {
            if (a.getUser() != null) {
                a.getUser().getUsername(); // khởi tạo proxy trong transaction
            }
            return a;
        });
    }

    @Transactional(readOnly = true)
    public Page<AuditLog> search(String action, String entityType, String entityId, Long userId,
                                 java.time.LocalDateTime from, java.time.LocalDateTime to, Pageable pageable) {
        return repository.search(blankToNull(action), blankToNull(entityType), blankToNull(entityId),
                userId, from, to, pageable);
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}

