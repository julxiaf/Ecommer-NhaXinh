package vn.nhaxinh.policy;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record PolicyContentRequest(
        @NotBlank @Size(max = 200) String title,
        @NotBlank String introduction,
        @NotBlank String purchasePolicy,
        @NotBlank String returnPolicy
) {
}
