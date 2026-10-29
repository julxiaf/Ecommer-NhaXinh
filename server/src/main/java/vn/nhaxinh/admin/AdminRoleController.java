package vn.nhaxinh.admin;

import static vn.nhaxinh.admin.RbacAuditRecorder.ENTITY_ROLE;
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
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import vn.nhaxinh.admin.RbacDtos.CreateRoleRequest;
import vn.nhaxinh.admin.RbacDtos.RoleResponse;
import vn.nhaxinh.admin.RbacDtos.UpdateRolePermissionsRequest;
import vn.nhaxinh.admin.RbacDtos.UpdateRoleRequest;
import vn.nhaxinh.admin.RbacDtos.UserRbacResponse;
import vn.nhaxinh.controller.BaseController;
import vn.nhaxinh.user.Role;

/**
 * CRUD vai trò (Role) và gán quyền hạn cho vai trò.
 *
 * <pre>
 * GET    /api/v1/admin/roles                    Danh sách vai trò (kèm số user, quyền)
 * GET    /api/v1/admin/roles/{id}               Chi tiết vai trò
 * GET    /api/v1/admin/roles/{id}/users         Người dùng đang có vai trò
 * POST   /api/v1/admin/roles                    Tạo vai trò
 * PUT    /api/v1/admin/roles/{id}               Cập nhật tên/mô tả
 * PUT    /api/v1/admin/roles/{id}/permissions   Thay thế toàn bộ quyền của vai trò
 * DELETE /api/v1/admin/roles/{id}               Xóa vai trò (không phải system, không còn user)
 * </pre>
 */
@RestController
@RequestMapping(BaseController.API_V1 + "/admin/roles")
@PreAuthorize("hasRole('ADMIN')")
public class AdminRoleController extends BaseController {

    private final RbacService rbacService;
    private final RbacAuditRecorder audit;

    public AdminRoleController(RbacService rbacService, RbacAuditRecorder audit) {
        this.rbacService = rbacService;
        this.audit = audit;
    }

    @GetMapping
    public ResponseEntity<List<RoleResponse>> list() {
        Map<Long, Long> counts = rbacService.countUsersPerRole();
        List<RoleResponse> response = rbacService.findAllRoles().stream()
                .map(r -> RoleResponse.of(r, counts.getOrDefault(r.getId(), 0L)))
                .toList();
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}")
    public ResponseEntity<RoleResponse> get(@PathVariable Long id) {
        Role role = rbacService.getRole(id);
        return ResponseEntity.ok(RoleResponse.of(role, rbacService.countUsersOfRole(id)));
    }

    @GetMapping("/{id}/users")
    public ResponseEntity<List<UserRbacResponse>> users(@PathVariable Long id) {
        return ResponseEntity.ok(rbacService.findUsersOfRole(id).stream().map(UserRbacResponse::of).toList());
    }

    @PostMapping
    public ResponseEntity<RoleResponse> create(
            @Valid @RequestBody CreateRoleRequest request,
            @AuthenticationPrincipal UserDetails principal,
            HttpServletRequest httpRequest
    ) {
        Role role = rbacService.createRole(request.code(), request.name(), request.description(), request.permissions());

        audit.record(principal, httpRequest, "ROLE_CREATE", ENTITY_ROLE, role.getId(), details(
                "code", role.getCode(),
                "name", role.getName(),
                "description", role.getDescription(),
                "permissions", RbacService.permissionCodesOf(role)
        ));

        return ResponseEntity
                .created(URI.create(API_V1 + "/admin/roles/" + role.getId()))
                .body(RoleResponse.of(role, 0));
    }

    @PutMapping("/{id}")
    public ResponseEntity<RoleResponse> update(
            @PathVariable Long id,
            @Valid @RequestBody UpdateRoleRequest request,
            @AuthenticationPrincipal UserDetails principal,
            HttpServletRequest httpRequest
    ) {
        RbacService.RoleChange change = rbacService.updateRole(id, request.name(), request.description());

        audit.record(principal, httpRequest, "ROLE_UPDATE", ENTITY_ROLE, id, details(
                "code", change.role().getCode(),
                "before", change.before(),
                "after", change.after()
        ));

        return ResponseEntity.ok(RoleResponse.of(change.role(), rbacService.countUsersOfRole(id)));
    }

    @PutMapping("/{id}/permissions")
    public ResponseEntity<RoleResponse> updatePermissions(
            @PathVariable Long id,
            @Valid @RequestBody UpdateRolePermissionsRequest request,
            @AuthenticationPrincipal UserDetails principal,
            HttpServletRequest httpRequest
    ) {
        RbacService.PermissionSetChange change = rbacService.replaceRolePermissions(id, request.permissions());

        audit.record(principal, httpRequest, "ROLE_PERMISSIONS_UPDATE", ENTITY_ROLE, id, details(
                "code", change.role().getCode(),
                "before", change.before(),
                "after", change.after(),
                "added", change.added(),
                "removed", change.removed()
        ));

        return ResponseEntity.ok(RoleResponse.of(change.role(), rbacService.countUsersOfRole(id)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, Object>> delete(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails principal,
            HttpServletRequest httpRequest
    ) {
        RbacService.RoleDeletion deleted = rbacService.deleteRole(id);

        audit.record(principal, httpRequest, "ROLE_DELETE", ENTITY_ROLE, id, details(
                "code", deleted.code(),
                "name", deleted.name(),
                "permissions", deleted.permissions()
        ));

        return ResponseEntity.ok(Map.of(
                "message", "Đã xóa vai trò thành công",
                "id", id,
                "code", deleted.code()
        ));
    }
}
