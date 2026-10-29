package vn.nhaxinh.payment;

import java.math.BigDecimal;

public record CheckoutResponse(
        Long orderId,
        String orderCode,
        String orderStatus,
        String paymentStatus,
        BigDecimal totalAmount,
        Long paymentId,
        String paymentMethod,
        String paymentRecordStatus,
        String paymentUrl
) {
}
