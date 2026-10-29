package vn.nhaxinh.payment;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Pattern;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import vn.nhaxinh.controller.BaseController;
import vn.nhaxinh.user.User;
import vn.nhaxinh.user.UserService;

@RestController
@RequestMapping(BaseController.API_V1 + "/admin/payments")
public class PaymentController extends BaseController {

    private final CheckoutService checkoutService;
    private final UserService userService;

    public PaymentController(CheckoutService checkoutService, UserService userService) {
        this.checkoutService = checkoutService;
        this.userService = userService;
    }

    @GetMapping
    public Page<PaymentResponse> listPayments(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        Pageable pageable = PageRequest.of(
                Math.max(0, page),
                Math.min(Math.max(1, size), 100),
                Sort.by(Sort.Direction.DESC, "createdAt"));
        return checkoutService.listPayments(pageable).map(PaymentResponse::from);
    }

    @GetMapping("/{paymentId}")
    public PaymentResponse getPayment(@PathVariable Long paymentId) {
        return PaymentResponse.from(checkoutService.getPayment(paymentId));
    }

    @PutMapping("/{paymentId}/status")
    public PaymentResponse updatePaymentStatus(
            @PathVariable Long paymentId,
            @Valid @RequestBody UpdatePaymentStatusRequest request,
            @AuthenticationPrincipal UserDetails principal,
            HttpServletRequest servletRequest
    ) {
        User actor = principal == null ? null : userService.findByUsername(principal.getUsername()).orElse(null);
        return PaymentResponse.from(checkoutService.updatePaymentStatus(
                paymentId, request.status(), servletRequest.getRemoteAddr(), actor));
    }

    @DeleteMapping("/{paymentId}")
    public PaymentResponse cancelPayment(
            @PathVariable Long paymentId,
            @AuthenticationPrincipal UserDetails principal,
            HttpServletRequest servletRequest
    ) {
        User actor = principal == null ? null : userService.findByUsername(principal.getUsername()).orElse(null);
        return PaymentResponse.from(checkoutService.updatePaymentStatus(
                paymentId, "CANCELLED", servletRequest.getRemoteAddr(), actor));
    }

    public record UpdatePaymentStatusRequest(
            @Pattern(regexp = "PAID|FAILED|CANCELLED") String status
    ) {
    }
}
