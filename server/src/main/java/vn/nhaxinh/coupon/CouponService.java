package vn.nhaxinh.coupon;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Sort;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.nhaxinh.audit.AuditLogService;
import vn.nhaxinh.order.OrderRepository;
import vn.nhaxinh.security.ApiErrorCode;
import vn.nhaxinh.security.ApiException;
import vn.nhaxinh.user.User;
import vn.nhaxinh.user.UserRepository;

@Service
@Transactional
public class CouponService {

    private static final Logger log = LoggerFactory.getLogger(CouponService.class);

    private final CouponRepository couponRepository;
    private final CouponUsageRepository usageRepository;
    private final OrderRepository orderRepository;
    private final AuditLogService auditLogService;
    private final UserRepository userRepository;
    private final ObjectMapper objectMapper;

    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    public CouponService(
            CouponRepository couponRepository,
            CouponUsageRepository usageRepository,
            OrderRepository orderRepository,
            AuditLogService auditLogService,
            UserRepository userRepository,
            ObjectMapper objectMapper
    ) {
        this.couponRepository = couponRepository;
        this.usageRepository = usageRepository;
        this.orderRepository = orderRepository;
        this.auditLogService = auditLogService;
        this.userRepository = userRepository;
        this.objectMapper = objectMapper;
    }

    @Transactional(readOnly = true)
    public List<Coupon> findAll() {
        return couponRepository.findAll(Sort.by(Sort.Direction.DESC, "id"));
    }

