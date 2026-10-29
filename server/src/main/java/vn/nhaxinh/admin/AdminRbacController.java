package vn.nhaxinh.admin;

import static vn.nhaxinh.admin.RbacAuditRecorder.ENTITY_USER;
import static vn.nhaxinh.admin.RbacAuditRecorder.details;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import java.net.URI;
import java.time.LocalDateTime;
import java.util.*;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import vn.nhaxinh.admin.RbacDtos.*;
import vn.nhaxinh.audit.AuditLog;
import vn.nhaxinh.audit.AuditLogService;
import vn.nhaxinh.controller.BaseController;
import vn.nhaxinh.security.ApiErrorCode;
import vn.nhaxinh.security.ApiException;
import vn.nhaxinh.user.User;

/**
 * Gán vai trò cho người dùng và tra cứu nhật ký phân quyền (audit log).
 *
 * <pre>
 * GET    /api/v1/admin/users?role=              Danh sách người dùng (lọc theo mã vai trò)
 * POST   /api/v1/admin/users                    Tạo mới tài khoản nhân sự nội bộ (Staff/Manager/Sales...)
 * GET    /api/v1/admin/users/{id}/roles         Vai trò + quyền hiệu lực của người dùng
 * PUT    /api/v1/admin/users/{id}/roles         Thay thế tập vai trò của người dùng
 * PATCH  /api/v1/admin/users/{id}/status        Khóa / Mở khóa tài khoản người dùng (ACTIVE | LOCKED | INACTIVE)
 * GET    /api/v1/admin/audit-logs               Tra cứu audit log (lọc + phân trang)
 * POST   /api/v1/admin/audit-logs               Ghi nhận thêm nhật ký kiểm toán từ cổng quản trị
 * GET    /api/v1/admin/audit-logs/{id}          Chi tiết 1 bản ghi audit log
 * </pre>
 */
@RestController
@RequestMapping(BaseController.API_V1 + "/admin")
@PreAuthorize("hasRole('ADMIN')")
public class AdminRbacController extends BaseController {

    private final RbacService rbacService;
    private final AuditLogService auditLogService;
    private final RbacAuditRecorder audit;
    private final ObjectMapper objectMapper;

    public AdminRbacController(
            RbacService rbacService,
            AuditLogService auditLogService,
            RbacAuditRecorder audit,
            ObjectMapper objectMapper
    ) {
        this.rbacService = rbacService;
        this.auditLogService = auditLogService;
        this.audit = audit;
        this.objectMapper = objectMapper;
    }

    // =====================================================================
    // USER ROLES
    // =====================================================================

    @GetMapping("/users")
    public ResponseEntity<List<UserRbacResponse>> listUsers(@RequestParam(required = false) String role) {
        return ResponseEntity.ok(rbacService.findUsers(role).stream().map(UserRbacResponse::of).toList());
    }

    @PostMapping("/users")
    public ResponseEntity<UserRbacResponse> createStaffUser(
            @Valid @RequestBody CreateStaffRequest request,
            @AuthenticationPrincipal UserDetails principal,
            HttpServletRequest httpRequest
    ) {
        String actor = principal != null ? principal.getUsername() : null;
        User created = rbacService.createStaffUser(
                request.username(),
                request.password(),
                request.fullName(),
                request.email(),
                request.phone(),
                request.roles(),
                actor
        );

        audit.record(principal, httpRequest, "USER_CREATE", ENTITY_USER, created.getId(), details(
                "username", created.getUsername(),
                "fullName", created.getFullName(),
                "email", created.getEmail(),
                "accountType", created.getAccountType(),
                "roles", RbacService.roleCodesOf(created)
        ));

        return ResponseEntity
                .created(URI.create(API_V1 + "/admin/users/" + created.getId() + "/roles"))
                .body(UserRbacResponse.of(created));
    }

    @GetMapping("/users/{id}/roles")
    public ResponseEntity<UserRbacDetailResponse> getUserRoles(@PathVariable Long id) {
        return ResponseEntity.ok(UserRbacDetailResponse.of(rbacService.getUser(id)));
    }

