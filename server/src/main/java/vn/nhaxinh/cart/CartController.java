package vn.nhaxinh.cart;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import org.springframework.transaction.annotation.Transactional;
import vn.nhaxinh.catalog.*;
import vn.nhaxinh.controller.BaseController;
import vn.nhaxinh.user.*;

@RestController
@RequestMapping(BaseController.API_V1 + "/cart")
@Transactional
public class CartController extends BaseController {

    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    private final CartService cartService;
    private final ProductVariantRepository variantRepository;
    private final UserService userService;

    public CartController(
            CartService cartService,
            ProductVariantRepository variantRepository,
            UserService userService
    ) {
        this.cartService = cartService;
        this.variantRepository = variantRepository;
        this.userService = userService;
    }

    @PostMapping("/session")
    @ResponseStatus(HttpStatus.CREATED)
    public CartSessionResponse createGuestSession() {
        byte[] token = new byte[32];
        SECURE_RANDOM.nextBytes(token);
        return new CartSessionResponse(Base64.getUrlEncoder().withoutPadding().encodeToString(token));
    }

    @GetMapping
    public CartResponse getCartMe(
            @AuthenticationPrincipal UserDetails principal,
            @RequestHeader(value = "X-Cart-Token", required = false) String token
    ) {
        Cart cart = getCart(principal, token);
        return toResponse(cart);
    }

    @PostMapping("/items")
    @ResponseStatus(HttpStatus.CREATED)
    public CartResponse addItem(
            @AuthenticationPrincipal UserDetails principal,
            @RequestHeader(value = "X-Cart-Token", required = false) String token,
            @Valid @RequestBody AddCartItemRequest request
    ) {
        Cart cart = getCart(principal, token);
        ProductVariant variant = variantRepository.findById(request.variantId())
                .filter(item -> "ACTIVE".equalsIgnoreCase(item.getStatus())
                        && "ACTIVE".equalsIgnoreCase(item.getProduct().getStatus()))
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy sản phẩm đang kinh doanh"));
        cartService.addItem(cart, variant, request.quantity());
        return toResponse(cartService.getCartById(cart.getId()));
    }

    @PatchMapping("/items/{itemId}")
    public CartResponse updateItem(
            @AuthenticationPrincipal UserDetails principal,
            @RequestHeader(value = "X-Cart-Token", required = false) String token,
            @PathVariable Long itemId,
            @Valid @RequestBody UpdateCartItemRequest request
    ) {
        Cart cart = getCart(principal, token);
        cartService.updateItem(cart.getId(), itemId, request.quantity());
        return toResponse(cartService.getCartById(cart.getId()));
    }

    @DeleteMapping("/items/{itemId}")
    public CartResponse removeItem(
            @AuthenticationPrincipal UserDetails principal,
            @RequestHeader(value = "X-Cart-Token", required = false) String token,
            @PathVariable Long itemId
    ) {
        Cart cart = getCart(principal, token);
        cartService.removeItem(cart.getId(), itemId);
        return toResponse(cartService.getCartById(cart.getId()));
    }

    @DeleteMapping("/items")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void clearCart(
            @AuthenticationPrincipal UserDetails principal,
            @RequestHeader(value = "X-Cart-Token", required = false) String token
    ) {
        Cart cart = getCart(principal, token);
        cartService.clearCart(cart.getId());
    }

    private Cart getCart(UserDetails principal, String token) {
        if (principal != null) {
            User user = userService.findByUsername(principal.getUsername())
                    .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy tài khoản"));
            return cartService.getOrCreateCart(user, null);
        }
        if (token == null || token.length() < 40 || token.length() > 128) {
            throw new IllegalArgumentException("Thiếu hoặc sai X-Cart-Token");
        }
        return cartService.getOrCreateCart(null, token);
    }

    private CartResponse toResponse(Cart cart) {
        var items = cartService.getItemResponses(cart.getId());
        return new CartResponse(cart.getId(), cart.getStatus(), items);
    }

    public record CartSessionResponse(String cartToken) {
    }

    public record AddCartItemRequest(@NotNull @Positive Long variantId, @NotNull @Positive Integer quantity) {
    }

    public record UpdateCartItemRequest(@NotNull @Positive Integer quantity) {
    }

    public record CartResponse(Long id, String status, List<CartItemResponse> items) {
    }

    public record CartItemResponse(
            Long id,
            Long variantId,
            String sku,
            String productName,
            String variantName,
            java.math.BigDecimal unitPrice,
            Integer quantity,
            java.math.BigDecimal lineTotal
    ) {
    }
}
