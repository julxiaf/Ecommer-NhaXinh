package vn.nhaxinh.admin;

import java.util.Collection;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.TreeSet;
import java.util.regex.Pattern;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Sort;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.nhaxinh.security.ApiErrorCode;
import vn.nhaxinh.security.ApiException;
import vn.nhaxinh.user.Permission;
import vn.nhaxinh.user.PermissionRepository;
import vn.nhaxinh.user.Role;
import vn.nhaxinh.user.RoleRepository;
import vn.nhaxinh.user.User;
import vn.nhaxinh.user.UserRepository;

/**
 * Nghiệp vụ phân quyền (RBAC): CRUD vai trò, quyền hạn và gán vai trò cho người dùng.
 *
 * Service chỉ ghi application log (SLF4J). Audit log vào CSDL được ghi ở tầng controller
 * SAU KHI transaction commit thành công, để lỗi ghi audit không làm rollback thao tác chính.
 */
@Service
@Transactional
public class RbacService {

    private static final Logger log = LoggerFactory.getLogger(RbacService.class);

    public static final String ADMIN_ROLE = "ADMIN";
    private static final Pattern ROLE_CODE_PATTERN = Pattern.compile("^[A-Z][A-Z0-9_]{1,59}$");
    private static final Pattern PERMISSION_CODE_PATTERN =
            Pattern.compile("^[a-z][a-z0-9_-]*:[a-z][a-z0-9_-]*$");

