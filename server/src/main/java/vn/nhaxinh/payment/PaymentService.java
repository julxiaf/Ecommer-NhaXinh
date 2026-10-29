package vn.nhaxinh.payment;

import java.util.List;
import java.util.Optional;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class PaymentService {

    private final PaymentRepository paymentRepository;
    private final RefundRepository refundRepository;
    private final PaymentWebhookEventRepository webhookEventRepository;

    public PaymentService(
            PaymentRepository paymentRepository,
            RefundRepository refundRepository,
            PaymentWebhookEventRepository webhookEventRepository
    ) {
        this.paymentRepository = paymentRepository;
        this.refundRepository = refundRepository;
        this.webhookEventRepository = webhookEventRepository;
    }

    @Transactional(readOnly = true)
    public List<Payment> findByOrderId(Long orderId) {
        return paymentRepository.findByOrderId(orderId);
    }

    @Transactional(readOnly = true)
    public Optional<Payment> findByTransactionCode(String transactionCode) {
        return paymentRepository.findByTransactionCode(transactionCode);
    }

    public Payment savePayment(Payment payment) {
        return paymentRepository.save(payment);
    }

    @Transactional(readOnly = true)
    public List<Refund> findRefundsByOrderId(Long orderId) {
        return refundRepository.findByOrderId(orderId);
    }

    public Refund saveRefund(Refund refund) {
        return refundRepository.save(refund);
    }

    public PaymentWebhookEvent saveWebhookEvent(PaymentWebhookEvent event) {
        return webhookEventRepository.save(event);
    }

    @Transactional(readOnly = true)
    public Optional<PaymentWebhookEvent> findWebhookEvent(String provider, String eventId) {
        return webhookEventRepository.findByProviderAndEventId(provider, eventId);
    }
}
