package vn.nhaxinh.cart;

import java.util.Optional;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.nhaxinh.catalog.ProductVariant;
import vn.nhaxinh.user.User;

@Service
@Transactional
public class CartService {

    private final CartRepository cartRepository;
    private final CartItemRepository itemRepository;

    public CartService(CartRepository cartRepository, CartItemRepository itemRepository) {
        this.cartRepository = cartRepository;
        this.itemRepository = itemRepository;
    }

    @Transactional(readOnly = true)
    public Optional<Cart> getActiveCartByUser(Long userId) {
        return cartRepository.findByUserIdAndStatus(userId, "ACTIVE");
    }

    @Transactional(readOnly = true)
    public Optional<Cart> getActiveCartBySession(String sessionToken) {
        return cartRepository.findBySessionTokenAndStatus(sessionToken, "ACTIVE");
    }

    public Cart getOrCreateCart(User user, String sessionToken) {
        if (user != null) {
            return cartRepository.findByUserIdAndStatus(user.getId(), "ACTIVE")
                    .orElseGet(() -> {
                        Cart cart = new Cart();
                        cart.setUser(user);
                        cart.setStatus("ACTIVE");
                        return cartRepository.save(cart);
                    });
        }
        return cartRepository.findBySessionTokenAndStatus(sessionToken, "ACTIVE")
                .orElseGet(() -> {
                    Cart cart = new Cart();
                    cart.setSessionToken(sessionToken);
                    cart.setStatus("ACTIVE");
                    return cartRepository.save(cart);
                });
    }

    public CartItem addItem(Cart cart, ProductVariant variant, int quantity) {
        if (quantity <= 0 || quantity > 100) {
            throw new IllegalArgumentException("Số lượng sản phẩm phải từ 1 đến 100");
        }
        return itemRepository.findByCartIdAndVariantId(cart.getId(), variant.getId())
                .map(item -> {
                    int updatedQuantity = item.getQuantity() + quantity;
                    if (updatedQuantity > 100) {
                        throw new IllegalArgumentException("Số lượng mỗi sản phẩm không được vượt quá 100");
                    }
                    item.setQuantity(updatedQuantity);
                    return itemRepository.save(item);
                })
                .orElseGet(() -> itemRepository.save(new CartItem(cart, variant, quantity)));
    }

    public Cart getCartById(Long cartId) {
        return cartRepository.findById(cartId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy giỏ hàng"));
    }

    @Transactional(readOnly = true)
    public List<CartItem> getItems(Long cartId) {
        return itemRepository.findByCartId(cartId);
    }

    @Transactional(readOnly = true)
    public List<CartController.CartItemResponse> getItemResponses(Long cartId) {
        return itemRepository.findByCartId(cartId).stream()
                .map(item -> {
                    ProductVariant variant = item.getVariant();
                    java.math.BigDecimal unitPrice = variant.getPrice();
                    return new CartController.CartItemResponse(
                            item.getId(),
                            variant.getId(),
                            variant.getSku(),
                            variant.getProduct().getName(),
                            variant.getName(),
                            unitPrice,
                            item.getQuantity(),
                            unitPrice.multiply(java.math.BigDecimal.valueOf(item.getQuantity()))
                    );
                })
                .toList();
    }

    public void updateItem(Long cartId, Long cartItemId, int quantity) {
        if (quantity <= 0 || quantity > 100) {
            throw new IllegalArgumentException("Số lượng sản phẩm phải từ 1 đến 100");
        }
        CartItem item = itemRepository.findById(cartItemId)
                .filter(existing -> existing.getCart().getId().equals(cartId))
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy sản phẩm trong giỏ hàng"));
        item.setQuantity(quantity);
    }

    public void removeItem(Long cartId, Long cartItemId) {
        CartItem item = itemRepository.findById(cartItemId)
                .filter(existing -> existing.getCart().getId().equals(cartId))
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy sản phẩm trong giỏ hàng"));
        itemRepository.delete(item);
    }

    public Cart save(Cart cart) {
        return cartRepository.save(cart);
    }

    public void clearCart(Long cartId) {
        itemRepository.deleteByCartId(cartId);
    }
}
