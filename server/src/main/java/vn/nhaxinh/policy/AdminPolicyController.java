package vn.nhaxinh.policy;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import java.net.URI;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import vn.nhaxinh.admin.RbacAuditRecorder;
import vn.nhaxinh.controller.BaseController;
import vn.nhaxinh.policy.PolicyDtos.CreatePolicyRequest;
import vn.nhaxinh.policy.PolicyDtos.PolicyResponse;
import vn.nhaxinh.policy.PolicyDtos.UpdatePolicyRequest;

@RestController
@RequestMapping(BaseController.API_V1 + "/admin/policies")
public class AdminPolicyController extends BaseController {

    private static final Logger log = LoggerFactory.getLogger(AdminPolicyController.class);
    private static final String ENTITY_POLICY = "POLICY";

    private final PolicyService policyService;
    private final RbacAuditRecorder auditRecorder;

    public AdminPolicyController(PolicyService policyService, RbacAuditRecorder auditRecorder) {
        this.policyService = policyService;
        this.auditRecorder = auditRecorder;
    }

    @GetMapping
    public ResponseEntity<List<PolicyResponse>> getAllPolicies(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String keyword) {
        return ResponseEntity.ok(policyService.getAllPolicies(status, keyword));
    }

    @GetMapping("/{id}")
    public ResponseEntity<PolicyResponse> getPolicyById(@PathVariable Integer id) {
        return ResponseEntity.ok(policyService.getPolicyById(id));
    }

    @PostMapping
    public ResponseEntity<PolicyResponse> createPolicy(
            @Valid @RequestBody CreatePolicyRequest request,
            @AuthenticationPrincipal UserDetails principal,
            HttpServletRequest servletRequest) {
        String actor = principal != null ? principal.getUsername() : "admin";
        Policy created = policyService.createPolicy(request, actor);

        log.info("[POLICY-CREATE] Tạo chính sách mới | id={} | slug={} | title='{}' | font='{}' | actor={}",
                created.getId(), created.getSlug(), created.getTitle(), created.getFontFamily(), actor);

        Map<String, Object> details = new LinkedHashMap<>();
        details.put("slug", created.getSlug());
        details.put("title", created.getTitle());
        details.put("shortTitle", created.getShortTitle());
        details.put("templateType", created.getTemplateType());
        details.put("fontFamily", created.getFontFamily());
        details.put("fontSize", created.getFontSize());
        details.put("lineHeight", created.getLineHeight());
        details.put("status", created.getStatus());
        details.put("contentLength", created.getContent() != null ? created.getContent().length() : 0);

        auditRecorder.record(principal, servletRequest, "POLICY_CREATE", ENTITY_POLICY, created.getId(), details);

        return ResponseEntity.created(URI.create(API_V1 + "/admin/policies/" + created.getId()))
                .body(PolicyResponse.from(created));
    }

