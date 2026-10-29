package vn.nhaxinh.user;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.format.DateTimeFormatter;
import java.util.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import vn.nhaxinh.audit.AuditLogService;
import vn.nhaxinh.controller.BaseController;
import vn.nhaxinh.security.ApiErrorCode;
import vn.nhaxinh.security.ApiException;

@RestController
@RequestMapping(BaseController.API_V1 + "/users")
public class UserController extends BaseController {

    private static final Logger log = LoggerFactory.getLogger(UserController.class);
    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    private final UserRepository userRepository;
    private final UserAddressRepository addressRepository;
    private final CustomerSummaryRepository customerSummaryRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuditLogService auditLogService;
    private final ObjectMapper objectMapper;

    public UserController(
            UserRepository userRepository,
            UserAddressRepository addressRepository,
            CustomerSummaryRepository customerSummaryRepository,
            PasswordEncoder passwordEncoder,
            AuditLogService auditLogService,
            ObjectMapper objectMapper) {
        this.userRepository = userRepository;
        this.addressRepository = addressRepository;
        this.customerSummaryRepository = customerSummaryRepository;
        this.passwordEncoder = passwordEncoder;
        this.auditLogService = auditLogService;
        this.objectMapper = objectMapper;
    }

    private User getAuthenticatedUser(UserDetails principal) {
        if (principal == null) {
            throw new ApiException(ApiErrorCode.AUTH_UNAUTHENTICATED);
        }
        return userRepository.findByUsername(principal.getUsername())
                .orElseThrow(() -> new ApiException(ApiErrorCode.AUTH_UNAUTHENTICATED));
    }

    // ========================================================================
    // 1. Hồ sơ người dùng hiện tại (Profile)
    // ========================================================================

    @GetMapping("/me")
    @Transactional(readOnly = true)
    public ResponseEntity<UserProfileDto> getProfile(@AuthenticationPrincipal UserDetails principal) {
        User user = getAuthenticatedUser(principal);
        return ResponseEntity.ok(buildProfileDto(user));
    }

    @PutMapping("/me")
    @Transactional
    public ResponseEntity<UserProfileDto> updateProfile(
            @AuthenticationPrincipal UserDetails principal,
            @RequestBody UpdateProfileRequest request,
            HttpServletRequest httpRequest) {
        User user = getAuthenticatedUser(principal);

        if (request.fullName() != null && !request.fullName().isBlank()) {
            user.setFullName(request.fullName().trim());
        }
        if (request.phone() != null && !request.phone().isBlank()) {
            String newPhone = request.phone().trim();
            userRepository.findByPhone(newPhone).ifPresent(existing -> {
                if (!existing.getId().equals(user.getId())) {
                    throw new ApiException(ApiErrorCode.RESOURCE_CONFLICT, "Số điện thoại đã được tài khoản khác sử dụng");
                }
            });
            user.setPhone(newPhone);
        }
        if (request.email() != null && !request.email().isBlank()) {
            String newEmail = request.email().trim().toLowerCase();
            userRepository.findByEmail(newEmail).ifPresent(existing -> {
                if (!existing.getId().equals(user.getId())) {
                    throw new ApiException(ApiErrorCode.RESOURCE_CONFLICT, "Email đã được tài khoản khác sử dụng");
                }
            });
            user.setEmail(newEmail);
        }

        // Lưu giới tính, ngày sinh, địa chỉ bổ sung vào internal_note dạng JSON
        try {
            Map<String, Object> meta = parseInternalNote(user.getInternalNote());
            if (request.gender() != null) meta.put("gender", request.gender());
            if (request.birthDate() != null) meta.put("birthDate", request.birthDate());
            if (request.address() != null) meta.put("address", request.address());
            user.setInternalNote(objectMapper.writeValueAsString(meta));
        } catch (Exception ex) {
            log.warn("Không thể lưu metadata người dùng: {}", ex.getMessage());
        }

        User saved = userRepository.save(user);
        auditLogService.record(saved, "PROFILE_UPDATED", "USER", saved.getId().toString(),
                "{\"message\":\"Cập nhật thông tin cá nhân\"}", httpRequest.getRemoteAddr());

        return ResponseEntity.ok(buildProfileDto(saved));
    }

    // ========================================================================
    // 2. Đổi mật khẩu
    // ========================================================================

