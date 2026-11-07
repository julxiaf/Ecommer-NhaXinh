package vn.nhaxinh.cart;

import java.util.Optional;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.nhaxinh.catalog.ProductMedia;
import vn.nhaxinh.catalog.ProductVariant;
import vn.nhaxinh.inventory.InventoryService;
import vn.nhaxinh.user.User;

@Service
@Transactional
public class CartService {

    private final CartRepository cartRepository;
    private final CartItemRepository itemRepository;
    private final InventoryService inventoryService;

    public CartService(CartRepository cartRepository, CartItemRepository itemRepository, InventoryService inventoryService) {
        this.cartRepository = cartRepository;
        this.itemRepository = itemRepository;
        this.inventoryService = inventoryService;
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

        // Kiểm tra xem sản phẩm hoặc biến thể có phải hàng đặt trước (Pre-order) hay không
        boolean isPreorder = Boolean.TRUE.equals(variant.getProduct().getIsPreorder())
                || "PRE_ORDER".equalsIgnoreCase(variant.getProduct().getStockStatus());

        // Nếu KHÔNG phải hàng đặt trước, bắt buộc phải kiểm tra tồn kho
        if (!isPreorder) {
            int availableStock = inventoryService.findByVariantId(variant.getId())
                    .map(inv -> Math.max(0, inv.getQuantityOnHand() - inv.getQuantityReserved()))
                    .orElse(0);

            if (availableStock <= 0) {
                throw new IllegalArgumentException("Sản phẩm [" + variant.getProduct().getName() + " - " + variant.getName() + "] hiện đã hết hàng, không thể thêm vào giỏ hàng.");
            }

            int currentQtyInCart = itemRepository.findByCartIdAndVariantId(cart.getId(), variant.getId())
                    .map(CartItem::getQuantity)
                    .orElse(0);

            if (currentQtyInCart + quantity > availableStock) {
                throw new IllegalArgumentException("Số lượng trong giỏ (" + (currentQtyInCart + quantity) + ") vượt quá số lượng tồn kho có sẵn (" + availableStock + " sản phẩm).");
            }
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
                    String imageUrl = null;
                    if (variant.getProduct().getMedia() != null && !variant.getProduct().getMedia().isEmpty()) {
                        imageUrl = variant.getProduct().getMedia().stream()
                                .filter(m -> Boolean.TRUE.equals(m.getIsPrimary()))
                                .map(ProductMedia::getMediaUrl)
                                .findFirst()
                                .orElse(variant.getProduct().getMedia().get(0).getMediaUrl());
                    }
                    boolean isPreorder = Boolean.TRUE.equals(variant.getProduct().getIsPreorder())
                            || "PRE_ORDER".equalsIgnoreCase(variant.getProduct().getStockStatus());
                    int availableStock = inventoryService.findByVariantId(variant.getId())
                            .map(inv -> Math.max(0, inv.getQuantityOnHand() - inv.getQuantityReserved()))
                            .orElse(0);
                    String stockStatus = isPreorder ? "PRE_ORDER" : (availableStock > 0 ? "IN_STOCK" : "OUT_OF_STOCK");

                    return new CartController.CartItemResponse(
                            item.getId(),
                            variant.getProduct().getId(),
                            variant.getProduct().getSlug(),
                            variant.getId(),
                            variant.getSku(),
                            variant.getProduct().getName(),
                            variant.getName(),
                            unitPrice,
                            item.getQuantity(),
                            unitPrice.multiply(java.math.BigDecimal.valueOf(item.getQuantity())),
                            imageUrl,
                            isPreorder,
                            stockStatus,
                            availableStock
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

        ProductVariant variant = item.getVariant();
        boolean isPreorder = Boolean.TRUE.equals(variant.getProduct().getIsPreorder())
                || "PRE_ORDER".equalsIgnoreCase(variant.getProduct().getStockStatus());

        if (!isPreorder) {
            int availableStock = inventoryService.findByVariantId(variant.getId())
                    .map(inv -> Math.max(0, inv.getQuantityOnHand() - inv.getQuantityReserved()))
                    .orElse(0);

            if (quantity > availableStock) {
                throw new IllegalArgumentException("Số lượng yêu cầu (" + quantity + ") vượt quá số lượng tồn kho có sẵn (" + availableStock + " sản phẩm).");
            }
        }

        item.setQuantity(quantity);
    }

    public void removeItem(Long cartId, Long cartItemId) {
        CartItem item = itemRepository.findById(cartItemId)
                .filter(existing -> existing.getCart().getId().equals(cartId))
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy sản phẩm trong giỏ hàng"));
        itemRepository.delete(item);
    }

    public void removeItemByVariant(Long cartId, Long variantId) {
        itemRepository.findByCartIdAndVariantId(cartId, variantId)
                .ifPresent(itemRepository::delete);
    }

    public void mergeGuestCartToUserCart(String guestToken, User user) {
        if (guestToken == null || guestToken.isBlank() || user == null) {
            return;
        }
        Optional<Cart> guestCartOpt = cartRepository.findBySessionTokenAndStatus(guestToken, "ACTIVE");
        if (guestCartOpt.isEmpty()) {
            return;
        }
        Cart guestCart = guestCartOpt.get();
        List<CartItem> guestItems = itemRepository.findByCartId(guestCart.getId());
        if (guestItems.isEmpty()) {
            guestCart.setStatus("CONVERTED");
            cartRepository.save(guestCart);
            return;
        }

        Cart userCart = getOrCreateCart(user, null);
        for (CartItem gi : guestItems) {
            try {
                addItem(userCart, gi.getVariant(), gi.getQuantity());
            } catch (Exception ex) {
                // Bỏ qua nếu sản phẩm trong giỏ tạm bị hết hàng tồn kho khi merge
            }
        }
        guestCart.setStatus("CONVERTED");
        itemRepository.deleteByCartId(guestCart.getId());
        cartRepository.save(guestCart);
    }

    public Cart save(Cart cart) {
        return cartRepository.save(cart);
    }

    public void clearCart(Long cartId) {
        itemRepository.deleteByCartId(cartId);
    }
}
