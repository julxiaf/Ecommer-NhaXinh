package vn.nhaxinh.policy;

import java.time.LocalDateTime;

public record PolicyContentResponse(
        String title,
        String introduction,
        String purchasePolicy,
        String returnPolicy,
        LocalDateTime updatedAt
) {

}
