package vn.nhaxinh.system;

import java.util.List;
import java.util.Optional;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class SystemConfigService {

    private final SystemConfigRepository repository;

    public SystemConfigService(SystemConfigRepository repository) {
        this.repository = repository;
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
}
