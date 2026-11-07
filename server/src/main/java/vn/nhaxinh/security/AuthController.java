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
    private final JwtService jwtService;

    // Thời gian sống của mã OTP quên mật khẩu: 3 phút (180 giây)
    private static final long OTP_TTL_SECONDS = 180L;
    // Khoảng cách tối thiểu chống spam bấm liên tục: 20 giây
    private static final long OTP_MIN_RESEND_INTERVAL_SECONDS = 20L;

    // Cache mã OTP tạm thời cho luồng Quên mật khẩu: email -> {token, createdAt, expiresAt, invalidatedTokens}
    private static final java.util.concurrent.ConcurrentHashMap<String, ResetTokenInfo> resetTokens = new java.util.concurrent.ConcurrentHashMap<>();

    private record ResetTokenInfo(
            String token,
            java.time.LocalDateTime createdAt,
            java.time.LocalDateTime expiresAt,
            Set<String> invalidatedTokens) {}

    public AuthController(
            AuthenticationManager authenticationManager,
            SecurityContextRepository securityContextRepository,
            UserService userService,
            AuditLogService auditLogService,
            JwtService jwtService,
            @org.springframework.beans.factory.annotation.Autowired(required = false) NotificationService notificationService) {
        this.authenticationManager = authenticationManager;
        this.securityContextRepository = securityContextRepository;
        this.userService = userService;
        this.auditLogService = auditLogService;
        this.jwtService = jwtService;
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

        String jwtToken = jwtService.generateToken(user, roles, permissions);

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
                permissions,
                jwtToken,
                jwtService.getExpirationSeconds()
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
        String loginIdentifier = credentials.getLoginIdentifier();
        if (loginIdentifier.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Email không được để trống."));
        }
        String clientIp = resolveClientIp(request);

        try {
            Authentication authentication = authenticationManager.authenticate(
                    UsernamePasswordAuthenticationToken.unauthenticated(
                            loginIdentifier,
                            credentials.password()));

            request.getSession(true);
            request.changeSessionId();
            SecurityContext context = SecurityContextHolder.createEmptyContext();
            context.setAuthentication(authentication);
            SecurityContextHolder.setContext(context);
            securityContextRepository.saveContext(context, request, response);

            // Tìm user theo username hoặc email để ghi nhật ký audit log và trả thông tin đầy đủ
            User dbUser = userService.findByUsername(authentication.getName())
                    .or(() -> userService.findByEmail(loginIdentifier.toLowerCase()))
                    .orElse(null);
            log.info("[AUTH] Đăng nhập thành công | user={} | identifier={} | ip={}", authentication.getName(), loginIdentifier, clientIp);
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

            String jwtToken = jwtService.generateToken(dbUser, roles, permissions);
            jakarta.servlet.http.Cookie jwtCookie = new jakarta.servlet.http.Cookie(JwtAuthenticationFilter.JWT_COOKIE_NAME, jwtToken);
            jwtCookie.setHttpOnly(true);
            jwtCookie.setPath("/");
            jwtCookie.setMaxAge((int) jwtService.getExpirationSeconds());
            response.addCookie(jwtCookie);

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
                    permissions,
                    jwtToken,
                    jwtService.getExpirationSeconds()
            ));

        } catch (AuthenticationException exception) {
            SecurityContextHolder.clearContext();
            log.warn("[AUTH] Đăng nhập thất bại | identifier={} | ip={} | lý do={}",
                    loginIdentifier, clientIp, exception.getClass().getSimpleName());
            String failReason = exception.getClass().getSimpleName();
            auditLogService.record(null, "LOGIN_FAILED", "AUTH", loginIdentifier,
                    "{\"message\":\"Đăng nhập thất bại\",\"reason\":\"" + failReason + "\"}", clientIp);

            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", "Email hoặc mật khẩu không chính xác."));
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
                    null,
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
        String email = request.email() != null ? request.email().trim().toLowerCase() : "";
        if (email.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "code", "EMAIL_REQUIRED",
                    "message", "Vui lòng nhập địa chỉ email đã đăng ký."
            ));
        }

        var userOpt = userService.findByEmail(email);
        if (userOpt.isEmpty()
                || email.endsWith("@guest.nhaxinh.com")
                || "GUEST".equalsIgnoreCase(userOpt.get().getAccountType())) {
            log.warn("[AUTH] Yêu cầu quên mật khẩu thất bại: Email '{}' chưa đăng ký trên hệ thống | ip={}", email, clientIp);
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of(
                    "success", false,
                    "code", "EMAIL_NOT_REGISTERED",
                    "message", "Email này chưa được đăng ký trên hệ thống. Vui lòng kiểm tra lại hoặc đăng ký tài khoản mới."
            ));
        }

        User user = userOpt.get();
        if ("LOCKED".equalsIgnoreCase(user.getStatus())
                || "BANNED".equalsIgnoreCase(user.getStatus())
                || "INACTIVE".equalsIgnoreCase(user.getStatus())) {
            log.warn("[AUTH] Yêu cầu quên mật khẩu bị từ chối: Tài khoản '{}' đang ở trạng thái {} | ip={}",
                    email, user.getStatus(), clientIp);
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of(
                    "success", false,
                    "code", "ACCOUNT_DISABLED",
                    "message", "Tài khoản gắn với email này hiện đang bị khóa hoặc ngừng hoạt động."
            ));
        }

        java.time.LocalDateTime now = java.time.LocalDateTime.now();
        ResetTokenInfo existingToken = resetTokens.get(email);
        Set<String> invalidated = new java.util.HashSet<>();

        if (existingToken != null) {
            long secondsSinceLast = java.time.Duration.between(existingToken.createdAt(), now).getSeconds();
            if (secondsSinceLast >= 0 && secondsSinceLast < OTP_MIN_RESEND_INTERVAL_SECONDS) {
                long waitSeconds = OTP_MIN_RESEND_INTERVAL_SECONDS - secondsSinceLast;
                log.warn("[AUTH] Chặn spam OTP cho email '{}' (còn {}s cooldown) | ip={}", email, waitSeconds, clientIp);
                return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS).body(Map.of(
                        "success", false,
                        "code", "OTP_SPAM_COOLDOWN",
                        "field", "forgotEmail",
                        "retryAfterSeconds", waitSeconds,
                        "message", "Bạn vừa yêu cầu mã OTP. Vui lòng đợi " + waitSeconds + " giây trước khi lấy mã mới."
                ));
            }
            if (existingToken.invalidatedTokens() != null) {
                invalidated.addAll(existingToken.invalidatedTokens());
            }
            invalidated.add(existingToken.token());
        }

        // Sinh mã OTP ngẫu nhiên 6 chữ số mới (đảm bảo khác mã vừa cấp trước đó)
        java.security.SecureRandom random = new java.security.SecureRandom();
        String token;
        do {
            token = String.format("%06d", random.nextInt(1_000_000));
        } while (invalidated.contains(token));

        resetTokens.put(email, new ResetTokenInfo(
                token,
                now,
                now.plusSeconds(OTP_TTL_SECONDS),
                Set.copyOf(invalidated)
        ));

        if (notificationService != null) {
            var emailLog = notificationService.sendPasswordResetEmail(email, user.getFullName(), token);
            if (emailLog != null && "FAILED".equalsIgnoreCase(emailLog.getSendStatus())) {
                log.error("[AUTH] Gửi email OTP đặt lại mật khẩu thất bại cho {}: {}", email, emailLog.getErrorMessage());
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                        "success", false,
                        "code", "EMAIL_SEND_FAILED",
                        "message", "Không thể gửi mã xác thực tới email lúc này. Vui lòng thử lại sau."
                ));
            }
        }

        auditLogService.record(user, "FORGOT_PASSWORD_REQUEST", "AUTH", user.getId().toString(),
                "{\"message\":\"Yêu cầu đặt lại mật khẩu (OTP 3 phút)\"}", clientIp);

        log.info("[AUTH] Gửi mã đặt lại mật khẩu (hiệu lực 3 phút) | email={} | ip={}", email, clientIp);
        return ResponseEntity.ok(Map.of(
                "success", true,
                "expiresInSeconds", OTP_TTL_SECONDS,
                "resendCooldownSeconds", OTP_MIN_RESEND_INTERVAL_SECONDS,
                "message", "Mã xác thực OTP (6 chữ số, có hiệu lực trong 3 phút) đã được gửi đến email của bạn."
        ));
    }

    @PostMapping("/reset-password")
    public ResponseEntity<?> resetPassword(
            @Valid @RequestBody ResetPasswordRequest request,
            HttpServletRequest httpRequest) {
        String clientIp = resolveClientIp(httpRequest);
        String email = request.email().trim().toLowerCase();
        String submittedOtp = request.token() != null ? request.token().trim() : "";

        ResetTokenInfo tokenInfo = resetTokens.get(email);
        if (tokenInfo == null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of(
                    "success", false,
                    "code", "OTP_EXPIRED",
                    "field", "otp",
                    "message", "Mã OTP không tồn tại hoặc đã hết thời gian hiệu lực (3 phút). Vui lòng lấy lại mã OTP mới."
            ));
        }

        // Nếu người dùng nhập mã OTP cũ đã bị thay thế bởi lần lấy mã mới sau đó
        if (tokenInfo.invalidatedTokens() != null && tokenInfo.invalidatedTokens().contains(submittedOtp)) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of(
                    "success", false,
                    "code", "OTP_SUPERSEDED",
                    "field", "otp",
                    "message", "Mã OTP cũ không còn hợp lệ do bạn đã yêu cầu mã mới. Chỉ mã OTP mới nhất mới có hiệu lực."
            ));
        }

        // Kiểm tra thời gian sống 3 phút của mã OTP
        if (tokenInfo.expiresAt().isBefore(java.time.LocalDateTime.now())) {
            resetTokens.remove(email);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of(
                    "success", false,
                    "code", "OTP_EXPIRED",
                    "field", "otp",
                    "message", "Mã xác thực OTP đã quá thời gian hiệu lực (3 phút). Vui lòng bấm lấy lại mã OTP mới."
            ));
        }

        if (!tokenInfo.token().equals(submittedOtp)) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of(
                    "success", false,
                    "code", "OTP_INVALID",
                    "field", "otp",
                    "message", "Mã xác thực OTP không chính xác. Vui lòng kiểm tra lại."
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
            String email,
            String username,
            @NotBlank(message = "Mật khẩu không được để trống") String password) {

        public String getLoginIdentifier() {
            if (email != null && !email.isBlank()) {
                return email.trim().toLowerCase();
            }
            if (username != null && !username.isBlank()) {
                return username.trim();
            }
            return "";
        }
    }

    public record RegisterRequest(
            String username,

            @NotBlank(message = "Mật khẩu không được để trống")
            @Size(min = 8, max = 255, message = "Mật khẩu phải có ít nhất 8 ký tự")
            String password,

            @NotBlank(message = "Địa chỉ email không được để trống")
            @Email(message = "Địa chỉ email không hợp lệ")
            @Size(max = 254)
            String email,

            @NotBlank(message = "Số điện thoại không được để trống")
            @Pattern(regexp = "^(0|\\+84)[0-9]{8,10}$", message = "Số điện thoại không đúng định dạng Việt Nam")
            String phone,

            @NotBlank(message = "Họ và tên không được để trống")
            @Size(max = 180, message = "Họ tên tối đa 180 ký tự")
            String fullName,

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
            Set<String> permissions,
            String token,
            Long expiresIn) {

        public static SessionResponse unauthenticated() {
            return new SessionResponse(false, null, null, null, null, null, null, null, Set.of(), Set.of(), null, null);
        }
    }
}
