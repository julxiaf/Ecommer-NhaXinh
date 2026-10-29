package vn.nhaxinh.policy;

import java.time.LocalDateTime;

public record PolicyContentResponse(
        String title,
        String introduction,
        String purchasePolicy,
        String returnPolicy,
        LocalDateTime updatedAt
) {
    static PolicyContentResponse from(PolicyPage page) {
        return new PolicyContentResponse(
                page.getTitle(),
                page.getIntroduction(),
                page.getPurchasePolicy(),
                page.getReturnPolicy(),
                page.getUpdatedAt()
        );
    }
}
