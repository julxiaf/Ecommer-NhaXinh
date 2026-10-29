package vn.nhaxinh.admin;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import java.util.LinkedHashMap;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Component;
import vn.nhaxinh.audit.AuditLogService;
import vn.nhaxinh.user.User;
import vn.nhaxinh.user.UserRepository;

@Component
public class RbacAuditRecorder {

    private static final Logger log = LoggerFactory.getLogger(RbacAuditRecorder.class);

    public static final String ENTITY_ROLE = "ROLE";
    public static final String ENTITY_PERMISSION = "PERMISSION";
    public static final String ENTITY_USER = "USER";

    private final AuditLogService auditLogService;
    private final UserRepository userRepository;
    private final ObjectMapper objectMapper;

    public RbacAuditRecorder(
            AuditLogService auditLogService,
            UserRepository userRepository,
            ObjectMapper objectMapper
    ) {
        this.auditLogService = auditLogService;
        this.userRepository = userRepository;
        this.objectMapper = objectMapper;
    }

    public void record(
            UserDetails principal,
            HttpServletRequest request,
            String action,
            String entityType,
            Object entityId,
            Map<String, Object> details
    ) {
        User actor = resolveActor(principal);
        String ip = clientIp(request);
        String jsonDetails = toJson(details);
        auditLogService.record(
                actor,
                action,
                entityType,
                entityId == null ? null : String.valueOf(entityId),
                jsonDetails,
                ip
        );
        log.info("[RBAC-AUDIT] actor='{}' | action={} | entity={}:{} | ip={} | details={}",
                actorName(principal), action, entityType, entityId, ip, jsonDetails);
    }

    public static String actorName(UserDetails principal) {
        return principal != null ? principal.getUsername() : "admin";
    }

    public static String clientIp(HttpServletRequest request) {
        if (request == null) {
            return null;
        }
        String forwardedFor = request.getHeader("X-Forwarded-For");
        if (forwardedFor != null && !forwardedFor.isBlank()) {
            String first = forwardedFor.split(",")[0].trim();
            return first.length() > 45 ? first.substring(0, 45) : first;
        }
        String remoteAddr = request.getRemoteAddr();
        return remoteAddr != null && remoteAddr.length() > 45 ? remoteAddr.substring(0, 45) : remoteAddr;
    }

    public static Map<String, Object> details(Object... keyValues) {
        Map<String, Object> map = new LinkedHashMap<>();
        for (int i = 0; i + 1 < keyValues.length; i += 2) {
            map.put(String.valueOf(keyValues[i]), keyValues[i + 1]);
        }
        return map;
    }

    private User resolveActor(UserDetails principal) {
        if (principal == null) {
            return userRepository.findByUsername("admin").orElse(null);
        }
        String username = principal.getUsername();
        return userRepository.findByUsername(username)
                .or(() -> userRepository.findByEmail(username))
                .orElse(null);
    }

    private String toJson(Map<String, Object> details) {
        try {
            return objectMapper.writeValueAsString(details);
        } catch (JsonProcessingException ex) {
            return "{\"serializationError\":true}";
        }
    }
}
