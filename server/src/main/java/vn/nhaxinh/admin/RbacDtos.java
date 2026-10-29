package vn.nhaxinh.admin;

import com.fasterxml.jackson.databind.JsonNode;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.time.LocalDateTime;
import java.util.Set;
import vn.nhaxinh.user.Permission;
import vn.nhaxinh.user.Role;
import vn.nhaxinh.user.User;

/**
 * DTO request/response cho API phân quyền (RBAC).
 */
public final class RbacDtos {

    private RbacDtos() {
    }

    // ============================================================ ROLE

    public record RoleResponse(
            Long id,
            String code,
            String name,
            String description,
            Boolean isSystem,
            LocalDateTime createdAt,
            long userCount,
            Set<String> permissions
    ) {
        public static RoleResponse of(Role r, long userCount) {
            return new RoleResponse(r.getId(), r.getCode(), r.getName(), r.getDescription(),
                    r.getIsSystem(), r.getCreatedAt(), userCount, RbacService.permissionCodesOf(r));
        }
    }

    public record CreateRoleRequest(
            @NotBlank(message = "Mã vai trò không được để trống")
            @Size(min = 2, max = 60, message = "Mã vai trò dài 2-60 ký tự")
            @Pattern(regexp = "^[A-Za-z][A-Za-z0-9_]*$",
                    message = "Mã vai trò chỉ gồm chữ, số, dấu gạch dưới và bắt đầu bằng chữ cái")
            String code,

            @NotBlank(message = "Tên vai trò không được để trống")
            @Size(max = 120, message = "Tên vai trò tối đa 120 ký tự")
            String name,

            @Size(max = 500, message = "Mô tả tối đa 500 ký tự")
            String description,

            Set<String> permissions
    ) {}

    public record UpdateRoleRequest(
            @NotBlank(message = "Tên vai trò không được để trống")
            @Size(max = 120, message = "Tên vai trò tối đa 120 ký tự")
            String name,

            @Size(max = 500, message = "Mô tả tối đa 500 ký tự")
            String description
    ) {}

    public record UpdateRolePermissionsRequest(
            @NotNull(message = "Danh sách quyền không được null (có thể là mảng rỗng)")
            Set<String> permissions
    ) {}

    // ============================================================ PERMISSION

    public record PermissionResponse(
            Long id,
            String code,
            String name,
            String module,
            String description
    ) {
        public static PermissionResponse of(Permission p) {
            return new PermissionResponse(p.getId(), p.getCode(), p.getName(), p.getModule(), p.getDescription());
        }
    }

    public record PermissionDetailResponse(
            Long id,
            String code,
            String name,
            String module,
            String description,
            java.util.List<String> roles
    ) {
        public static PermissionDetailResponse of(Permission p, java.util.List<String> roles) {
            return new PermissionDetailResponse(p.getId(), p.getCode(), p.getName(), p.getModule(),
                    p.getDescription(), roles);
        }
    }

    public record CreatePermissionRequest(
            @NotBlank(message = "Mã quyền hạn không được để trống")
            @Size(max = 120, message = "Mã quyền hạn tối đa 120 ký tự")
            @Pattern(regexp = "^[A-Za-z][A-Za-z0-9_-]*:[A-Za-z][A-Za-z0-9_-]*$",
                    message = "Mã quyền hạn phải có dạng 'module:action', ví dụ 'catalog:read'")
            String code,

            @NotBlank(message = "Tên quyền hạn không được để trống")
            @Size(max = 160, message = "Tên quyền hạn tối đa 160 ký tự")
            String name,

            /** Tùy chọn — mặc định lấy phần trước dấu ':' của code. */
            @Size(max = 80, message = "Module tối đa 80 ký tự")
            String module,

            @Size(max = 500, message = "Mô tả tối đa 500 ký tự")
            String description
    ) {}

    public record UpdatePermissionRequest(
            @NotBlank(message = "Tên quyền hạn không được để trống")
            @Size(max = 160, message = "Tên quyền hạn tối đa 160 ký tự")
            String name,

            @NotBlank(message = "Module không được để trống")
            @Size(max = 80, message = "Module tối đa 80 ký tự")
            String module,

            @Size(max = 500, message = "Mô tả tối đa 500 ký tự")
            String description
    ) {}

    // ============================================================ USER

    public record UserRbacResponse(
            Long id,
            String username,
            String fullName,
            String email,
            String phone,
            String status,
            String accountType,
            Set<String> roles
    ) {
        public static UserRbacResponse of(User u) {
            return new UserRbacResponse(u.getId(), u.getUsername(), u.getFullName(), u.getEmail(),
                    u.getPhone(), u.getStatus(), u.getAccountType(), RbacService.roleCodesOf(u));
        }
    }

    public record UserRbacDetailResponse(
            Long id,
            String username,
            String fullName,
            String email,
            String phone,
            String status,
            String accountType,
            Set<String> roles,
            Set<String> permissions
    ) {
        public static UserRbacDetailResponse of(User u) {
            return new UserRbacDetailResponse(u.getId(), u.getUsername(), u.getFullName(), u.getEmail(),
                    u.getPhone(), u.getStatus(), u.getAccountType(),
                    RbacService.roleCodesOf(u), RbacService.effectivePermissionsOf(u));
        }
    }

    public record AssignRolesRequest(
            @NotEmpty(message = "Danh sách vai trò không được để trống")
            Set<String> roles
    ) {}

    public record CreateStaffRequest(
            @NotBlank(message = "Tên đăng nhập không được để trống")
            @Size(min = 3, max = 50, message = "Tên đăng nhập dài 3-50 ký tự")
            String username,

            @Size(min = 6, max = 100, message = "Mật khẩu tối thiểu 6 ký tự")
            String password,

            @NotBlank(message = "Họ và tên không được để trống")
            @Size(max = 180, message = "Họ và tên tối đa 180 ký tự")
            String fullName,

            @NotBlank(message = "Email không được để trống")
            @Size(max = 254, message = "Email tối đa 254 ký tự")
            String email,

            @Size(max = 30, message = "Số điện thoại tối đa 30 ký tự")
            String phone,

            @NotEmpty(message = "Phải phân bổ ít nhất 1 vai trò")
            Set<String> roles
    ) {}

    public record UpdateUserStatusRequest(
            @NotBlank(message = "Trạng thái không được để trống")
            @Pattern(regexp = "ACTIVE|LOCKED|INACTIVE", message = "Trạng thái phải là ACTIVE, LOCKED hoặc INACTIVE")
            String status,

            @Size(max = 500, message = "Ghi chú tối đa 500 ký tự")
            String note
    ) {}

    // ============================================================ AUDIT LOG

    public record AuditLogResponse(
            Long id,
            String action,
            String entityType,
            String entityId,
            Long userId,
            String username,
            JsonNode details,
            String ipAddress,
            LocalDateTime createdAt
    ) {}
}
