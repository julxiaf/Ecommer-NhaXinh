package vn.nhaxinh.article;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import vn.nhaxinh.audit.AuditLogService;
import vn.nhaxinh.user.User;
import vn.nhaxinh.user.UserRepository;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.text.Normalizer;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import java.util.regex.Pattern;

@Service
@Transactional
public class ArticleService {

    private static final Logger log = LoggerFactory.getLogger(ArticleService.class);
    private static final Pattern NONLATIN = Pattern.compile("[^\\w-]");
    private static final Pattern WHITESPACE = Pattern.compile("[\\s]");

    private final ArticleRepository articleRepository;
    private final AuditLogService auditLogService;
    private final UserRepository userRepository;
    private final ObjectMapper objectMapper;

    public ArticleService(
            ArticleRepository articleRepository,
            AuditLogService auditLogService,
            UserRepository userRepository,
            ObjectMapper objectMapper
    ) {
        this.articleRepository = articleRepository;
        this.auditLogService = auditLogService;
        this.userRepository = userRepository;
        this.objectMapper = objectMapper;
    }

    @Transactional(readOnly = true)
    public List<ArticleDTO.ArticleResponse> getPublicArticles(String category, String collectionSlug, String search) {
        return articleRepository.searchArticles(category, collectionSlug, search)
                .stream()
                .map(ArticleDTO.ArticleResponse::fromEntity)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<ArticleDTO.ArticleResponse> getAdminArticles(String category, String collectionSlug, Boolean isDeleted, String status, String search) {
        return articleRepository.searchAdminArticles(category, collectionSlug, isDeleted, status, search)
                .stream()
                .map(ArticleDTO.ArticleResponse::fromEntity)
                .toList();
    }

    public ArticleDTO.ArticleResponse getArticleByIdOrSlug(String idOrSlug) {
        Article article;
        if (idOrSlug.matches("\\d+")) {
            Long id = Long.parseLong(idOrSlug);
            article = articleRepository.findById(id)
                    .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy bài viết ID: " + id));
        } else {
            article = articleRepository.findBySlug(idOrSlug)
                    .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy bài viết slug: " + idOrSlug));
        }

        // Tăng lượt xem tự động khi đọc bài viết
        article.setViews((article.getViews() != null ? article.getViews() : 0L) + 1);
        return ArticleDTO.ArticleResponse.fromEntity(articleRepository.save(article));
    }

    public ArticleDTO.ArticleResponse createArticle(ArticleDTO.ArticleRequest request) {
        Article article = new Article();
        article.setTitle(request.title().trim());

        String slug = request.slug();
        if (slug == null || slug.isBlank()) {
            slug = toSlug(request.title());
        }
        // Tránh trùng slug
        String finalSlug = slug;
        int counter = 1;
        while (articleRepository.findBySlug(finalSlug).isPresent()) {
            finalSlug = slug + "-" + counter++;
        }
        article.setSlug(finalSlug);

        article.setCategory(request.category() != null && !request.category().isBlank() ? request.category().trim() : "Góc cảm hứng");
        article.setCollectionSlug(request.collectionSlug() != null && !request.collectionSlug().isBlank() ? request.collectionSlug().trim() : null);
        article.setAuthor(request.author() != null && !request.author().isBlank() ? request.author().trim() : "Ban Biên Tập Nhà Xinh");
        article.setStatus(request.status() != null && !request.status().isBlank() ? request.status().trim() : "published");
        article.setImage(request.image());
        article.setSummary(request.summary());
        article.setContent(request.content());
        article.setIsDeleted(false);
        article.setViews(0L);

        Article saved = articleRepository.save(article);
        log.info("[ARTICLE-CREATE] Tạo bài viết mới id={} title='{}' slug='{}' category='{}' collectionSlug='{}' author='{}' status='{}' | độ dài nội dung={}",
                saved.getId(), saved.getTitle(), saved.getSlug(), saved.getCategory(), saved.getCollectionSlug(),
                saved.getAuthor(), saved.getStatus(), saved.getContent() != null ? saved.getContent().length() : 0);
        recordAudit("ARTICLE_CREATE", saved.getId(), Map.of(
                "id", saved.getId(),
                "title", saved.getTitle(),
                "slug", saved.getSlug(),
                "category", String.valueOf(saved.getCategory()),
                "collectionSlug", String.valueOf(saved.getCollectionSlug()),
                "author", String.valueOf(saved.getAuthor()),
                "status", String.valueOf(saved.getStatus()),
                "contentLength", saved.getContent() != null ? saved.getContent().length() : 0
        ));
        return ArticleDTO.ArticleResponse.fromEntity(saved);
    }

    public ArticleDTO.ArticleResponse updateArticle(Long id, ArticleDTO.ArticleRequest request) {
        Article article = articleRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy bài viết để cập nhật"));

        Map<String, Object> changes = new LinkedHashMap<>();

        if (request.title() != null && !request.title().isBlank()) {
            String nextTitle = request.title().trim();
            if (!Objects.equals(article.getTitle(), nextTitle)) {
                changes.put("title", Map.of("old", String.valueOf(article.getTitle()), "new", nextTitle));
            }
            article.setTitle(nextTitle);
        }
        if (request.slug() != null && !request.slug().isBlank()) {
            String newSlug = request.slug().trim();
            if (!newSlug.equalsIgnoreCase(article.getSlug())) {
                articleRepository.findBySlug(newSlug).ifPresent(existing -> {
                    if (!existing.getId().equals(id)) {
                        throw new IllegalArgumentException("Đường dẫn (slug) đã tồn tại!");
                    }
                });
                changes.put("slug", Map.of("old", String.valueOf(article.getSlug()), "new", newSlug));
                article.setSlug(newSlug);
            }
        }
        if (request.category() != null) {
            String nextCat = request.category().trim();
            if (!Objects.equals(article.getCategory(), nextCat)) {
                changes.put("category", Map.of("old", String.valueOf(article.getCategory()), "new", nextCat));
            }
            article.setCategory(nextCat);
        }
        if (request.collectionSlug() != null) {
            String nextCol = request.collectionSlug().trim().isBlank() ? null : request.collectionSlug().trim();
            if (!Objects.equals(article.getCollectionSlug(), nextCol)) {
                changes.put("collectionSlug", Map.of("old", String.valueOf(article.getCollectionSlug()), "new", String.valueOf(nextCol)));
            }
            article.setCollectionSlug(nextCol);
        }
        if (request.author() != null) {
            String nextAuthor = request.author().trim();
            if (!Objects.equals(article.getAuthor(), nextAuthor)) {
                changes.put("author", Map.of("old", String.valueOf(article.getAuthor()), "new", nextAuthor));
            }
            article.setAuthor(nextAuthor);
        }
        if (request.status() != null) {
            String nextStatus = request.status().trim();
            if (!Objects.equals(article.getStatus(), nextStatus)) {
                changes.put("status", Map.of("old", String.valueOf(article.getStatus()), "new", nextStatus));
            }
            article.setStatus(nextStatus);
        }
        if (request.image() != null) {
            if (!Objects.equals(article.getImage(), request.image())) {
                changes.put("image", Map.of("old", String.valueOf(article.getImage()), "new", request.image()));
            }
            article.setImage(request.image());
        }
        if (request.summary() != null) {
            if (!Objects.equals(article.getSummary(), request.summary())) {
                changes.put("summary", Map.of("old", String.valueOf(article.getSummary()), "new", request.summary()));
            }
            article.setSummary(request.summary());
        }
        if (request.content() != null) {
            if (!Objects.equals(article.getContent(), request.content())) {
                int oldLen = article.getContent() != null ? article.getContent().length() : 0;
                int newLen = request.content().length();
                changes.put("content", Map.of("oldLength", oldLen, "newLength", newLen));
            }
            article.setContent(request.content());
        }

        Article saved = articleRepository.save(article);
        log.info("[ARTICLE-UPDATE] Cập nhật bài viết id={} title='{}' slug='{}' | Chi tiết các trường thay đổi ({}): {}",
                id, saved.getTitle(), saved.getSlug(), changes.size(), changes);
        recordAudit("ARTICLE_UPDATE", id, Map.of(
                "id", id,
                "title", saved.getTitle(),
                "slug", saved.getSlug(),
                "changes", changes
        ));
        return ArticleDTO.ArticleResponse.fromEntity(saved);
    }

    public void softDeleteArticle(Long id) {
        Article article = articleRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy bài viết"));
        article.setIsDeleted(true);
        articleRepository.save(article);
        log.warn("[ARTICLE-SOFT-DELETE] Xóa mềm bài viết id={} title='{}' slug='{}'", id, article.getTitle(), article.getSlug());
        recordAudit("ARTICLE_SOFT_DELETE", id, Map.of("id", id, "title", article.getTitle(), "slug", article.getSlug(), "isDeleted", true));
    }

    public ArticleDTO.ArticleResponse restoreArticle(Long id) {
        Article article = articleRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy bài viết"));
        article.setIsDeleted(false);
        Article saved = articleRepository.save(article);
        log.info("[ARTICLE-RESTORE] Khôi phục bài viết id={} title='{}' slug='{}'", id, saved.getTitle(), saved.getSlug());
        recordAudit("ARTICLE_RESTORE", id, Map.of("id", id, "title", saved.getTitle(), "slug", saved.getSlug(), "isDeleted", false));
        return ArticleDTO.ArticleResponse.fromEntity(saved);
    }

    public ArticleDTO.ArticleResponse updateArticleStatus(Long id, String status) {
        Article article = articleRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy bài viết ID: " + id));
        String oldStatus = article.getStatus();

        if (status != null && !status.isBlank()) {
            article.setStatus(status.trim().toLowerCase());
        } else {
            // Tự động đảo ngược trạng thái: published <-> hidden
            String currentStatus = article.getStatus();
            if ("hidden".equalsIgnoreCase(currentStatus)) {
                article.setStatus("published");
            } else {
                article.setStatus("hidden");
            }
        }
        Article saved = articleRepository.save(article);
        log.info("[ARTICLE-STATUS-UPDATE] Đổi trạng thái bài viết id={} title='{}': [{} -> {}]",
                id, saved.getTitle(), oldStatus, saved.getStatus());
        recordAudit("ARTICLE_STATUS_UPDATE", id, Map.of(
                "id", id,
                "title", saved.getTitle(),
                "oldStatus", String.valueOf(oldStatus),
                "newStatus", String.valueOf(saved.getStatus())
        ));
        return ArticleDTO.ArticleResponse.fromEntity(saved);
    }

    public void permanentDeleteArticle(Long id) {
        Article existing = articleRepository.findById(id).orElse(null);
        articleRepository.deleteById(id);
        log.warn("[ARTICLE-PERMANENT-DELETE] Xóa vĩnh viễn bài viết id={} title='{}'",
                id, existing != null ? existing.getTitle() : "N/A");
        recordAudit("ARTICLE_PERMANENT_DELETE", id, Map.of(
                "id", id,
                "title", existing != null ? existing.getTitle() : "N/A"
        ));
    }

    private void recordAudit(String action, Object entityId, Map<String, Object> details) {
        try {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            String username = (auth != null && auth.isAuthenticated()) ? auth.getName() : "SYSTEM";
            User actor = userRepository.findByUsername(username).orElse(null);
            String json = objectMapper.writeValueAsString(details);
            auditLogService.record(actor, action, "ARTICLE", String.valueOf(entityId), json, null);
        } catch (Exception ex) {
            log.warn("[ARTICLE-AUDIT-ERROR] Không thể ghi audit log: action={} | id={} | err={}", action, entityId, ex.getMessage());
        }
    }

    /**
     * Tải lên và lưu trữ ảnh bài viết vào thư mục uploads/articles/
     */
    public String uploadImage(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Vui lòng chọn file ảnh để tải lên");
        }
        String originalFilename = file.getOriginalFilename();
        String extension = "";
        if (originalFilename != null && originalFilename.lastIndexOf('.') != -1) {
            extension = originalFilename.substring(originalFilename.lastIndexOf('.')).toLowerCase(Locale.ROOT);
        }
        if (!List.of(".jpg", ".jpeg", ".png", ".webp", ".gif", ".svg").contains(extension)) {
            throw new IllegalArgumentException("Định dạng ảnh không hợp lệ (hỗ trợ JPG, PNG, WEBP, GIF, SVG)");
        }
        if (file.getSize() > 10L * 1024 * 1024) {
            throw new IllegalArgumentException("Dung lượng ảnh không được vượt quá 10MB");
        }

        String storedName = UUID.randomUUID() + extension;
        Path storageDir = Path.of("uploads/articles").toAbsolutePath().normalize();
        try {
            Files.createDirectories(storageDir);
            Path destination = storageDir.resolve(storedName).normalize();
            try (InputStream is = file.getInputStream()) {
                Files.copy(is, destination, StandardCopyOption.REPLACE_EXISTING);
            }
        } catch (IOException e) {
            throw new IllegalStateException("Lỗi khi lưu trữ file ảnh: " + e.getMessage(), e);
        }

        return "/uploads/articles/" + storedName;
    }

    public static String toSlug(String input) {
        if (input == null) return "";
        String nowhitespace = WHITESPACE.matcher(input).replaceAll("-");
        String normalized = Normalizer.normalize(nowhitespace, Normalizer.Form.NFD);
        String slug = NONLATIN.matcher(normalized).replaceAll("");
        return slug.toLowerCase(Locale.ENGLISH)
                .replaceAll("-+", "-")
                .replaceAll("^-|-$", "");
    }
}