    private final RoleRepository roleRepository;
    private final PermissionRepository permissionRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public RbacService(RoleRepository roleRepository,
                       PermissionRepository permissionRepository,
                       UserRepository userRepository,
                       PasswordEncoder passwordEncoder) {
        this.roleRepository = roleRepository;
        this.permissionRepository = permissionRepository;
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    // =====================================================================
    // Kết quả thay đổi (dùng để controller ghi audit trước/sau)
    // =====================================================================

    public record RoleChange(Role role, Map<String, Object> before, Map<String, Object> after) {}

    public record PermissionSetChange(Role role, Set<String> before, Set<String> after) {
        public Set<String> added() {
            Set<String> s = new TreeSet<>(after);
            s.removeAll(before);
            return s;
        }

        public Set<String> removed() {
            Set<String> s = new TreeSet<>(before);
            s.removeAll(after);
            return s;
        }
    }

    public record PermissionChange(Permission permission, Map<String, Object> before, Map<String, Object> after) {}

    public record PermissionDeletion(Permission permission, List<String> detachedFromRoles) {}

    public record RoleDeletion(Long id, String code, String name, Set<String> permissions) {}

    public record RoleAssignment(User user, Set<String> before, Set<String> after) {}

    public record UserStatusChange(User user, String oldStatus, String newStatus, String note) {}

    // =====================================================================
    // ROLES
    // =====================================================================

    @Transactional(readOnly = true)
    public List<Role> findAllRoles() {
        return roleRepository.findAll(Sort.by("id"));
    }

    @Transactional(readOnly = true)
    public Map<Long, Long> countUsersPerRole() {
        Map<Long, Long> result = new HashMap<>();
        for (Object[] row : roleRepository.countUsersGroupByRole()) {
            result.put((Long) row[0], ((Number) row[1]).longValue());
        }
        return result;
    }

    @Transactional(readOnly = true)
    public long countUsersOfRole(Long roleId) {
        return roleRepository.countUsersByRoleId(roleId);
    }

    @Transactional(readOnly = true)
    public Role getRole(Long id) {
        return roleRepository.findById(id)
                .orElseThrow(() -> new ApiException(ApiErrorCode.RBAC_ROLE_NOT_FOUND, "roleId=" + id));
    }

    @Transactional(readOnly = true)
    public List<User> findUsersOfRole(Long roleId) {
        Role role = getRole(roleId);
        return userRepository.findByRoleCode(role.getCode());
    }

    public Role createRole(String code, String name, String description, Set<String> permissionCodes) {
        String normalizedCode = normalizeRoleCode(code);
        if (roleRepository.existsByCode(normalizedCode)) {
            log.warn("[RBAC] Tạo vai trò thất bại: mã '{}' đã tồn tại", normalizedCode);
            throw ApiException.withField(ApiErrorCode.RBAC_ROLE_CODE_EXISTS, "code", "Mã vai trò đã tồn tại");
        }

        Role role = new Role(normalizedCode, name.trim(), trimToNull(description), false);
        role.setPermissions(resolvePermissions(permissionCodes));
        Role saved = roleRepository.save(role);

        log.info("[RBAC] Đã tạo vai trò id={} code='{}' với {} quyền: {}",
                saved.getId(), saved.getCode(), saved.getPermissions().size(), permissionCodesOf(saved));
        return saved;
    }

    public RoleChange updateRole(Long id, String name, String description) {
        Role role = getRole(id);
        Map<String, Object> before = roleSnapshot(role);

        role.setName(name.trim());
        role.setDescription(trimToNull(description));
        Role saved = roleRepository.save(role);

        Map<String, Object> after = roleSnapshot(saved);
        log.info("[RBAC] Đã cập nhật vai trò id={} code='{}': {} -> {}", id, saved.getCode(), before, after);
        return new RoleChange(saved, before, after);
    }

    public PermissionSetChange replaceRolePermissions(Long id, Set<String> permissionCodes) {
        Role role = getRole(id);
        Set<String> before = permissionCodesOf(role);

        role.setPermissions(resolvePermissions(permissionCodes));
        Role saved = roleRepository.save(role);

        PermissionSetChange change = new PermissionSetChange(saved, before, permissionCodesOf(saved));
        log.info("[RBAC] Đã cập nhật quyền của vai trò '{}' (id={}): thêm={} | gỡ={}",
                saved.getCode(), id, change.added(), change.removed());
        return change;
    }

    public RoleDeletion deleteRole(Long id) {
        Role role = getRole(id);

        if (Boolean.TRUE.equals(role.getIsSystem())) {
            log.warn("[RBAC] Từ chối xóa vai trò hệ thống '{}' (id={})", role.getCode(), id);
            throw new ApiException(ApiErrorCode.RBAC_SYSTEM_ROLE_PROTECTED, "roleCode=" + role.getCode());
        }

        long userCount = roleRepository.countUsersByRoleId(id);
        if (userCount > 0) {
            log.warn("[RBAC] Từ chối xóa vai trò '{}' (id={}): đang gán cho {} người dùng",
                    role.getCode(), id, userCount);
            throw new ApiException(ApiErrorCode.RBAC_ROLE_IN_USE,
                    "roleCode=" + role.getCode() + ", users=" + userCount);
        }

        // Chụp lại dữ liệu trước khi xóa (phục vụ ghi audit)
        RoleDeletion snapshot = new RoleDeletion(id, role.getCode(), role.getName(), permissionCodesOf(role));
        roleRepository.delete(role);

        log.info("[RBAC] Đã xóa vai trò id={} code='{}' (quyền: {})", id, snapshot.code(), snapshot.permissions());
        return snapshot;
    }

    // =====================================================================
    // PERMISSIONS
    // =====================================================================

    @Transactional(readOnly = true)
    public List<Permission> findPermissions(String module) {
        if (module == null || module.isBlank()) {
            return permissionRepository.findAllByOrderByModuleAscCodeAsc();
        }
        return permissionRepository.findByModuleOrderByCodeAsc(module.trim().toLowerCase());
    }

    @Transactional(readOnly = true)
    public List<String> findPermissionModules() {
        return permissionRepository.findDistinctModules();
    }

    @Transactional(readOnly = true)
    public Permission getPermission(Long id) {
        return permissionRepository.findById(id)
                .orElseThrow(() -> new ApiException(ApiErrorCode.RBAC_PERMISSION_NOT_FOUND, "permissionId=" + id));
    }

    @Transactional(readOnly = true)
    public List<String> findRoleCodesUsingPermission(Long permissionId) {
        return roleRepository.findByPermissionId(permissionId).stream()
                .map(Role::getCode)
                .sorted()
                .toList();
    }

    public Permission createPermission(String code, String name, String module, String description) {
        String normalizedCode = normalizePermissionCode(code);
        if (permissionRepository.existsByCode(normalizedCode)) {
            log.warn("[RBAC] Tạo quyền thất bại: mã '{}' đã tồn tại", normalizedCode);
            throw ApiException.withField(ApiErrorCode.RBAC_PERMISSION_CODE_EXISTS, "code", "Mã quyền hạn đã tồn tại");
        }

        String resolvedModule = (module == null || module.isBlank())
                ? normalizedCode.substring(0, normalizedCode.indexOf(':'))
                : module.trim().toLowerCase();

        Permission saved = permissionRepository.save(
                new Permission(normalizedCode, name.trim(), resolvedModule, trimToNull(description)));

        log.info("[RBAC] Đã tạo quyền id={} code='{}' module='{}'", saved.getId(), saved.getCode(), saved.getModule());
        return saved;
    }

    public PermissionChange updatePermission(Long id, String name, String module, String description) {
        Permission permission = getPermission(id);
        Map<String, Object> before = permissionSnapshot(permission);

        permission.setName(name.trim());
        permission.setModule(module.trim().toLowerCase());
        permission.setDescription(trimToNull(description));
        Permission saved = permissionRepository.save(permission);

        Map<String, Object> after = permissionSnapshot(saved);
        log.info("[RBAC] Đã cập nhật quyền id={} code='{}': {} -> {}", id, saved.getCode(), before, after);
        return new PermissionChange(saved, before, after);
    }

    public PermissionDeletion deletePermission(Long id, boolean force) {
        Permission permission = getPermission(id);
        List<Role> roles = roleRepository.findByPermissionId(id);
        List<String> roleCodes = roles.stream().map(Role::getCode).sorted().toList();

        if (!roles.isEmpty() && !force) {
            log.warn("[RBAC] Từ chối xóa quyền '{}' (id={}): đang được dùng bởi vai trò {}",
                    permission.getCode(), id, roleCodes);
            throw new ApiException(ApiErrorCode.RBAC_PERMISSION_IN_USE,
                    "permission=" + permission.getCode() + ", roles=" + roleCodes);
        }

        for (Role role : roles) {
            role.getPermissions().removeIf(p -> Objects.equals(p.getId(), id));
            roleRepository.save(role);
        }
        permissionRepository.delete(permission);

        log.info("[RBAC] Đã xóa quyền id={} code='{}' (force={}, gỡ khỏi vai trò: {})",
                id, permission.getCode(), force, roleCodes);
        return new PermissionDeletion(permission, roleCodes);
    }

    // =====================================================================
    // USERS
    // =====================================================================

    @Transactional(readOnly = true)
    public List<User> findUsers(String roleCode) {
        if (roleCode == null || roleCode.isBlank()) {
            return userRepository.findAll(Sort.by("id"));
        }
        return userRepository.findByRoleCode(roleCode.trim().toUpperCase());
    }

    @Transactional(readOnly = true)
    public User getUser(Long id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new ApiException(ApiErrorCode.RBAC_USER_NOT_FOUND, "userId=" + id));
    }

