package vn.nhaxinh.policy;

import java.text.Normalizer;
import java.util.*;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.nhaxinh.security.ApiException;
import vn.nhaxinh.security.ApiErrorCode;
import vn.nhaxinh.policy.PolicyDtos.*;

@Service
public class PolicyService {
    private static final int PAGE_ID = 1;

    private final PolicyPageRepository legacyRepository;
    private final PolicyRepository policyRepository;

    public PolicyService(PolicyPageRepository legacyRepository) {
        this(legacyRepository, null);
    }

    @org.springframework.beans.factory.annotation.Autowired
    public PolicyService(PolicyPageRepository legacyRepository, PolicyRepository policyRepository) {
        this.legacyRepository = legacyRepository;
        this.policyRepository = policyRepository;
    }

    // ───────────────────────────────────────────────
    // Modern Policy CRUD
    // ───────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<PolicyResponse> getAllPolicies(String status, String keyword) {
        String cleanStatus = (status != null && !status.isBlank() && !status.equalsIgnoreCase("ALL")) ? status.trim().toUpperCase() : null;
        String cleanKeyword = (keyword != null && !keyword.isBlank()) ? keyword.trim() : null;
        return policyRepository.searchPolicies(cleanStatus, cleanKeyword).stream()
                .map(PolicyResponse::from)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<PolicyResponse> getPublishedPolicies() {
        return policyRepository.findByStatusOrderByCreatedAtDesc("PUBLISHED").stream()
                .map(PolicyResponse::from)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public PolicyResponse getPolicyById(Integer id) {
        Policy policy = policyRepository.findById(id)
                .orElseThrow(() -> new ApiException(ApiErrorCode.RESOURCE_NOT_FOUND, "Không tìm thấy chính sách #" + id));
        return PolicyResponse.from(policy);
    }

    @Transactional(readOnly = true)
    public PolicyResponse getPolicyBySlug(String slug) {
        Policy policy = policyRepository.findBySlug(slug)
                .orElseThrow(() -> new ApiException(ApiErrorCode.RESOURCE_NOT_FOUND, "Không tìm thấy chính sách với mã: " + slug));
        return PolicyResponse.from(policy);
    }

    @Transactional
    public Policy createPolicy(CreatePolicyRequest req, String actorUsername) {
        String slug = (req.slug() != null && !req.slug().isBlank())
                ? slugify(req.slug())
                : slugify(req.title());

        if (slug.isBlank()) {
            slug = "chinh-sach-" + System.currentTimeMillis();
        }

        // Ensure unique slug
        String candidateSlug = slug;
        int count = 1;
        while (policyRepository.existsBySlug(candidateSlug)) {
            candidateSlug = slug + "-" + count++;
        }

        Policy policy = new Policy();
        policy.setSlug(candidateSlug);
        policy.setTitle(req.title().trim());
        policy.setShortTitle(req.shortTitle() != null && !req.shortTitle().isBlank() ? req.shortTitle().trim() : req.title().trim());
        policy.setIntro(req.intro() != null ? req.intro().trim() : "");
        policy.setContent(req.content() != null ? req.content() : "");
        policy.setTemplateType(req.templateType() != null && !req.templateType().isBlank() ? req.templateType().trim() : "custom");
        policy.setFontFamily(req.fontFamily() != null && !req.fontFamily().isBlank() ? req.fontFamily().trim() : "Be Vietnam Pro, sans-serif");
        policy.setFontSize(req.fontSize() != null && !req.fontSize().isBlank() ? req.fontSize().trim() : "15px");
        policy.setLineHeight(req.lineHeight() != null && !req.lineHeight().isBlank() ? req.lineHeight().trim() : "1.75");
        policy.setAccentColor(req.accentColor() != null && !req.accentColor().isBlank() ? req.accentColor().trim() : "#b38e5d");
        policy.setStatus(req.status() != null && !req.status().isBlank() ? req.status().trim().toUpperCase() : "PUBLISHED");
        policy.setUpdatedBy(actorUsername != null ? actorUsername : "admin");

        return policyRepository.save(policy);
    }

    @Transactional
    public Policy updatePolicy(Integer id, UpdatePolicyRequest req, String actorUsername) {
        Policy policy = policyRepository.findById(id)
                .orElseThrow(() -> new ApiException(ApiErrorCode.RESOURCE_NOT_FOUND, "Không tìm thấy chính sách #" + id));

        if (req.slug() != null && !req.slug().isBlank()) {
            String candidateSlug = slugify(req.slug());
            if (policyRepository.existsBySlugAndIdNot(candidateSlug, id)) {
                throw new ApiException(ApiErrorCode.RESOURCE_CONFLICT, "Mã định danh (slug) '" + candidateSlug + "' đã tồn tại.");
            }
            policy.setSlug(candidateSlug);
        }

        policy.setTitle(req.title().trim());
        if (req.shortTitle() != null) policy.setShortTitle(req.shortTitle().trim());
        if (req.intro() != null) policy.setIntro(req.intro().trim());
        if (req.content() != null) policy.setContent(req.content());
        if (req.templateType() != null) policy.setTemplateType(req.templateType().trim());
        if (req.fontFamily() != null && !req.fontFamily().isBlank()) policy.setFontFamily(req.fontFamily().trim());
        if (req.fontSize() != null && !req.fontSize().isBlank()) policy.setFontSize(req.fontSize().trim());
        if (req.lineHeight() != null && !req.lineHeight().isBlank()) policy.setLineHeight(req.lineHeight().trim());
        if (req.accentColor() != null && !req.accentColor().isBlank()) policy.setAccentColor(req.accentColor().trim());
        if (req.status() != null && !req.status().isBlank()) policy.setStatus(req.status().trim().toUpperCase());
        policy.setUpdatedBy(actorUsername != null ? actorUsername : "admin");

        return policyRepository.save(policy);
    }

    @Transactional
    public Policy deletePolicy(Integer id) {
        Policy policy = policyRepository.findById(id)
                .orElseThrow(() -> new ApiException(ApiErrorCode.RESOURCE_NOT_FOUND, "Không tìm thấy chính sách #" + id));
        policyRepository.delete(policy);
        return policy;
    }

    public static String slugify(String input) {
        if (input == null) return "";
        String normalized = Normalizer.normalize(input, Normalizer.Form.NFD);
        return normalized.replaceAll("\\p{InCombiningDiacriticalMarks}+", "")
                .toLowerCase()
                .replaceAll("[đĐ]", "d")
                .replaceAll("[^a-z0-9\\s-]", "")
                .trim()
                .replaceAll("\\s+", "-")
                .replaceAll("-+", "-");
    }

    // ───────────────────────────────────────────────
    // Legacy PolicyPage Handlers (for backward compatibility)
    // ───────────────────────────────────────────────

    @Transactional(readOnly = true)
    public PolicyContentResponse getPolicy() {
        return PolicyContentResponse.from(findLegacyPolicy());
    }

    @Transactional
    public PolicyContentResponse updatePolicy(PolicyContentRequest request) {
        PolicyPage page = findLegacyPolicy();
        page.setTitle(request.title().trim());
        page.setIntroduction(request.introduction().trim());
        page.setPurchasePolicy(request.purchasePolicy().trim());
        page.setReturnPolicy(request.returnPolicy().trim());
        return PolicyContentResponse.from(legacyRepository.save(page));
    }

    private PolicyPage findLegacyPolicy() {
        return legacyRepository.findById(PAGE_ID)
                .orElseThrow(() -> new IllegalStateException("Nội dung chính sách chưa được khởi tạo."));
    }
}
