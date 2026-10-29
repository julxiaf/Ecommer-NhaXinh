package vn.nhaxinh.policy;

import jakarta.validation.constraints.NotBlank;
import java.time.LocalDateTime;

public final class PolicyDtos {

    private PolicyDtos() {}

    public record PolicyResponse(
            Integer id,
            String slug,
            String title,
            String shortTitle,
            String intro,
            String content,
            String templateType,
            String fontFamily,
            String fontSize,
            String lineHeight,
            String accentColor,
            String status,
            String updatedBy,
            LocalDateTime createdAt,
            LocalDateTime updatedAt
    ) {
        public static PolicyResponse from(Policy policy) {
            return new PolicyResponse(
                    policy.getId(),
                    policy.getSlug(),
                    policy.getTitle(),
                    policy.getShortTitle(),
                    policy.getIntro(),
                    policy.getContent(),
                    policy.getTemplateType(),
                    policy.getFontFamily(),
                    policy.getFontSize(),
                    policy.getLineHeight(),
                    policy.getAccentColor(),
                    policy.getStatus(),
                    policy.getUpdatedBy(),
                    policy.getCreatedAt(),
                    policy.getUpdatedAt()
            );
        }
    }

    public record CreatePolicyRequest(
            @NotBlank(message = "Tiêu đề chính sách không được để trống")
            String title,
            String slug,
            String shortTitle,
            String intro,
            String content,
            String templateType,
            String fontFamily,
            String fontSize,
            String lineHeight,
            String accentColor,
            String status
    ) {}

    public record UpdatePolicyRequest(
            @NotBlank(message = "Tiêu đề chính sách không được để trống")
            String title,
            String slug,
            String shortTitle,
            String intro,
            String content,
            String templateType,
            String fontFamily,
            String fontSize,
            String lineHeight,
            String accentColor,
            String status
    ) {}
}