    public RoleAssignment assignRoles(Long userId, Set<String> roleCodes, String actorUsername) {
        User user = getUser(userId);
        Set<String> before = roleCodesOf(user);

        Set<Role> newRoles = resolveRoles(roleCodes);
        Set<String> after = newRoles.stream().map(Role::getCode).collect(Collectors.toCollection(TreeSet::new));

        boolean removingAdmin = before.contains(ADMIN_ROLE) && !after.contains(ADMIN_ROLE);
        if (removingAdmin) {
            if (actorUsername != null && actorUsername.equalsIgnoreCase(user.getUsername())) {
                log.warn("[RBAC] Admin '{}' cố gắng tự gỡ vai trò ADMIN của chính mình — bị từ chối", actorUsername);
                throw new ApiException(ApiErrorCode.RBAC_SELF_LOCKOUT, "actor=" + actorUsername);
            }
            long activeAdmins = userRepository.findByRoleCode(ADMIN_ROLE).stream()
                    .filter(u -> "ACTIVE".equalsIgnoreCase(u.getStatus()))
                    .count();
            boolean targetIsActiveAdmin = "ACTIVE".equalsIgnoreCase(user.getStatus());
            if (targetIsActiveAdmin && activeAdmins <= 1) {
                log.warn("[RBAC] Từ chối gỡ ADMIN khỏi user='{}': đây là quản trị viên hoạt động cuối cùng",
                        user.getUsername());
                throw new ApiException(ApiErrorCode.RBAC_LAST_ADMIN, "user=" + user.getUsername());
            }
        }

        user.setRoles(newRoles);
        User saved = userRepository.save(user);
        log.info("[RBAC] Đã cập nhật vai trò user='{}' (id={}): {} -> {} | bởi={}",
                saved.getUsername(), userId, before, after, actorUsername);
        return new RoleAssignment(saved, before, after);
    }

