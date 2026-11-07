package vn.nhaxinh.system;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.nhaxinh.audit.AuditLogService;
import vn.nhaxinh.user.User;
import vn.nhaxinh.user.UserRepository;

@Service
@Transactional
public class SystemConfigService {

    private static final Logger log = LoggerFactory.getLogger(SystemConfigService.class);

    private final SystemConfigRepository repository;
    private final AuditLogService auditLogService;
    private final UserRepository userRepository;
    private final ObjectMapper objectMapper;

    public SystemConfigService(
            SystemConfigRepository repository,
            AuditLogService auditLogService,
            UserRepository userRepository,
            ObjectMapper objectMapper
    ) {
        this.repository = repository;
        this.auditLogService = auditLogService;
        this.userRepository = userRepository;
        this.objectMapper = objectMapper;
    }

    @Transactional(readOnly = true)
    public List<SystemConfig> findAll() {
        return repository.findAll();
    }

    @Transactional(readOnly = true)
    public Optional<SystemConfig> findByKey(String key) {
        return repository.findByConfigKey(key);
    }

    @Transactional(readOnly = true)
    public String getValue(String key, String defaultValue) {
        return repository.findByConfigKey(key)
                .map(SystemConfig::getConfigValue)
                .filter(val -> val != null && !val.isBlank())
                .orElse(defaultValue);
    }

    public SystemConfig save(SystemConfig config) {
        return repository.save(config);
    }

    /**
     * Cập nhật cấu hình hệ thống theo key kèm ghi log chi tiết giá trị cũ -> mới.
     */
    public SystemConfig saveAndLogConfig(String key, String newValue, String valueType, String description) {
        Optional<SystemConfig> existingOpt = repository.findByConfigKey(key);
        boolean isCreate = existingOpt.isEmpty();
        String oldValue = existingOpt.map(SystemConfig::getConfigValue).orElse(null);

        SystemConfig config = existingOpt.orElseGet(() -> new SystemConfig(
                key,
                "",
                valueType != null ? valueType : "JSON",
                description != null ? description : "System Config for " + key
        ));

        config.setConfigValue(newValue != null ? newValue : "");
        if (valueType != null) {
            config.setValueType(valueType);
        }
        if (description != null) {
            config.setDescription(description);
        }

        SystemConfig saved = repository.save(config);

        int oldLen = oldValue != null ? oldValue.length() : 0;
        int newLen = newValue != null ? newValue.length() : 0;
        String oldPreview = previewText(oldValue, 300);
        String newPreview = previewText(newValue, 300);
        boolean valueChanged = !Objects.equals(oldValue, newValue);

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String actorName = (auth != null && auth.isAuthenticated()) ? auth.getName() : "SYSTEM";

        log.info("[SYSTEM-CONFIG-{}] key='{}' | actor='{}' | changed={} | độ dài: [{} -> {}] | oldPreview='{}' -> newPreview='{}'",
                isCreate ? "CREATE" : "UPDATE",
                key,
                actorName,
                valueChanged,
                oldLen,
                newLen,
                oldPreview,
                newPreview
        );

        try {
            User actor = userRepository.findByUsername(actorName).orElse(null);
            Map<String, Object> auditDetails = new LinkedHashMap<>();
            auditDetails.put("configKey", key);
            auditDetails.put("actionType", isCreate ? "CREATE" : "UPDATE");
            auditDetails.put("valueChanged", valueChanged);
            auditDetails.put("oldLength", oldLen);
            auditDetails.put("newLength", newLen);
            auditDetails.put("oldValuePreview", oldPreview);
            auditDetails.put("newValuePreview", newPreview);
            String json = objectMapper.writeValueAsString(auditDetails);
            auditLogService.record(actor, isCreate ? "SYSTEM_CONFIG_CREATE" : "SYSTEM_CONFIG_UPDATE", "SYSTEM_CONFIG", key, json, null);
        } catch (Exception ex) {
            log.warn("[SYSTEM-CONFIG-AUDIT] Không thể ghi audit log cho key={}: {}", key, ex.getMessage());
        }

        return saved;
    }

    private static String previewText(String val, int maxLen) {
        if (val == null) return "";
        String singleLine = val.replaceAll("\\s+", " ").trim();
        return singleLine.length() <= maxLen ? singleLine : singleLine.substring(0, maxLen) + "...";
    }
}
