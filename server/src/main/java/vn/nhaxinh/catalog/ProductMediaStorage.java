package vn.nhaxinh.catalog;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Locale;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.multipart.MultipartFile;

@Service
public class ProductMediaStorage {

    private static final Logger log = LoggerFactory.getLogger(ProductMediaStorage.class);
    private static final long IMAGE_MAX_BYTES = 10L * 1024 * 1024;
    private static final long MODEL_MAX_BYTES = 100L * 1024 * 1024;

    private final Path storageDirectory;

    public ProductMediaStorage(@Value("${app.media.storage-dir:uploads/products}") String storageDirectory) {
        this.storageDirectory = Path.of(storageDirectory).toAbsolutePath().normalize();
    }

    public String store(MultipartFile file, String mediaType) {
        if (!TransactionSynchronizationManager.isSynchronizationActive()) {
            throw new IllegalStateException("Media upload must run inside a transaction");
        }
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("File media không được để trống");
        }

        String extension = getExtension(file.getOriginalFilename());
        validateUpload(file, mediaType, extension);
        String storedName = UUID.randomUUID() + extension;
        Path destination = storageDirectory.resolve(storedName).normalize();
        if (!destination.getParent().equals(storageDirectory)) {
            throw new IllegalArgumentException("Tên file media không hợp lệ");
        }

        try {
            Files.createDirectories(storageDirectory);
            try (InputStream input = file.getInputStream()) {
                Files.copy(input, destination);
            }
        } catch (IOException ex) {
            throw new IllegalStateException("Không thể lưu file media", ex);
        }

        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCompletion(int status) {
                if (status != STATUS_COMMITTED) {
                    deleteQuietly(destination);
                }
            }
        });
        return "/media/products/" + storedName;
    }

    public Path getStorageDirectory() {
        return storageDirectory;
    }

    private static void validateUpload(MultipartFile file, String mediaType, String extension) {
        long maxBytes = "MODEL_3D".equals(mediaType) ? MODEL_MAX_BYTES : IMAGE_MAX_BYTES;
        if (file.getSize() > maxBytes) {
            throw new IllegalArgumentException("File media vượt quá dung lượng cho phép");
        }

        byte[] header;
        try (InputStream input = file.getInputStream()) {
            header = input.readNBytes(12);
        } catch (IOException ex) {
            throw new IllegalStateException("Không thể đọc file media", ex);
        }

        boolean valid = switch (mediaType) {
            case "IMAGE" -> isImage(extension, header);
            case "MODEL_3D" -> ".glb".equals(extension)
                    && header.length >= 12
                    && header[0] == 'g' && header[1] == 'l'
                    && header[2] == 'T' && header[3] == 'F'
                    && header[4] == 2 && header[5] == 0
                    && header[6] == 0 && header[7] == 0;
            default -> false;
        };
        if (!valid) {
            throw new IllegalArgumentException("Định dạng file không phù hợp với loại media");
        }
    }

    private static boolean isImage(String extension, byte[] header) {
        return switch (extension) {
            case ".jpg", ".jpeg" -> header.length >= 3
                    && (header[0] & 0xff) == 0xff
                    && (header[1] & 0xff) == 0xd8
                    && (header[2] & 0xff) == 0xff;
            case ".png" -> header.length >= 8
                    && (header[0] & 0xff) == 0x89
                    && header[1] == 'P' && header[2] == 'N' && header[3] == 'G';
            case ".gif" -> header.length >= 6
                    && header[0] == 'G' && header[1] == 'I' && header[2] == 'F';
            case ".webp" -> header.length >= 12
                    && header[0] == 'R' && header[1] == 'I' && header[2] == 'F' && header[3] == 'F'
                    && header[8] == 'W' && header[9] == 'E' && header[10] == 'B' && header[11] == 'P';
            default -> false;
        };
    }

    private static String getExtension(String originalFilename) {
        if (originalFilename == null) {
            throw new IllegalArgumentException("Tên file media không hợp lệ");
        }
        String filename = originalFilename.replace('\\', '/');
        int separator = filename.lastIndexOf('/');
        int dot = filename.lastIndexOf('.');
        if (dot <= separator || dot == filename.length() - 1) {
            throw new IllegalArgumentException("File media phải có phần mở rộng hợp lệ");
        }
        return filename.substring(dot).toLowerCase(Locale.ROOT);
    }

    private static void deleteQuietly(Path path) {
        try {
            Files.deleteIfExists(path);
        } catch (IOException ex) {
            log.error("Unable to remove product media after transaction rollback: {}", path, ex);
        }
    }
}