    public User createStaffUser(String username, String rawPassword, String fullName, String email, String phone, Set<String> roleCodes, String actorUsername) {
        String cleanUsername = username.trim();
        String cleanEmail = email.trim();
        String cleanPhone = (phone != null && !phone.isBlank()) ? phone.trim() : null;

        if (userRepository.findByUsername(cleanUsername).isPresent()) {
            throw new ApiException(ApiErrorCode.RESOURCE_CONFLICT, "Tên đăng nhập đã tồn tại: " + cleanUsername);
        }
        if (userRepository.findByEmail(cleanEmail).isPresent()) {
            throw new ApiException(ApiErrorCode.RESOURCE_CONFLICT, "Email đã tồn tại: " + cleanEmail);
        }
        if (cleanPhone != null && userRepository.findByPhone(cleanPhone).isPresent()) {
            throw new ApiException(ApiErrorCode.RESOURCE_CONFLICT, "Số điện thoại đã tồn tại: " + cleanPhone);
        }

        Set<Role> roles = resolveRoles(roleCodes);
        boolean hasInternalRole = roles.stream().anyMatch(r -> !"CUSTOMER".equalsIgnoreCase(r.getCode()));
        if (!hasInternalRole) {
            throw new ApiException(ApiErrorCode.VALIDATION_FAILED, "Tài khoản nhân sự nội bộ phải có ít nhất một vai trò quản trị/vận hành, không thể chỉ là CUSTOMER");
        }

        String password = (rawPassword != null && !rawPassword.isBlank()) ? rawPassword : "Nhaxinh@2026";
        User user = new User();
        user.setUsername(cleanUsername);
        user.setPasswordHash(passwordEncoder.encode(password));
        user.setFullName(fullName.trim());
        user.setEmail(cleanEmail);
        user.setPhone(cleanPhone);
        user.setStatus("ACTIVE");
        user.setAccountType("INTERNAL");
        user.setRoles(roles);

        User saved = userRepository.save(user);
        log.info("[RBAC] Đã tạo tài khoản nhân sự nội bộ user='{}' (id={}), roles={} | bởi={}",
                saved.getUsername(), saved.getId(), roleCodesOf(saved), actorUsername);
        return saved;
    }

    public UserStatusChange updateUserStatus(Long userId, String newStatus, String note, String actorUsername) {
        User user = getUser(userId);
        String oldStatus = user.getStatus();
        String normalizedStatus = newStatus.trim().toUpperCase();

        if (oldStatus.equalsIgnoreCase(normalizedStatus)) {
            return new UserStatusChange(user, oldStatus, normalizedStatus, note);
        }

        boolean lockingAdmin = user.getRoles().stream().anyMatch(r -> ADMIN_ROLE.equalsIgnoreCase(r.getCode()))
                && !"ACTIVE".equalsIgnoreCase(normalizedStatus);
        if (lockingAdmin) {
            if (actorUsername != null && actorUsername.equalsIgnoreCase(user.getUsername())) {
                log.warn("[RBAC] Admin '{}' cố gắng tự khóa tài khoản của chính mình — bị từ chối", actorUsername);
                throw new ApiException(ApiErrorCode.RBAC_SELF_LOCKOUT, "actor=" + actorUsername);
            }
            long activeAdmins = userRepository.findByRoleCode(ADMIN_ROLE).stream()
                    .filter(u -> "ACTIVE".equalsIgnoreCase(u.getStatus()))
                    .count();
            if (activeAdmins <= 1) {
                log.warn("[RBAC] Từ chối khóa admin='{}': đây là quản trị viên đang hoạt động duy nhất", user.getUsername());
                throw new ApiException(ApiErrorCode.RBAC_LAST_ADMIN, "user=" + user.getUsername());
            }
        }

        user.setStatus(normalizedStatus);
        User saved = userRepository.save(user);
        log.info("[RBAC] Đã đổi trạng thái user='{}' (id={}): {} -> {} | bởi={}, ghi chú='{}'",
                saved.getUsername(), userId, oldStatus, normalizedStatus, actorUsername, note);
        return new UserStatusChange(saved, oldStatus, normalizedStatus, note);
    }