    @PutMapping("/users/{id}/roles")
    public ResponseEntity<UserRbacDetailResponse> assignRoles(
            @PathVariable Long id,
            @Valid @RequestBody AssignRolesRequest request,
            @AuthenticationPrincipal UserDetails principal,
            HttpServletRequest httpRequest
    ) {
        String actor = principal != null ? principal.getUsername() : null;
        RbacService.RoleAssignment assignment = rbacService.assignRoles(id, request.roles(), actor);

        audit.record(principal, httpRequest, "ASSIGN_ROLES", ENTITY_USER, id, details(
                "username", assignment.user().getUsername(),
                "fullName", assignment.user().getFullName(),
                "email", assignment.user().getEmail(),
                "before", assignment.before(),
                "after", assignment.after()
        ));

        return ResponseEntity.ok(UserRbacDetailResponse.of(assignment.user()));
    }

    @PatchMapping("/users/{id}/status")
    public ResponseEntity<UserRbacResponse> updateUserStatus(
            @PathVariable Long id,
            @Valid @RequestBody UpdateUserStatusRequest request,
            @AuthenticationPrincipal UserDetails principal,
            HttpServletRequest httpRequest
    ) {
        String actor = principal != null ? principal.getUsername() : null;
        RbacService.UserStatusChange change = rbacService.updateUserStatus(id, request.status(), request.note(), actor);

        audit.record(principal, httpRequest, "USER_STATUS_UPDATE", ENTITY_USER, id, details(
                "username", change.user().getUsername(),
                "fullName", change.user().getFullName(),
                "oldStatus", change.oldStatus(),
                "newStatus", change.newStatus(),
                "note", change.note()
        ));

        return ResponseEntity.ok(UserRbacResponse.of(change.user()));
    }

    // =====================================================================
    // AUDIT LOGS
    // =====================================================================

    @GetMapping("/audit-logs")
    public ResponseEntity<Page<AuditLogResponse>> searchAuditLogs(
            @RequestParam(required = false) String action,
            @RequestParam(required = false) String entityType,
            @RequestParam(required = false) String entityId,
            @RequestParam(required = false) Long userId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime to,
            @PageableDefault(size = 20) Pageable pageable
    ) {
        Page<AuditLog> page = auditLogService.search(action, entityType, entityId, userId, from, to, pageable);
        return ResponseEntity.ok(page.map(this::toAuditResponse));
    }

    @PostMapping("/audit-logs")
    public ResponseEntity<Void> createCustomAuditLog(
            @Valid @RequestBody CreateAuditLogRequest request,
            @AuthenticationPrincipal UserDetails principal,
            HttpServletRequest httpRequest
    ) {
        Map<String, Object> detailsMap = new LinkedHashMap<>();
        if (request.target() != null && !request.target().isBlank()) {
            detailsMap.put("target", request.target().trim());
        }
        if (request.description() != null && !request.description().isBlank()) {
            detailsMap.put("description", request.description().trim());
        }
        if (request.metadata() != null) {
            detailsMap.putAll(request.metadata());
        }
        audit.record(
                principal,
                httpRequest,
                request.action().trim().toUpperCase(),
                request.entityType().trim().toUpperCase(),
                request.entityId(),
                detailsMap
        );
        return ResponseEntity.status(HttpStatus.CREATED).build();
    }

    @GetMapping("/audit-logs/{id}")
    public ResponseEntity<AuditLogResponse> getAuditLog(@PathVariable Long id) {
        AuditLog entry = auditLogService.findById(id)
                .orElseThrow(() -> new ApiException(ApiErrorCode.RESOURCE_NOT_FOUND, "auditLogId=" + id));
        return ResponseEntity.ok(toAuditResponse(entry));
    }

    private AuditLogResponse toAuditResponse(AuditLog a) {
        User u = a.getUser();
        JsonNode parsedDetails = null;
        if (a.getDetails() != null) {
            try {
                parsedDetails = objectMapper.readTree(a.getDetails());
            } catch (Exception ignored) {
                parsedDetails = objectMapper.getNodeFactory().textNode(a.getDetails());
            }
        }
        return new AuditLogResponse(
                a.getId(),
                a.getAction(),
                a.getEntityType(),
                a.getEntityId(),
                u != null ? u.getId() : null,
                u != null ? u.getUsername() : null,
                parsedDetails,
                a.getIpAddress(),
                a.getCreatedAt()
        );
    }

    public record CreateAuditLogRequest(
            @NotBlank String action,
            @NotBlank String entityType,
            String entityId,
            String target,
            String description,
            Map<String, Object> metadata
    ) {}
}