    @PutMapping("/{id}")
    public ResponseEntity<PolicyResponse> updatePolicy(
            @PathVariable Integer id,
            @Valid @RequestBody UpdatePolicyRequest request,
            @AuthenticationPrincipal UserDetails principal,
            HttpServletRequest servletRequest) {
        String actor = principal != null ? principal.getUsername() : "admin";

        // Get snapshot before update for audit comparison
        PolicyResponse before = policyService.getPolicyById(id);
        Policy updated = policyService.updatePolicy(id, request, actor);

        log.info("[POLICY-UPDATE] Cập nhật chính sách | id={} | slug={} | title='{}' | font='{}' | status={} | actor={}",
                updated.getId(), updated.getSlug(), updated.getTitle(), updated.getFontFamily(), updated.getStatus(), actor);

        Map<String, Object> details = new LinkedHashMap<>();
        details.put("slug", updated.getSlug());
        details.put("title", updated.getTitle());
        details.put("shortTitle", updated.getShortTitle());
        details.put("templateType", updated.getTemplateType());
        details.put("fontFamily", updated.getFontFamily());
        details.put("fontSize", updated.getFontSize());
        details.put("lineHeight", updated.getLineHeight());
        details.put("status", updated.getStatus());

        Map<String, Object> changes = new LinkedHashMap<>();
        if (!Objects.equals(before.title(), updated.getTitle())) {
            changes.put("title", Map.of("old", before.title() != null ? before.title() : "", "new", updated.getTitle() != null ? updated.getTitle() : ""));
        }
        if (!Objects.equals(before.shortTitle(), updated.getShortTitle())) {
            changes.put("shortTitle", Map.of("old", String.valueOf(before.shortTitle()), "new", String.valueOf(updated.getShortTitle())));
        }
        if (!Objects.equals(before.slug(), updated.getSlug())) {
            changes.put("slug", Map.of("old", before.slug() != null ? before.slug() : "", "new", updated.getSlug() != null ? updated.getSlug() : ""));
        }
        if (!Objects.equals(before.intro(), updated.getIntro())) {
            changes.put("intro", Map.of("old", String.valueOf(before.intro()), "new", String.valueOf(updated.getIntro())));
        }
        if (!Objects.equals(before.templateType(), updated.getTemplateType())) {
            changes.put("templateType", Map.of("old", String.valueOf(before.templateType()), "new", String.valueOf(updated.getTemplateType())));
        }
        if (!Objects.equals(before.fontFamily(), updated.getFontFamily())) {
            changes.put("fontFamily", Map.of("old", before.fontFamily() != null ? before.fontFamily() : "", "new", updated.getFontFamily() != null ? updated.getFontFamily() : ""));
        }
        if (!Objects.equals(before.fontSize(), updated.getFontSize())) {
            changes.put("fontSize", Map.of("old", before.fontSize() != null ? before.fontSize() : "", "new", updated.getFontSize() != null ? updated.getFontSize() : ""));
        }
        if (!Objects.equals(before.lineHeight(), updated.getLineHeight())) {
            changes.put("lineHeight", Map.of("old", String.valueOf(before.lineHeight()), "new", String.valueOf(updated.getLineHeight())));
        }
        if (!Objects.equals(before.accentColor(), updated.getAccentColor())) {
            changes.put("accentColor", Map.of("old", String.valueOf(before.accentColor()), "new", String.valueOf(updated.getAccentColor())));
        }
        if (!Objects.equals(before.status(), updated.getStatus())) {
            changes.put("status", Map.of("old", before.status() != null ? before.status() : "", "new", updated.getStatus() != null ? updated.getStatus() : ""));
        }
        if (!Objects.equals(before.content(), updated.getContent())) {
            changes.put("content", Map.of(
                    "oldLength", before.content() != null ? before.content().length() : 0,
                    "newLength", updated.getContent() != null ? updated.getContent().length() : 0
            ));
        }
        details.put("changes", changes);

        log.info("[POLICY-UPDATE-DETAIL] Chính sách id={} slug='{}' | actor='{}' | Chi tiết các trường thay đổi ({}): {}",
                updated.getId(), updated.getSlug(), actor, changes.size(), changes);

        auditRecorder.record(principal, servletRequest, "POLICY_UPDATE", ENTITY_POLICY, updated.getId(), details);

        return ResponseEntity.ok(PolicyResponse.from(updated));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, Object>> deletePolicy(
            @PathVariable Integer id,
            @AuthenticationPrincipal UserDetails principal,
            HttpServletRequest servletRequest) {
        String actor = principal != null ? principal.getUsername() : "admin";
        Policy deleted = policyService.deletePolicy(id);

        log.info("[POLICY-DELETE] Xóa chính sách | id={} | slug={} | title='{}' | actor={}",
                deleted.getId(), deleted.getSlug(), deleted.getTitle(), actor);

        Map<String, Object> details = new LinkedHashMap<>();
        details.put("slug", deleted.getSlug());
        details.put("title", deleted.getTitle());
        details.put("templateType", deleted.getTemplateType());

        auditRecorder.record(principal, servletRequest, "POLICY_DELETE", ENTITY_POLICY, id, details);

        return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Đã xóa chính sách '" + deleted.getTitle() + "' thành công.",
                "id", id,
                "slug", deleted.getSlug()
        ));
    }
}