    @PostMapping("/change-password")
    @Transactional
    public ResponseEntity<?> changePassword(
            @AuthenticationPrincipal UserDetails principal,
            @Valid @RequestBody ChangePasswordRequest request,
            HttpServletRequest httpRequest) {
        User user = getAuthenticatedUser(principal);

        if (!passwordEncoder.matches(request.currentPassword(), user.getPasswordHash())) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("success", false, "message", "Mật khẩu hiện tại không chính xác."));
        }

        if (request.newPassword().length() < 6) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("success", false, "message", "Mật khẩu mới phải có ít nhất 6 ký tự."));
        }

        user.setPasswordHash(passwordEncoder.encode(request.newPassword()));
        userRepository.save(user);

        auditLogService.record(user, "PASSWORD_CHANGED", "USER", user.getId().toString(),
                "{\"message\":\"Đổi mật khẩu thành công\"}", httpRequest.getRemoteAddr());

        return ResponseEntity.ok(Map.of("success", true, "message", "Đổi mật khẩu thành công!"));
    }

    // ========================================================================
    // 3. Sổ địa chỉ (Addresses)
    // ========================================================================

    @GetMapping("/me/addresses")
    @Transactional(readOnly = true)
    public ResponseEntity<List<UserAddressDto>> getAddresses(@AuthenticationPrincipal UserDetails principal) {
        User user = getAuthenticatedUser(principal);
        List<UserAddress> list = addressRepository.findByUserIdOrderByIsDefaultDescCreatedAtDesc(user.getId());
        return ResponseEntity.ok(list.stream().map(this::toAddressDto).toList());
    }

    @PostMapping("/me/addresses")
    @Transactional
    public ResponseEntity<List<UserAddressDto>> saveAddress(
            @AuthenticationPrincipal UserDetails principal,
            @Valid @RequestBody AddressUpsertRequest req) {
        User user = getAuthenticatedUser(principal);

        UserAddress address;
        if (req.id() != null && !req.id().isBlank() && !req.id().startsWith("addr-")) {
            try {
                Long addrId = Long.parseLong(req.id());
                address = addressRepository.findByIdAndUserId(addrId, user.getId())
                        .orElse(new UserAddress());
            } catch (NumberFormatException e) {
                address = new UserAddress();
            }
        } else {
            address = new UserAddress();
        }

        address.setUser(user);
        address.setRecipientName(req.recipientName().trim());
        address.setPhone(req.phone().trim());
        address.setProvince(req.province() != null ? req.province().trim() : null);
        address.setDistrict(req.district() != null ? req.district().trim() : null);
        address.setWard(req.ward() != null ? req.ward().trim() : null);
        address.setAddressLine(req.addressDetail() != null ? req.addressDetail().trim() : "");

        List<UserAddress> existingAddresses = addressRepository.findByUserId(user.getId());
        boolean makeDefault = Boolean.TRUE.equals(req.isDefault()) || existingAddresses.isEmpty();
        address.setIsDefault(makeDefault);

        if (makeDefault) {
            for (UserAddress a : existingAddresses) {
                if (address.getId() == null || !a.getId().equals(address.getId())) {
                    a.setIsDefault(false);
                    addressRepository.save(a);
                }
            }
        }

        addressRepository.save(address);

        List<UserAddress> updatedList = addressRepository.findByUserIdOrderByIsDefaultDescCreatedAtDesc(user.getId());
        return ResponseEntity.ok(updatedList.stream().map(this::toAddressDto).toList());
    }

    @DeleteMapping("/me/addresses/{id}")
    @Transactional
    public ResponseEntity<List<UserAddressDto>> deleteAddress(
            @AuthenticationPrincipal UserDetails principal,
            @PathVariable Long id) {
        User user = getAuthenticatedUser(principal);

        UserAddress address = addressRepository.findByIdAndUserId(id, user.getId())
                .orElseThrow(() -> new ApiException(ApiErrorCode.RESOURCE_NOT_FOUND, "Không tìm thấy địa chỉ"));

        boolean wasDefault = Boolean.TRUE.equals(address.getIsDefault());
        addressRepository.delete(address);

        List<UserAddress> remaining = addressRepository.findByUserIdOrderByIsDefaultDescCreatedAtDesc(user.getId());
        if (wasDefault && !remaining.isEmpty()) {
            UserAddress newDefault = remaining.get(0);
            newDefault.setIsDefault(true);
            addressRepository.save(newDefault);
        }

        List<UserAddress> updatedList = addressRepository.findByUserIdOrderByIsDefaultDescCreatedAtDesc(user.getId());
        return ResponseEntity.ok(updatedList.stream().map(this::toAddressDto).toList());
    }

    @PutMapping("/me/addresses/{id}/default")
    @Transactional
    public ResponseEntity<List<UserAddressDto>> setDefaultAddress(
            @AuthenticationPrincipal UserDetails principal,
            @PathVariable Long id) {
        User user = getAuthenticatedUser(principal);

        UserAddress target = addressRepository.findByIdAndUserId(id, user.getId())
                .orElseThrow(() -> new ApiException(ApiErrorCode.RESOURCE_NOT_FOUND, "Không tìm thấy địa chỉ"));

        List<UserAddress> addresses = addressRepository.findByUserId(user.getId());
        for (UserAddress a : addresses) {
            a.setIsDefault(a.getId().equals(target.getId()));
            addressRepository.save(a);
        }

        List<UserAddress> updatedList = addressRepository.findByUserIdOrderByIsDefaultDescCreatedAtDesc(user.getId());
        return ResponseEntity.ok(updatedList.stream().map(this::toAddressDto).toList());
    }

    // ========================================================================
    // Helpers & DTOs
    // ========================================================================

    private UserProfileDto buildProfileDto(User user) {
        BigDecimal totalSpent = BigDecimal.ZERO;
        try {
            var summaryOpt = customerSummaryRepository.findById(user.getId());
            if (summaryOpt.isPresent() && summaryOpt.get().getTotalSpent() != null) {
                totalSpent = summaryOpt.get().getTotalSpent();
            }
        } catch (Exception ignored) {}

        double spentVal = totalSpent.doubleValue();
        String memberTier = "bronze";
        if (spentVal >= 80_000_000) {
            memberTier = "diamond";
        } else if (spentVal >= 30_000_000) {
            memberTier = "gold";
        } else if (spentVal >= 10_000_000) {
            memberTier = "silver";
        }

        int loyaltyPoints = (int) (spentVal / 100_000);

        Map<String, Object> meta = parseInternalNote(user.getInternalNote());
        String gender = (String) meta.getOrDefault("gender", "male");
        String birthDate = (String) meta.getOrDefault("birthDate", "");
        String defaultAddr = (String) meta.getOrDefault("address", "");

        if (defaultAddr.isBlank()) {
            var addrOpt = addressRepository.findByUserIdAndIsDefaultTrue(user.getId());
            if (addrOpt.isPresent()) {
                UserAddress a = addrOpt.get();
                List<String> parts = new ArrayList<>();
                if (a.getAddressLine() != null && !a.getAddressLine().isBlank()) parts.add(a.getAddressLine());
                if (a.getWard() != null && !a.getWard().isBlank()) parts.add(a.getWard());
                if (a.getDistrict() != null && !a.getDistrict().isBlank()) parts.add(a.getDistrict());
                if (a.getProvince() != null && !a.getProvince().isBlank()) parts.add(a.getProvince());
                defaultAddr = String.join(", ", parts);
            }
        }

        String createdAt = user.getCreatedAt() != null ? user.getCreatedAt().format(DATE_FMT) : "";

        return new UserProfileDto(
                String.valueOf(user.getId()),
                user.getFullName() != null ? user.getFullName() : (user.getUsername() != null ? user.getUsername() : "Khách hàng"),
                user.getEmail() != null ? user.getEmail() : "",
                user.getPhone() != null ? user.getPhone() : "",
                defaultAddr,
                null,
                gender,
                birthDate,
                memberTier,
                loyaltyPoints,
                spentVal,
                createdAt
        );
    }

    private UserAddressDto toAddressDto(UserAddress a) {
        return new UserAddressDto(
                String.valueOf(a.getId()),
                a.getRecipientName(),
                a.getPhone(),
                a.getProvince() != null ? a.getProvince() : "",
                a.getDistrict() != null ? a.getDistrict() : "",
                a.getWard() != null ? a.getWard() : "",
                a.getAddressLine(),
                Boolean.TRUE.equals(a.getIsDefault()),
                "home"
        );
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> parseInternalNote(String note) {
        if (note == null || note.isBlank()) return new HashMap<>();
        try {
            return objectMapper.readValue(note, Map.class);
        } catch (Exception e) {
            return new HashMap<>();
        }
    }

    // Records
    public record UserProfileDto(
            String id,
            String fullName,
            String email,
            String phone,
            String address,
            String avatar,
            String gender,
            String birthDate,
            String memberTier,
            int loyaltyPoints,
            double totalSpent,
            String createdAt
    ) {}

    public record UpdateProfileRequest(
            String fullName,
            String phone,
            String email,
            String address,
            String gender,
            String birthDate
    ) {}

    public record ChangePasswordRequest(
            @NotBlank(message = "Mật khẩu hiện tại không được để trống") String currentPassword,
            @NotBlank(message = "Mật khẩu mới không được để trống") @Size(min = 6, message = "Mật khẩu mới phải có ít nhất 6 ký tự") String newPassword
    ) {}

    public record UserAddressDto(
            String id,
            String recipientName,
            String phone,
            String province,
            String district,
            String ward,
            String addressDetail,
            boolean isDefault,
            String type
    ) {}

    public record AddressUpsertRequest(
            String id,
            @NotBlank(message = "Họ tên người nhận không được để trống") String recipientName,
            @NotBlank(message = "Số điện thoại không được để trống") String phone,
            String province,
            String district,
            String ward,
            @NotBlank(message = "Địa chỉ chi tiết không được để trống") String addressDetail,
            Boolean isDefault,
            String type
    ) {}
}