    // =====================================================================
    // Helpers
    // =====================================================================

    public static Set<String> permissionCodesOf(Role role) {
        if (role == null || role.getPermissions() == null) {
            return new TreeSet<>();
        }
        return role.getPermissions().stream()
                .map(Permission::getCode)
                .filter(Objects::nonNull)
                .collect(Collectors.toCollection(TreeSet::new));
    }

    public static Set<String> roleCodesOf(User user) {
        if (user == null || user.getRoles() == null) {
            return new TreeSet<>();
        }
        return user.getRoles().stream()
                .map(Role::getCode)
                .filter(Objects::nonNull)
                .collect(Collectors.toCollection(TreeSet::new));
    }

    /** Tập quyền hiệu lực của user = hợp các quyền của tất cả vai trò. */
    public static Set<String> effectivePermissionsOf(User user) {
        if (user == null || user.getRoles() == null) {
            return new TreeSet<>();
        }
        return user.getRoles().stream()
                .flatMap(r -> permissionCodesOf(r).stream())
                .collect(Collectors.toCollection(TreeSet::new));
    }

    private Set<Permission> resolvePermissions(Collection<String> codes) {
        Set<String> cleaned = cleanCodes(codes, false);
        if (cleaned.isEmpty()) {
            return new HashSet<>();
        }
        List<Permission> found = permissionRepository.findByCodeIn(cleaned);
        if (found.size() != cleaned.size()) {
            Set<String> foundCodes = found.stream().map(Permission::getCode).collect(Collectors.toSet());
            Set<String> missing = new TreeSet<>(cleaned);
            missing.removeAll(foundCodes);
            throw ApiException.withField(ApiErrorCode.RBAC_PERMISSION_NOT_FOUND,
                    "permissions", "Quyền hạn không tồn tại: " + String.join(", ", missing));
        }
        return new HashSet<>(found);
    }

    private Set<Role> resolveRoles(Collection<String> codes) {
        Set<String> cleaned = cleanCodes(codes, true);
        Set<Role> roles = new HashSet<>();
        Set<String> missing = new TreeSet<>();
        for (String code : cleaned) {
            roleRepository.findByCode(code).ifPresentOrElse(roles::add, () -> missing.add(code));
        }
        if (!missing.isEmpty()) {
            throw ApiException.withField(ApiErrorCode.RBAC_ROLE_NOT_FOUND,
                    "roles", "Vai trò không tồn tại: " + String.join(", ", missing));
        }
        return roles;
    }

    private static Set<String> cleanCodes(Collection<String> codes, boolean upper) {
        if (codes == null) {
            return new LinkedHashSet<>();
        }
        return codes.stream()
                .filter(Objects::nonNull)
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .map(s -> upper ? s.toUpperCase() : s.toLowerCase())
                .collect(Collectors.toCollection(LinkedHashSet::new));
    }

    private static String normalizeRoleCode(String code) {
        String normalized = code == null ? "" : code.trim().toUpperCase();
        if (!ROLE_CODE_PATTERN.matcher(normalized).matches()) {
            throw ApiException.withField(ApiErrorCode.VALIDATION_FAILED, "code",
                    "Mã vai trò chỉ gồm chữ in hoa, số, dấu gạch dưới và bắt đầu bằng chữ cái (2-60 ký tự)");
        }
        return normalized;
    }

    private static String normalizePermissionCode(String code) {
        String normalized = code == null ? "" : code.trim().toLowerCase();
        if (normalized.length() > 120 || !PERMISSION_CODE_PATTERN.matcher(normalized).matches()) {
            throw ApiException.withField(ApiErrorCode.VALIDATION_FAILED, "code",
                    "Mã quyền hạn phải có dạng 'module:action', ví dụ 'catalog:read'");
        }
        return normalized;
    }

    private static String trimToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private static Map<String, Object> roleSnapshot(Role role) {
        Map<String, Object> m = new java.util.LinkedHashMap<>();
        m.put("name", role.getName());
        m.put("description", role.getDescription());
        return m;
    }

    private static Map<String, Object> permissionSnapshot(Permission p) {
        Map<String, Object> m = new java.util.LinkedHashMap<>();
        m.put("name", p.getName());
        m.put("module", p.getModule());
        m.put("description", p.getDescription());
        return m;
    }
}
