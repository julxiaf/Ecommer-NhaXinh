package vn.nhaxinh.payment;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record PaymentResponse(
        Long id,
        Long orderId,
        String orderCode,
        String transactionCode,
        String paymentType,
        String paymentMethod,
        BigDecimal amount,
        String paymentStatus,
        String providerReference,
        LocalDateTime paidAt,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
    public static PaymentResponse from(Payment payment) {
        return new PaymentResponse(
                payment.getId(),
                payment.getOrder().getId(),
                payment.getOrder().getOrderCode(),
                payment.getTransactionCode(),
                payment.getPaymentType(),
                payment.getPaymentMethod(),
                payment.getAmount(),
                payment.getPaymentStatus(),
                payment.getProviderReference(),
                payment.getPaidAt(),
                payment.getCreatedAt(),
                payment.getUpdatedAt()
        );
    }
}
