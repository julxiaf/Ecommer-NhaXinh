package vn.nhaxinh.system;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/v1/system-configs")
public class SystemConfigController {

    private static final String KEY_NAVIGATION_MENU = "navigation_menu";
    private final SystemConfigService systemConfigService;

    public SystemConfigController(SystemConfigService systemConfigService) {
        this.systemConfigService = systemConfigService;
    }

    /**
     * Lấy cấu hình menu điều hướng cho Header phía Client.
     */
    @GetMapping("/navigation-menu")
    public ResponseEntity<Map<String, Object>> getNavigationMenu() {
        return systemConfigService.findByKey(KEY_NAVIGATION_MENU)
                .filter(cfg -> cfg.getConfigValue() != null && !cfg.getConfigValue().isBlank())
                .map(cfg -> ResponseEntity.ok(Map.<String, Object>of(
                        "success", true,
                        "key", KEY_NAVIGATION_MENU,
                        "value", cfg.getConfigValue(),
                        "updatedAt", cfg.getUpdatedAt() != null ? cfg.getUpdatedAt().toString() : ""
                )))
                .orElseGet(() -> {
                    return ResponseEntity.ok(Map.of(
                            "success", false,
                            "key", KEY_NAVIGATION_MENU,
                            "value", ""
                    ));
                });
    }

    /**
     * Cập nhật cấu hình menu điều hướng từ Admin.
     */
    @PutMapping("/navigation-menu")
    public ResponseEntity<Map<String, Object>> updateNavigationMenu(@RequestBody Map<String, Object> body) {
        Object rawVal = body.get("value") != null ? body.get("value") : body.get("menuItems");
        String jsonVal = rawVal instanceof String ? (String) rawVal : (rawVal != null ? rawVal.toString() : "");

        SystemConfig saved = systemConfigService.saveAndLogConfig(
                KEY_NAVIGATION_MENU,
                jsonVal,
                "JSON",
                "Client Header Navigation Menu"
        );

        return ResponseEntity.ok(Map.of(
                "success", true,
                "key", KEY_NAVIGATION_MENU,
                "value", saved.getConfigValue() != null ? saved.getConfigValue() : "",
                "message", "Cập nhật menu điều hướng thành công"
        ));
    }

    /**
     * Lấy giá trị cấu hình theo key tổng quát.
     */
    @GetMapping("/{key}")
    public ResponseEntity<Map<String, Object>> getConfigByKey(@PathVariable String key) {
        return systemConfigService.findByKey(key)
                .map(cfg -> ResponseEntity.ok(Map.<String, Object>of(
                        "success", true,
                        "key", cfg.getConfigKey(),
                        "value", cfg.getConfigValue()
                )))
                .orElseGet(() -> ResponseEntity.ok(Map.<String, Object>of(
                        "success", false,
                        "key", key,
                        "value", ""
                )));
    }

    /**
     * Lưu hoặc cập nhật cấu hình theo key tổng quát.
     */
    @PutMapping("/{key}")
    public ResponseEntity<Map<String, Object>> updateConfigByKey(
            @PathVariable String key,
            @RequestBody Map<String, Object> body
    ) {
        Object rawVal = body.get("value");
        String jsonVal = rawVal instanceof String ? (String) rawVal : (rawVal != null ? rawVal.toString() : "");

        SystemConfig saved = systemConfigService.saveAndLogConfig(
                key,
                jsonVal,
                "JSON",
                "System Config for " + key
        );

        return ResponseEntity.ok(Map.of(
                "success", true,
                "key", saved.getConfigKey(),
                "value", saved.getConfigValue()
        ));
    }

    /**
     * Tải lên hình ảnh hoặc video cho Banner / CMS từ thiết bị máy tính của quản trị viên.
     */
    @PostMapping(value = "/upload-media", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Map<String, Object>> uploadMedia(@RequestParam("file") MultipartFile file) {
        if (file == null || file.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "message", "Vui lòng chọn tệp ảnh hoặc video để tải lên"
            ));
        }

        String originalFilename = file.getOriginalFilename();
        String extension = "";
        if (originalFilename != null && originalFilename.lastIndexOf('.') != -1) {
            extension = originalFilename.substring(originalFilename.lastIndexOf('.')).toLowerCase();
        }

        List<String> allowedExtensions = List.of(
                ".jpg", ".jpeg", ".png", ".webp", ".avif", ".svg", ".gif",
                ".mp4", ".webm", ".ogg", ".mov", ".m4v"
        );

        if (!allowedExtensions.contains(extension)) {
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "message", "Định dạng không được hỗ trợ. Vui lòng chọn ảnh (JPG, PNG, WEBP, GIF) hoặc video (MP4, WEBM, MOV)"
            ));
        }

        boolean isVideo = List.of(".mp4", ".webm", ".ogg", ".mov", ".m4v").contains(extension);
        String subDir = isVideo ? "uploads/banners/videos" : "uploads/banners/images";
        Path storageDir = Path.of(subDir).toAbsolutePath().normalize();

        try {
            Files.createDirectories(storageDir);
            String storedName = System.currentTimeMillis() + "_" + UUID.randomUUID().toString().substring(0, 8) + extension;
            Path destination = storageDir.resolve(storedName).normalize();

            try (InputStream is = file.getInputStream()) {
                Files.copy(is, destination, StandardCopyOption.REPLACE_EXISTING);
            }

            String publicUrl = "/" + subDir + "/" + storedName;

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "url", publicUrl,
                    "filename", storedName,
                    "mediaType", isVideo ? "video" : "image",
                    "originalName", originalFilename != null ? originalFilename : storedName
            ));
        } catch (IOException e) {
            return ResponseEntity.status(500).body(Map.of(
                    "success", false,
                    "message", "Lỗi lưu trữ tệp: " + e.getMessage()
            ));
        }
    }
}

