package vn.nhaxinh.security;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import vn.nhaxinh.audit.AuditLogService;
import vn.nhaxinh.notification.NotificationService;
import vn.nhaxinh.user.User;
import vn.nhaxinh.user.UserService;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    private static final Logger log = LoggerFactory.getLogger(AuthController.class);

    private final AuthenticationManager authenticationManager;
    private final SecurityContextRepository securityContextRepository;
    private final UserService userService;
    private final AuditLogService auditLogService;
    private final NotificationService notificationService;

    // Cache mã OTP tạm thời cho luồng Quên mật khẩu: email -> {token, expireTime}
    private static final java.util.concurrent.ConcurrentHashMap<String, ResetTokenInfo> resetTokens = new java.util.concurrent.ConcurrentHashMap<>();

    private record ResetTokenInfo(String token, java.time.LocalDateTime expiresAt) {}

    public AuthController(
            AuthenticationManager authenticationManager,
            SecurityContextRepository securityContextRepository,
            UserService userService,
            AuditLogService auditLogService,
            @org.springframework.beans.factory.annotation.Autowired(required = false) NotificationService notificationService) {
        this.authenticationManager = authenticationManager;
        this.securityContextRepository = securityContextRepository;
        this.userService = userService;
        this.auditLogService = auditLogService;
        this.notificationService = notificationService;
    }

    // ========================================================================
    // CSRF token (SPA cần gọi trước khi POST)
    // ========================================================================

    @GetMapping("/csrf")
    public Map<String, String> csrf(CsrfToken token) {
        return Map.of("token", token != null ? token.getToken() : "");
    }

    // ========================================================================
    // Thông tin session hiện tại (kèm thông tin cá nhân, roles và permissions)
    // ========================================================================

    @Transactional(readOnly = true)
    @GetMapping("/me")
    public SessionResponse session(@AuthenticationPrincipal UserDetails userDetails) {
        if (userDetails == null) {
            return SessionResponse.unauthenticated();
        }

        User user = userService.findByUsername(userDetails.getUsername()).orElse(null);

        Set<String> roles = new java.util.HashSet<>();
        Set<String> permissions = new java.util.HashSet<>();

        if (user != null && user.getRoles() != null) {
            for (vn.nhaxinh.user.Role r : user.getRoles()) {
                if (r.getCode() != null) {
                    roles.add(r.getCode());
                }
                try {
                    if (r.getPermissions() != null) {
                        for (vn.nhaxinh.user.Permission p : r.getPermissions()) {
                            if (p.getCode() != null) {
                                permissions.add(p.getCode());
                            }
                        }
                    }
                } catch (Exception ex) {
                    log.warn("[AUTH] Không thể tải permissions cho role {}: {}", r.getCode(), ex.getMessage());
                }
            }
        }

        if (roles.isEmpty()) {
            roles = userDetails.getAuthorities().stream()
                    .map(GrantedAuthority::getAuthority)
                    .filter(auth -> auth.startsWith("ROLE_"))
                    .map(auth -> auth.substring(5))
                    .collect(Collectors.toSet());
        }
        if (permissions.isEmpty()) {
            permissions = userDetails.getAuthorities().stream()
                    .map(GrantedAuthority::getAuthority)
                    .filter(auth -> !auth.startsWith("ROLE_"))
                    .collect(Collectors.toSet());
        }

        return new SessionResponse(
                true,
                user != null ? user.getId() : null,
                userDetails.getUsername(),
                user != null ? user.getFullName() : null,
                user != null ? user.getEmail() : null,
                user != null ? user.getPhone() : null,
                user != null ? user.getAccountType() : null,
                user != null ? user.getStatus() : null,
                roles,
                permissions
        );
    }

    // ========================================================================
    // Đăng nhập
    // ========================================================================

    @PostMapping("/login")
    public ResponseEntity<?> login(
            @Valid @RequestBody LoginRequest credentials,
            HttpServletRequest request,
            HttpServletResponse response) {
        String username = credentials.username().trim();
        String clientIp = resolveClientIp(request);

        try {
            Authentication authentication = authenticationManager.authenticate(
                    UsernamePasswordAuthenticationToken.unauthenticated(
                            username,
                            credentials.password()));

            request.getSession(true);
            request.changeSessionId();
            SecurityContext context = SecurityContextHolder.createEmptyContext();
            context.setAuthentication(authentication);
            SecurityContextHolder.setContext(context);
            securityContextRepository.saveContext(context, request, response);

            // Tìm user để ghi nhật ký audit log và trả thông tin đầy đủ
            User dbUser = userService.findByUsername(authentication.getName()).orElse(null);
            log.info("[AUTH] Đăng nhập thành công | user={} | ip={}", username, clientIp);
            auditLogService.record(dbUser, "LOGIN_SUCCESS", "AUTH",
                    dbUser != null ? dbUser.getId().toString() : "N/A",
                    "{\"message\":\"Đăng nhập thành công\"}", clientIp);

            Set<String> roles = authentication.getAuthorities().stream()
                    .map(GrantedAuthority::getAuthority)
                    .filter(auth -> auth.startsWith("ROLE_"))
                    .map(auth -> auth.substring(5))
                    .collect(Collectors.toSet());

            Set<String> permissions = authentication.getAuthorities().stream()
                    .map(GrantedAuthority::getAuthority)
                    .filter(auth -> !auth.startsWith("ROLE_"))
                    .collect(Collectors.toSet());
            return ResponseEntity.ok(new SessionResponse(
                    true,
                    dbUser != null ? dbUser.getId() : null,
                    authentication.getName(),
                    dbUser != null ? dbUser.getFullName() : null,
                    dbUser != null ? dbUser.getEmail() : null,
                    dbUser != null ? dbUser.getPhone() : null,
                    dbUser != null ? dbUser.getAccountType() : null,
                    dbUser != null ? dbUser.getStatus() : null,
                    roles,
                    permissions
            ));

        } catch (AuthenticationException exception) {
            SecurityContextHolder.clearContext();
            log.warn("[AUTH] Đăng nhập thất bại | user={} | ip={} | lý do={}",
                    username, clientIp, exception.getClass().getSimpleName());
            String failReason = exception.getClass().getSimpleName();
            auditLogService.record(null, "LOGIN_FAILED", "AUTH", username,
                    "{\"message\":\"Đăng nhập thất bại\",\"reason\":\"" + failReason + "\"}", clientIp);

            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", "Tên đăng nhập hoặc mật khẩu không đúng."));
        }
    }

    // ========================================================================
    // Đăng ký tài khoản khách hàng
    // ========================================================================

    @Transactional
    @PostMapping("/register")
    public ResponseEntity<?> register(
            @Valid @RequestBody RegisterRequest request,
            HttpServletRequest httpRequest) {
        String clientIp = resolveClientIp(httpRequest);

        try {
            User created = userService.registerUser(
                    request.username() != null ? request.username().trim() : null,
                    request.password(),
                    request.email() != null ? request.email().trim().toLowerCase() : null,
                    request.phone() != null ? request.phone().trim() : null,
                    request.fullName() != null ? request.fullName().trim() : null,
                    Boolean.TRUE.equals(request.marketingConsent()));

            log.info("[AUTH] Đăng ký thành công | user={} | ip={}", created.getUsername(), clientIp);
            auditLogService.record(created, "REGISTER_SUCCESS", "USER",
                    created.getId().toString(),
                    "{\"message\":\"Đăng ký tài khoản thành viên\",\"username\":\"" + created.getUsername() + "\"}",
                    clientIp);

            Set<String> roles = new java.util.HashSet<>();
            Set<String> permissions = new java.util.HashSet<>();
            if (created.getRoles() != null) {
                for (vn.nhaxinh.user.Role r : created.getRoles()) {
                    if (r.getCode() != null) {
                        roles.add(r.getCode());
                    }
                    try {
                        if (r.getPermissions() != null) {
                            for (vn.nhaxinh.user.Permission p : r.getPermissions()) {
                                if (p.getCode() != null) {
                                    permissions.add(p.getCode());
                                }
                            }
                        }
                    } catch (Exception ex) {
                        log.warn("[AUTH] Không thể tải permissions cho role {}: {}", r.getCode(), ex.getMessage());
                    }
                }
            }

            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(new RegisterResponse(
                            created.getId(),
                            created.getUsername(),
                            created.getEmail(),
                            created.getPhone(),
                            created.getFullName(),
                            created.getAccountType(),
                            roles,
                            permissions));

        } catch (IllegalArgumentException ex) {
            String message = switch (ex.getMessage()) {
                case "USERNAME_TAKEN" -> "Tên đăng nhập đã được sử dụng. Vui lòng chọn tên khác.";
                case "EMAIL_TAKEN" -> "Email này đã được đăng ký. Vui lòng dùng email khác hoặc đăng nhập.";
                case "PHONE_TAKEN" -> "Số điện thoại này đã được đăng ký. Vui lòng kiểm tra lại.";
                default -> "Thông tin đăng ký không hợp lệ. Vui lòng kiểm tra lại.";
            };
            log.warn("[AUTH] Đăng ký thất bại (conflict) | ip={} | lý do={}", clientIp, ex.getMessage());
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("message", message));
        }
    }

    // ========================================================================
    // Đăng xuất
    // ========================================================================

    @PostMapping("/logout")
    public ResponseEntity<?> logout(HttpServletRequest request) {
        String clientIp = resolveClientIp(request);
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        String username = (authentication != null) ? authentication.getName() : "anonymous";

        User dbUser = userService.findByUsername(username).orElse(null);
        auditLogService.record(dbUser, "LOGOUT", "AUTH",
                dbUser != null ? dbUser.getId().toString() : "N/A",
                "{\"message\":\"Đăng xuất tài khoản\"}", clientIp);

        SecurityContextHolder.clearContext();
        request.getSession(false);

        log.info("[AUTH] Đăng xuất | user={} | ip={}", username, clientIp);
        return ResponseEntity.ok(Map.of("message", "Đăng xuất thành công."));
    }

    // ========================================================================
    // Quên mật khẩu & Đặt lại mật khẩu (Gửi mã OTP qua Email)
    // ========================================================================

    @PostMapping("/forgot-password")
    public ResponseEntity<?> forgotPassword(
            @Valid @RequestBody ForgotPasswordRequest request,
            HttpServletRequest httpRequest) {
        String clientIp = resolveClientIp(httpRequest);
        String email = request.email().trim().toLowerCase();

        var userOpt = userService.findByEmail(email);
        if (userOpt.isEmpty()) {
            // Trả về thông báo chung để tránh rò rỉ việc email có tồn tại hay không
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Nếu email của bạn đã đăng ký trên hệ thống, mã xác thực sẽ được gửi đến hộp thư."
            ));
        }

        User user = userOpt.get();
        // Sinh mã OTP ngẫu nhiên 6 chữ số
        String token = String.format("%06d", new java.security.SecureRandom().nextInt(1_000_000));
        resetTokens.put(email, new ResetTokenInfo(token, java.time.LocalDateTime.now().plusMinutes(15)));

        if (notificationService != null) {
            notificationService.sendPasswordResetEmail(email, user.getFullName(), token);
        }

        auditLogService.record(user, "FORGOT_PASSWORD_REQUEST", "AUTH", user.getId().toString(),
                "{\"message\":\"Yêu cầu đặt lại mật khẩu\"}", clientIp);

        log.info("[AUTH] Gửi mã đặt lại mật khẩu | email={} | ip={}", email, clientIp);
        return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Mã xác thực đặt lại mật khẩu đã được gửi đến email của bạn."
        ));
    }

    @PostMapping("/reset-password")
    public ResponseEntity<?> resetPassword(
            @Valid @RequestBody ResetPasswordRequest request,
            HttpServletRequest httpRequest) {
        String clientIp = resolveClientIp(httpRequest);
        String email = request.email().trim().toLowerCase();

        ResetTokenInfo tokenInfo = resetTokens.get(email);
        if (tokenInfo == null || !tokenInfo.token().equals(request.token().trim())) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of(
                    "success", false,
                    "message", "Mã xác thực không hợp lệ hoặc đã hết hạn."
            ));
        }

        if (tokenInfo.expiresAt().isBefore(java.time.LocalDateTime.now())) {
            resetTokens.remove(email);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of(
                    "success", false,
                    "message", "Mã xác thực đã hết hạn (chỉ có hiệu lực trong 15 phút)."
            ));
        }

        var userOpt = userService.findByEmail(email);
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of(
                    "success", false,
                    "message", "Không tìm thấy tài khoản người dùng."
            ));
        }

        User user = userOpt.get();
        userService.changePassword(user.getId(), request.newPassword());
        resetTokens.remove(email);

        auditLogService.record(user, "RESET_PASSWORD_SUCCESS", "AUTH", user.getId().toString(),
                "{\"message\":\"Đặt lại mật khẩu qua email thành công\"}", clientIp);

        log.info("[AUTH] Đặt lại mật khẩu thành công | email={} | ip={}", email, clientIp);
        return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Đặt lại mật khẩu thành công. Quý khách có thể đăng nhập bằng mật khẩu mới."
        ));
    }

    public record ForgotPasswordRequest(
            @NotBlank(message = "Email không được để trống")
            @Email(message = "Email không đúng định dạng")
            String email
    ) {}

    public record ResetPasswordRequest(
            @NotBlank(message = "Email không được để trống")
            @Email(message = "Email không đúng định dạng")
            String email,

            @NotBlank(message = "Mã xác thực không được để trống")
            String token,

            @NotBlank(message = "Mật khẩu mới không được để trống")
            @Size(min = 6, message = "Mật khẩu mới phải có ít nhất 6 ký tự")
            String newPassword
    ) {}

    // ========================================================================
    // Helpers
    // ========================================================================

    private String resolveClientIp(HttpServletRequest request) {
        String xff = request.getHeader("X-Forwarded-For");
        if (xff != null && !xff.isBlank()) {
            return xff.split(",")[0].trim();
        }
        String realIp = request.getHeader("X-Real-IP");
        if (realIp != null && !realIp.isBlank()) {
            return realIp.trim();
        }
        return request.getRemoteAddr();
    }

    // Records
    public record LoginRequest(
            @NotBlank(message = "Tên đăng nhập không được để trống") String username,

            @NotBlank(message = "Mật khẩu không được để trống") String password) {
    }

    public record RegisterRequest(
            @Size(min = 4, max = 100, message = "Tên đăng nhập phải từ 4-100 ký tự") @Pattern(regexp = "^[a-zA-Z0-9_.]+$", message = "Tên đăng nhập chỉ được chứa chữ cái, số, dấu chấm và gạch dưới") String username,

            @NotBlank(message = "Mật khẩu không được để trống") @Size(min = 8, max = 255, message = "Mật khẩu phải có ít nhất 8 ký tự") String password,

            @Email(message = "Địa chỉ email không hợp lệ") @Size(max = 254) String email,

            @Pattern(regexp = "^(0|\\+84)[0-9]{8,10}$", message = "Số điện thoại không đúng định dạng Việt Nam") String phone,

            @Size(max = 180, message = "Họ tên tối đa 180 ký tự") String fullName,

            Boolean marketingConsent) {
    }

    public record RegisterResponse(
            Long id,
            String username,
            String email,
            String phone,
            String fullName,
            String accountType,
            Set<String> roles,
            Set<String> permissions) {
    }

    public record SessionResponse(
            boolean authenticated,
            Long id,
            String username,
            String fullName,
            String email,
            String phone,
            String accountType,
            String status,
            Set<String> roles,
            Set<String> permissions) {

        public static SessionResponse unauthenticated() {
            return new SessionResponse(false, null, null, null, null, null, null, null, Set.of(), Set.of());
        }
    }
}
