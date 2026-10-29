package vn.nhaxinh.admin;

import static vn.nhaxinh.admin.RbacAuditRecorder.ENTITY_PERMISSION;
import static vn.nhaxinh.admin.RbacAuditRecorder.details;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import java.net.URI;
import java.util.List;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import vn.nhaxinh.admin.RbacDtos.*;
import vn.nhaxinh.controller.BaseController;
import vn.nhaxinh.user.Permission;

/**
 * CRUD quyền hạn (Permission).
 *
 * <pre>
 * GET    /api/v1/admin/permissions?module=      Danh sách quyền (lọc theo module)
 * GET    /api/v1/admin/permissions/modules      Danh sách module
 * GET    /api/v1/admin/permissions/{id}         Chi tiết quyền + vai trò đang dùng
 * POST   /api/v1/admin/permissions              Tạo quyền
 * PUT    /api/v1/admin/permissions/{id}         Cập nhật tên/module/mô tả (code bất biến)
 * DELETE /api/v1/admin/permissions/{id}?force=  Xóa quyền (force=true: tự gỡ khỏi các vai trò)
 * </pre>
 */
@RestController
@RequestMapping(BaseController.API_V1 + "/admin/permissions")
@PreAuthorize("hasRole('ADMIN')")
public class AdminPermissionController extends BaseController {

    private final RbacService rbacService;
    private final RbacAuditRecorder audit;

    public AdminPermissionController(RbacService rbacService, RbacAuditRecorder audit) {
        this.rbacService = rbacService;
        this.audit = audit;
    }

    @GetMapping
    public ResponseEntity<List<PermissionResponse>> list(@RequestParam(required = false) String module) {
        return ResponseEntity.ok(rbacService.findPermissions(module).stream().map(PermissionResponse::of).toList());
    }

    @GetMapping("/modules")
    public ResponseEntity<List<String>> modules() {
        return ResponseEntity.ok(rbacService.findPermissionModules());
    }

    @GetMapping("/{id}")
    public ResponseEntity<PermissionDetailResponse> get(@PathVariable Long id) {
        Permission p = rbacService.getPermission(id);
        return ResponseEntity.ok(PermissionDetailResponse.of(p, rbacService.findRoleCodesUsingPermission(id)));
    }

    @PostMapping
    public ResponseEntity<PermissionResponse> create(
            @Valid @RequestBody CreatePermissionRequest request,
            @AuthenticationPrincipal UserDetails principal,
            HttpServletRequest httpRequest
    ) {
        Permission p = rbacService.createPermission(
                request.code(), request.name(), request.module(), request.description());

        audit.record(principal, httpRequest, "PERMISSION_CREATE", ENTITY_PERMISSION, p.getId(), details(
                "code", p.getCode(),
                "name", p.getName(),
                "module", p.getModule(),
                "description", p.getDescription()
        ));

        return ResponseEntity
                .created(URI.create(API_V1 + "/admin/permissions/" + p.getId()))
                .body(PermissionResponse.of(p));
    }

    @PutMapping("/{id}")
    public ResponseEntity<PermissionResponse> update(
            @PathVariable Long id,
            @Valid @RequestBody UpdatePermissionRequest request,
            @AuthenticationPrincipal UserDetails principal,
            HttpServletRequest httpRequest
    ) {
        RbacService.PermissionChange change = rbacService.updatePermission(
                id, request.name(), request.module(), request.description());

        audit.record(principal, httpRequest, "PERMISSION_UPDATE", ENTITY_PERMISSION, id, details(
                "code", change.permission().getCode(),
                "before", change.before(),
                "after", change.after()
        ));

        return ResponseEntity.ok(PermissionResponse.of(change.permission()));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, Object>> delete(
            @PathVariable Long id,
            @RequestParam(defaultValue = "false") boolean force,
            @AuthenticationPrincipal UserDetails principal,
            HttpServletRequest httpRequest
    ) {
        RbacService.PermissionDeletion deletion = rbacService.deletePermission(id, force);
        Permission p = deletion.permission();

        audit.record(principal, httpRequest, "PERMISSION_DELETE", ENTITY_PERMISSION, id, details(
                "code", p.getCode(),
                "name", p.getName(),
                "module", p.getModule(),
                "force", force,
                "detachedFromRoles", deletion.detachedFromRoles()
        ));

        return ResponseEntity.ok(Map.of(
                "message", "Đã xóa quyền hạn thành công",
                "id", id,
                "code", p.getCode(),
                "detachedFromRoles", deletion.detachedFromRoles()
        ));
    }
}
