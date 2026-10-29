package vn.nhaxinh.payment;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import java.net.URI;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.util.MultiValueMap;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.view.RedirectView;
import org.springframework.web.util.UriComponentsBuilder;
import vn.nhaxinh.controller.BaseController;

@RestController
@RequestMapping(BaseController.API_V1)
public class CheckoutController extends BaseController {

    private static final Logger log = LoggerFactory.getLogger(CheckoutController.class);

    private final CheckoutService checkoutService;
    private final VnPayService vnPayService;

    public CheckoutController(CheckoutService checkoutService, VnPayService vnPayService) {
        this.checkoutService = checkoutService;
        this.vnPayService = vnPayService;
    }

    @PostMapping({"/checkout", "/checkout/checkout"})
    public ResponseEntity<CheckoutResponse> checkout(
            @Valid @RequestBody CheckoutRequest request,
            @AuthenticationPrincipal UserDetails principal,
            @RequestHeader(value = "X-Cart-Token", required = false) String cartToken,
            HttpServletRequest servletRequest
    ) {
        CheckoutResponse response = checkoutService.checkout(
                request,
                principal == null ? null : principal.getUsername(),
                cartToken,
                servletRequest.getRemoteAddr()
        );
        return ResponseEntity.created(URI.create(API_V1 + "/payments/order/" + response.orderCode()))
                .body(response);
    }

    @GetMapping({"/coupons/validate", "/checkout/coupons/validate"})
    public Map<String, Object> validateCoupon(
            @RequestParam String code,
            @RequestParam(defaultValue = "0") java.math.BigDecimal subtotal,
            @RequestParam(defaultValue = "0") java.math.BigDecimal shippingFee,
            @AuthenticationPrincipal UserDetails principal
    ) {
        return checkoutService.previewCoupon(
                code,
                subtotal,
                shippingFee,
                principal == null ? null : principal.getUsername()
        );
    }

    @GetMapping({"/payments/order/{orderCode}", "/checkout/payments/order/{orderCode}"})
    public List<PaymentResponse> getOrderPayments(
            @PathVariable String orderCode,
            @RequestParam(required = false) String phone,
            @AuthenticationPrincipal UserDetails principal
    ) {
        return checkoutService.getPaymentsForOrder(
                        orderCode,
                        principal == null ? null : principal.getUsername(),
                        phone)
                .stream()
                .map(PaymentResponse::from)
                .toList();
    }

    @PostMapping({"/payments/order/{orderCode}/retry", "/checkout/payments/order/{orderCode}/retry"})
    public ResponseEntity<CheckoutResponse> retryPayment(
            @PathVariable String orderCode,
            @Valid @RequestBody RetryPaymentRequest request,
            @RequestParam(required = false) String phone,
            @AuthenticationPrincipal UserDetails principal,
            HttpServletRequest servletRequest
    ) {
        CheckoutResponse response = checkoutService.retryPayment(
                orderCode,
                request,
                principal == null ? null : principal.getUsername(),
                phone,
                servletRequest.getRemoteAddr());
        return ResponseEntity.created(URI.create(API_V1 + "/payments/order/" + orderCode))
                .body(response);
    }

    @PostMapping({"/payments/vnpay/ipn", "/checkout/payments/vnpay/ipn"})
    public Map<String, String> receiveVnPayIpn(
            @RequestParam MultiValueMap<String, String> parameters
    ) {
        CheckoutService.CallbackResult result = checkoutService.processVnPayNotification(parameters);
        return Map.of("RspCode", result.responseCode(), "Message", result.message());
    }

    @GetMapping({"/payments/vnpay/return", "/checkout/payments/vnpay/return"})
    public RedirectView receiveVnPayReturn(@RequestParam MultiValueMap<String, String> parameters) {
        boolean valid = vnPayService.verify(parameters);
        String txnRef = valid ? parameters.getFirst("vnp_TxnRef") : null;
        String responseCode = parameters.getFirst("vnp_ResponseCode");
        String transactionStatus = parameters.getFirst("vnp_TransactionStatus");
        boolean isSuccess = valid
                && "00".equals(responseCode)
                && (transactionStatus == null || "00".equals(transactionStatus));

        String orderCode = txnRef;
        String recipientPhone = null;
        if (valid && txnRef != null) {
            try {
                CheckoutService.CallbackResult callbackResult = checkoutService.processVnPayNotification(parameters);
                if (!"00".equals(callbackResult.responseCode())) {
                    isSuccess = false;
                }
            } catch (Exception ex) {
                log.error("[VNPAY-RETURN] Lỗi khi xử lý notification callback cho txnRef={}: {}", txnRef, ex.getMessage(), ex);
                isSuccess = false;
            }

            var orderOpt = checkoutService.findOrderByTransactionCode(txnRef);
            if (orderOpt.isPresent()) {
                orderCode = orderOpt.get().getOrderCode();
                recipientPhone = orderOpt.get().getRecipientPhone();
            } else {
                orderCode = checkoutService.findOrderCodeByTransactionCode(txnRef).orElse(txnRef);
            }
        }

        // Luôn chuyển hướng trình duyệt về trang kết quả thanh toán trên Frontend (/payment/result)
        String baseUrl = vnPayService.getFrontendResultUrl();
        if (baseUrl == null || baseUrl.isBlank()) {
            baseUrl = "http://localhost:5173/payment/result";
        }

        UriComponentsBuilder targetBuilder = UriComponentsBuilder.fromUriString(baseUrl)
                .queryParam("result", isSuccess ? "success" : "failed")
                .queryParam("vnpay", isSuccess ? "success" : "failed")
                .queryParamIfPresent("orderReference", Optional.ofNullable(orderCode))
                .queryParamIfPresent("orderCode", Optional.ofNullable(orderCode))
                .queryParamIfPresent("phone", Optional.ofNullable(recipientPhone))
                .queryParam("code", responseCode != null ? responseCode : (isSuccess ? "00" : "invalid"));

        String redirectUrl = targetBuilder.build().encode().toUriString();
        log.info("[VNPAY-RETURN] Redirecting to frontend: isSuccess={}, orderCode={}, target={}",
                isSuccess, orderCode, redirectUrl);

        return new RedirectView(redirectUrl);
    }
}