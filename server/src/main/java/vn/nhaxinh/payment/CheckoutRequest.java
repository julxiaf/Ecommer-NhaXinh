package vn.nhaxinh.payment;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;

public record CheckoutRequest(
        Long iduser,
        @NotBlank @Size(max = 180) String recipientName,
        @NotBlank @Pattern(regexp = "^[0-9+() .-]{8,30}$") String recipientPhone,
        @Email @Size(max = 254) String recipientEmail,
        @NotBlank @Size(max = 1000) String shippingAddress,
        @NotBlank @Pattern(regexp = "CASH_ON_DELIVERY|BANK_TRANSFER|VNPAY") String paymentMethod,
        @Size(max = 1000) String customerNote,
        @Size(max = 80) String couponCode,
        @PositiveOrZero BigDecimal shippingFee
) {
    public CheckoutRequest(
            Long iduser,
            String recipientName,
            String recipientPhone,
            String recipientEmail,
            String shippingAddress,
            String paymentMethod,
            String customerNote
    ) {
        this(iduser, recipientName, recipientPhone, recipientEmail, shippingAddress, paymentMethod, customerNote, null, null);
    }
}
