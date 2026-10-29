package vn.nhaxinh.payment;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record RetryPaymentRequest(
        @NotBlank @Pattern(regexp = "CASH_ON_DELIVERY|BANK_TRANSFER|VNPAY") String paymentMethod
) {
}