    @Transactional(readOnly = true)
    public List<CouponDTO> findAllDTOs() {
        return couponRepository.findAll(Sort.by(Sort.Direction.DESC, "id"))
                .stream()
                .map(this::toDTO)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<CouponDTO> findActivePublicCoupons() {
        return couponRepository.findByStatus("ACTIVE")
                .stream()
                .filter(Coupon::isValidNow)
                .map(this::toDTO)
                .toList();
    }

    @Transactional(readOnly = true)
    public Optional<Coupon> findById(Long id) {
        return couponRepository.findById(id);
    }

    @Transactional(readOnly = true)
    public Optional<Coupon> findByCode(String code) {
        if (code == null) return Optional.empty();
        return couponRepository.findByCode(code.trim().toUpperCase());
    }

    @Transactional(readOnly = true)
    public CouponValidationResult validateCouponDetailed(
            String code,
            BigDecimal orderAmount,
            Long userId,
            String phone
    ) {
        if (code == null || code.isBlank()) {
            return CouponValidationResult.error("Vui lòng nhập mã giảm giá.");
        }
        Optional<Coupon> opt = couponRepository.findByCode(code.trim().toUpperCase());
        if (opt.isEmpty()) {
            return CouponValidationResult.error("Mã giảm giá '" + code.trim().toUpperCase() + "' không tồn tại.");
        }
        Coupon coupon = opt.get();
        if (!"ACTIVE".equalsIgnoreCase(coupon.getStatus())) {
            return CouponValidationResult.error("Mã giảm giá '" + coupon.getCode() + "' hiện đang tạm ngưng áp dụng.");
        }

        LocalDateTime now = LocalDateTime.now();
        if (coupon.getStartsAt() != null && now.isBefore(coupon.getStartsAt())) {
            return CouponValidationResult.error(
                    "Mã giảm giá '" + coupon.getCode() + "' có hiệu lực từ ngày " + coupon.getStartsAt().format(DATE_FMT) + ".");
        }
        if (coupon.getEndsAt() != null && now.isAfter(coupon.getEndsAt())) {
            return CouponValidationResult.error(
                    "Mã giảm giá '" + coupon.getCode() + "' đã hết hạn vào ngày " + coupon.getEndsAt().format(DATE_FMT) + ".");
        }

        // 1. Kiểm tra đối tượng áp dụng: FIRST_ORDER / NEW_USER (Áp dụng cho thanh toán lần đầu)
        String target = coupon.getTargetCustomer() != null ? coupon.getTargetCustomer().toUpperCase() : "ALL";
        if ("FIRST_ORDER".equals(target) || "NEW_USER".equals(target)) {
            if (userId == null) {
                // Khách chưa đăng nhập
                return CouponValidationResult.error(
                        "Mã giảm giá '" + coupon.getCode() + "' chỉ áp dụng cho tài khoản đăng ký mới (thanh toán lần đầu). Vui lòng đăng nhập để sử dụng.");
            }
            long previousOrders = orderRepository.countByUserIdAndOrderStatusNot(userId, "CANCELLED");
            if (previousOrders > 0) {
                return CouponValidationResult.error(
                        "Mã giảm giá '" + coupon.getCode() + "' chỉ áp dụng cho đơn hàng đầu tiên của khách hàng mới.");
            }
            if (phone != null && !phone.isBlank()) {
                long phoneOrders = orderRepository.countByRecipientPhoneAndOrderStatusNot(phone.trim(), "CANCELLED");
                if (phoneOrders > 0) {
                    return CouponValidationResult.error(
                            "Số điện thoại này đã từng phát sinh đơn hàng trước đó. Mã chỉ áp dụng cho đơn hàng đầu tiên.");
                }
            }
        }

        // 2. Kiểm tra giá trị đơn hàng tối thiểu
        if (coupon.getMinOrderAmount() != null && orderAmount != null
                && orderAmount.compareTo(coupon.getMinOrderAmount()) < 0) {
            return CouponValidationResult.error(
                    "Đơn hàng chưa đạt giá trị tối thiểu " + formatMoney(coupon.getMinOrderAmount())
                            + " để áp dụng mã '" + coupon.getCode() + "'.");
        }

        // 3. Kiểm tra giới hạn lượt dùng tổng
        if (coupon.getUsageLimit() != null) {
            long used = usageRepository.countByCouponId(coupon.getId());
            if (used >= coupon.getUsageLimit()) {
                return CouponValidationResult.error("Mã giảm giá '" + coupon.getCode() + "' đã hết lượt sử dụng.");
            }
        }

        // 4. Kiểm tra giới hạn lượt dùng mỗi người
        if (userId != null && coupon.getUsagePerUser() != null) {
            long userUsed = usageRepository.countByCouponIdAndUserId(coupon.getId(), userId);
            if (userUsed >= coupon.getUsagePerUser()) {
                return CouponValidationResult.error("Bạn đã sử dụng hết " + coupon.getUsagePerUser() + " lượt của mã giảm giá này.");
            }
        }

        return CouponValidationResult.ok(coupon);
    }

    // Giữ nguyên tương thích với hàm cũ
    @Transactional(readOnly = true)
    public Optional<Coupon> validateCoupon(String code, BigDecimal orderAmount, Long userId) {
        CouponValidationResult res = validateCouponDetailed(code, orderAmount, userId, null);
        return res.valid() ? Optional.of(res.coupon()) : Optional.empty();
    }

    public Coupon save(Coupon coupon) {
        return couponRepository.save(coupon);
    }

    public CouponDTO saveFromDTO(CouponDTO dto) {
        Coupon coupon;
        String cleanCode = dto.code() != null ? dto.code().trim().toUpperCase() : "";
        if (cleanCode.isBlank()) {
            throw new ApiException(ApiErrorCode.VALIDATION_FAILED, "Mã giảm giá không được để trống.");
        }

        if (dto.id() != null) {
            coupon = couponRepository.findById(dto.id())
                    .orElseThrow(() -> new ApiException(ApiErrorCode.RESOURCE_NOT_FOUND, "Không tìm thấy mã giảm giá id=" + dto.id()));
            Optional<Coupon> existing = couponRepository.findByCode(cleanCode);
            if (existing.isPresent() && !existing.get().getId().equals(dto.id())) {
                throw new ApiException(ApiErrorCode.VALIDATION_FAILED, "Mã giảm giá '" + cleanCode + "' đã tồn tại.");
            }
        } else {
            if (couponRepository.findByCode(cleanCode).isPresent()) {
                throw new ApiException(ApiErrorCode.VALIDATION_FAILED, "Mã giảm giá '" + cleanCode + "' đã tồn tại.");
            }
            coupon = new Coupon();
        }

        boolean isCreate = (dto.id() == null);
        Map<String, Object> changes = new LinkedHashMap<>();

        String nextName = dto.name() != null && !dto.name().isBlank() ? dto.name().trim() : cleanCode;
        String nextType = dto.discountType() != null ? dto.discountType().toUpperCase() : "PERCENT";
        BigDecimal nextVal = dto.discountValue() != null ? dto.discountValue() : BigDecimal.ZERO;
        BigDecimal nextMinOrder = dto.minOrderAmount() != null ? dto.minOrderAmount() : BigDecimal.ZERO;
        Integer nextUsagePerUser = dto.usagePerUser() != null ? dto.usagePerUser() : 1;
        String nextStatus = dto.status() != null ? dto.status().toUpperCase() : "ACTIVE";
        String nextTarget = dto.targetCustomer() != null ? dto.targetCustomer().toUpperCase() : "ALL";
        String nextScope = dto.scopeType() != null ? dto.scopeType().toUpperCase() : "ALL";

        if (!isCreate) {
            if (!Objects.equals(coupon.getCode(), cleanCode)) {
                changes.put("code", Map.of("old", String.valueOf(coupon.getCode()), "new", cleanCode));
            }
            if (!Objects.equals(coupon.getName(), nextName)) {
                changes.put("name", Map.of("old", String.valueOf(coupon.getName()), "new", nextName));
            }
            if (!Objects.equals(coupon.getDiscountType(), nextType)) {
                changes.put("discountType", Map.of("old", String.valueOf(coupon.getDiscountType()), "new", nextType));
            }
            if (coupon.getDiscountValue() == null || coupon.getDiscountValue().compareTo(nextVal) != 0) {
                changes.put("discountValue", Map.of("old", String.valueOf(coupon.getDiscountValue()), "new", String.valueOf(nextVal)));
            }
            if (coupon.getMinOrderAmount() == null || coupon.getMinOrderAmount().compareTo(nextMinOrder) != 0) {
                changes.put("minOrderAmount", Map.of("old", String.valueOf(coupon.getMinOrderAmount()), "new", String.valueOf(nextMinOrder)));
            }
            if (!Objects.equals(coupon.getMaxDiscountAmount(), dto.maxDiscountAmount())) {
                changes.put("maxDiscountAmount", Map.of("old", String.valueOf(coupon.getMaxDiscountAmount()), "new", String.valueOf(dto.maxDiscountAmount())));
            }
            if (!Objects.equals(coupon.getUsageLimit(), dto.usageLimit())) {
                changes.put("usageLimit", Map.of("old", String.valueOf(coupon.getUsageLimit()), "new", String.valueOf(dto.usageLimit())));
            }
            if (!Objects.equals(coupon.getUsagePerUser(), nextUsagePerUser)) {
                changes.put("usagePerUser", Map.of("old", String.valueOf(coupon.getUsagePerUser()), "new", String.valueOf(nextUsagePerUser)));
            }
            if (!Objects.equals(coupon.getStartsAt(), dto.startsAt())) {
                changes.put("startsAt", Map.of("old", String.valueOf(coupon.getStartsAt()), "new", String.valueOf(dto.startsAt())));
            }
            if (!Objects.equals(coupon.getEndsAt(), dto.endsAt())) {
                changes.put("endsAt", Map.of("old", String.valueOf(coupon.getEndsAt()), "new", String.valueOf(dto.endsAt())));
            }
            if (!Objects.equals(coupon.getStatus(), nextStatus)) {
                changes.put("status", Map.of("old", String.valueOf(coupon.getStatus()), "new", nextStatus));
            }
            if (!Objects.equals(coupon.getTargetCustomer(), nextTarget)) {
                changes.put("targetCustomer", Map.of("old", String.valueOf(coupon.getTargetCustomer()), "new", nextTarget));
            }
            if (!Objects.equals(coupon.getScopeType(), nextScope)) {
                changes.put("scopeType", Map.of("old", String.valueOf(coupon.getScopeType()), "new", nextScope));
            }
        }

        coupon.setCode(cleanCode);
        coupon.setName(nextName);
        coupon.setDescription(dto.description());
        coupon.setDiscountType(nextType);
        coupon.setDiscountValue(nextVal);
        coupon.setMinOrderAmount(nextMinOrder);
        coupon.setMaxDiscountAmount(dto.maxDiscountAmount());
        coupon.setUsageLimit(dto.usageLimit());
        coupon.setUsagePerUser(nextUsagePerUser);
        coupon.setStartsAt(dto.startsAt());
        coupon.setEndsAt(dto.endsAt());
        coupon.setStatus(nextStatus);

        coupon.setTargetCustomer(nextTarget);
        coupon.setScopeType(nextScope);
        coupon.setApplicableCollections(dto.applicableCollections());
        coupon.setApplicableCategories(dto.applicableCategories());
        coupon.setApplicableProductIds(dto.applicableProductIds());

        Coupon saved = couponRepository.save(coupon);

        if (isCreate) {
            log.info("[COUPON-CREATE] Tạo mới mã giảm giá id={} code='{}' name='{}' type={} value={} minOrder={} status={}",
                    saved.getId(), saved.getCode(), saved.getName(), saved.getDiscountType(), saved.getDiscountValue(),
                    saved.getMinOrderAmount(), saved.getStatus());
            recordAudit("COUPON_CREATE", saved.getId(), Map.of(
                    "id", saved.getId(),
                    "code", saved.getCode(),
                    "name", saved.getName(),
                    "discountType", saved.getDiscountType(),
                    "discountValue", saved.getDiscountValue(),
                    "status", saved.getStatus()
            ));
        } else {
            log.info("[COUPON-UPDATE] Cập nhật mã giảm giá id={} code='{}' | Chi tiết các trường thay đổi ({}): {}",
                    saved.getId(), saved.getCode(), changes.size(), changes);
            recordAudit("COUPON_UPDATE", saved.getId(), Map.of(
                    "id", saved.getId(),
                    "code", saved.getCode(),
                    "changes", changes
            ));
        }

        return toDTO(saved);
    }

    public void deleteCoupon(Long id) {
        Coupon existing = couponRepository.findById(id)
                .orElseThrow(() -> new ApiException(ApiErrorCode.RESOURCE_NOT_FOUND, "Không tìm thấy mã giảm giá id=" + id));
        couponRepository.deleteById(id);
        log.warn("[COUPON-DELETE] Xóa mã giảm giá id={} code='{}' name='{}'", id, existing.getCode(), existing.getName());
        recordAudit("COUPON_DELETE", id, Map.of("id", id, "code", existing.getCode(), "name", existing.getName()));
    }

    private void recordAudit(String action, Object entityId, Map<String, Object> details) {
        try {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            String username = (auth != null && auth.isAuthenticated()) ? auth.getName() : "SYSTEM";
            User actor = userRepository.findByUsername(username).orElse(null);
            String json = objectMapper.writeValueAsString(details);
            auditLogService.record(actor, action, "COUPON", String.valueOf(entityId), json, null);
        } catch (Exception ex) {
            log.warn("[COUPON-AUDIT] Không thể ghi audit log cho mã giảm giá id={}: {}", entityId, ex.getMessage());
        }
    }

    public CouponUsage recordUsage(Coupon coupon, User user, Long orderId, BigDecimal discountAmount) {
        return usageRepository.save(new CouponUsage(coupon, user, orderId, discountAmount));
    }

    public CouponDTO toDTO(Coupon coupon) {
        long used = usageRepository.countByCouponId(coupon.getId());
        return new CouponDTO(
                coupon.getId(),
                coupon.getCode(),
                coupon.getName(),
                coupon.getDescription(),
                coupon.getDiscountType(),
                coupon.getDiscountValue(),
                coupon.getMinOrderAmount(),
                coupon.getMaxDiscountAmount(),
                coupon.getUsageLimit(),
                coupon.getUsagePerUser(),
                used,
                coupon.getStartsAt(),
                coupon.getEndsAt(),
                coupon.getStatus(),
                coupon.getTargetCustomer(),
                coupon.getScopeType(),
                coupon.getApplicableCollections(),
                coupon.getApplicableCategories(),
                coupon.getApplicableProductIds(),
                coupon.getCreatedAt(),
                coupon.getUpdatedAt()
        );
    }

    private String formatMoney(BigDecimal amount) {
        if (amount == null) return "0₫";
        return String.format("%,d₫", amount.longValue());
    }
}
