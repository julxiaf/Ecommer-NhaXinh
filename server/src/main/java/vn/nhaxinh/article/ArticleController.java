package vn.nhaxinh.article;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import vn.nhaxinh.controller.BaseController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping(BaseController.API_V1)
public class ArticleController extends BaseController {

    private final ArticleService articleService;

    public ArticleController(ArticleService articleService) {
        this.articleService = articleService;
    }

    // ── PUBLIC APIS ──

    @GetMapping("/articles")
    public List<ArticleDTO.ArticleResponse> getPublicArticles(
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String collectionSlug,
            @RequestParam(required = false) String search
    ) {
        return articleService.getPublicArticles(category, collectionSlug, search);
    }

    @GetMapping("/articles/{idOrSlug}")
    public ArticleDTO.ArticleResponse getArticleDetail(@PathVariable String idOrSlug) {
        return articleService.getArticleByIdOrSlug(idOrSlug);
    }

    @GetMapping("/articles/collection/{collectionSlug}")
    public List<ArticleDTO.ArticleResponse> getCollectionArticles(@PathVariable String collectionSlug) {
        return articleService.getPublicArticles(null, collectionSlug, null);
    }

    // ── ADMIN & MANAGEMENT APIS ──

    @GetMapping({"/admin/articles", "/articles/all"})
    public List<ArticleDTO.ArticleResponse> getAdminArticles(
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String collectionSlug,
            @RequestParam(required = false) Boolean isDeleted,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String search
    ) {
        return articleService.getAdminArticles(category, collectionSlug, isDeleted, status, search);
    }

    @PostMapping({"/admin/articles", "/articles"})
    @ResponseStatus(HttpStatus.CREATED)
    public ArticleDTO.ArticleResponse createArticle(@Valid @RequestBody ArticleDTO.ArticleRequest request) {
        return articleService.createArticle(request);
    }

    @PutMapping({"/admin/articles/{id}", "/articles/{id}"})
    public ArticleDTO.ArticleResponse updateArticle(
            @PathVariable Long id,
            @Valid @RequestBody ArticleDTO.ArticleRequest request
    ) {
        return articleService.updateArticle(id, request);
    }

    @DeleteMapping({"/admin/articles/{id}", "/articles/{id}"})
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void softDeleteArticle(@PathVariable Long id) {
        articleService.softDeleteArticle(id);
    }

    @PatchMapping({"/admin/articles/{id}/restore", "/articles/{id}/restore"})
    public ArticleDTO.ArticleResponse restoreArticle(@PathVariable Long id) {
        return articleService.restoreArticle(id);
    }

    @PatchMapping({"/admin/articles/{id}/status", "/articles/{id}/status"})
    public ArticleDTO.ArticleResponse updateArticleStatus(
            @PathVariable Long id,
            @RequestParam(required = false) String status
    ) {
        return articleService.updateArticleStatus(id, status);
    }

    @DeleteMapping({"/admin/articles/{id}/permanent", "/articles/{id}/permanent"})
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void permanentDeleteArticle(@PathVariable Long id) {
        articleService.permanentDeleteArticle(id);
    }

    @PostMapping(value = {"/articles/upload-image", "/admin/articles/upload-image"}, consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public Map<String, String> uploadArticleImage(@RequestParam("file") MultipartFile file) {
        String url = articleService.uploadImage(file);
        return Map.of("url", url);
    }
}
