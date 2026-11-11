package vn.nhaxinh.cart;

import java.util.Optional;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.nhaxinh.catalog.ProductMedia;
import vn.nhaxinh.catalog.ProductVariant;
import vn.nhaxinh.inventory.InventoryService;
import vn.nhaxinh.user.User;

@Service
@Transactional
public class CartService {

    private static final Logger log = LoggerFactory.getLogger(CartService.class);

    private final CartRepository cartRepository;
    private final CartItemRepository itemRepository;
    private final InventoryService inventoryService;
    private final CartCreator cartCreator;

    public CartService(
            CartRepository cartRepository,
            CartItemRepository itemRepository,
            InventoryService inventoryService,
            CartCreator cartCreator
    ) {
        this.cartRepository = cartRepository;
        this.itemRepository = itemRepository;
        this.inventoryService = inventoryService;
        this.cartCreator = cartCreator;
    }

    @Transactional(readOnly = true)
    public Optional<Cart> getActiveCartByUser(Long userId) {
        return cartRepository.findByUserIdAndStatus(userId, "ACTIVE");
    }

    @Transactional(readOnly = true)
    public Optional<Cart> getActiveCartBySession(String sessionToken) {
        return cartRepository.findBySessionTokenAndStatus(sessionToken, "ACTIVE");
    }

    /**
     * Tra cứu hoặc khởi tạo giỏ hàng ACTIVE (an toàn khi chạy song song).
     * 1. Tìm giỏ ACTIVE trước (theo userId nếu đã đăng nhập, ngược lại theo sessionToken).
     * 2. Nếu chưa có, tạo qua CartCreator trong transaction riêng (REQUIRES_NEW).
     * 3. Nếu request song song đã tạo trước (DataIntegrityViolationException) thì tìm lại giỏ ACTIVE đó;
     *    nếu vẫn không thấy thì ném lại exception.
     * 4. Giỏ của user đã đăng nhập không lưu session_token.
     */
    public Cart getOrCreateCart(User user, String sessionToken) {
        Long userId = user != null ? user.getId() : null;
        String tokenMasked = CartLoggingHelper.maskToken(sessionToken);

        Optional<Cart> existing = findActiveCart(userId, sessionToken);
        if (existing.isPresent()) {
            Cart found = existing.get();
            log.debug("[CART] Tra cứu giỏ: userId={}, tokenMasked={}, found=true, cartId={}, status={}",
                    userId, tokenMasked, found.getId(), found.getStatus());
            return found;
        }
        log.debug("[CART] Tra cứu giỏ: userId={}, tokenMasked={}, found=false", userId, tokenMasked);

        // Chẩn đoán dữ liệu bẩn: giỏ không ACTIVE vẫn giữ token (nguyên nhân bug trùng uq_carts_session_token)
        if (user == null && sessionToken != null && !sessionToken.isBlank()) {
            for (Cart held : cartRepository.findBySessionToken(sessionToken)) {
                if (!CartStatus.ACTIVE.name().equalsIgnoreCase(held.getStatus())) {
                    log.warn("[CART] Token đang bị giỏ không ACTIVE giữ: cartId={}, status={}, tokenMasked={}",
                            held.getId(), held.getStatus(), tokenMasked);
                }
            }
        }

        try {
            Cart created = cartCreator.createCart(user, sessionToken);
            log.info("[CART] Tạo giỏ mới: cartId={}, userId={}, tokenMasked={}", created.getId(), userId, tokenMasked);
            return created;
        } catch (DataIntegrityViolationException ex) {
            Optional<Cart> retry = findActiveCart(userId, sessionToken);
            if (retry.isPresent()) {
                log.warn("[CART] Gặp DataIntegrityViolationException khi tạo giỏ, đã tìm lại được giỏ do request khác tạo: cartId={}, tokenMasked={}",
                        retry.get().getId(), tokenMasked);
                return retry.get();
            }
            log.error("[CART] Lỗi trùng khi tạo giỏ nhưng không tìm thấy giỏ ACTIVE: userId={}, tokenMasked={}",
                    userId, tokenMasked, ex);
            throw ex;
        }
    }

    private Optional<Cart> findActiveCart(Long userId, String sessionToken) {
        if (userId != null) {
            return cartRepository.findByUserIdAndStatus(userId, CartStatus.ACTIVE.name());
        }
        if (sessionToken == null || sessionToken.isBlank()) {
            return Optional.empty();
        }
        return cartRepository.findBySessionTokenAndStatus(sessionToken, CartStatus.ACTIVE.name());
    }

    public CartItem addItem(Cart cart, ProductVariant variant, int quantity) {
        log.info("[CART] Nhận request thêm sản phẩm: productId={}, quantity={}, cartId={}, tokenMasked={}",
                variant.getProduct().getId(), quantity, cart.getId(), CartLoggingHelper.maskToken(cart.getSessionToken()));
        if (quantity <= 0 || quantity > 100) {
            log.warn("[CART] Lỗi nghiệp vụ thêm sản phẩm: số lượng không hợp lệ quantity={}, cartId={}", quantity, cart.getId());
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
                log.warn("[CART] Lỗi nghiệp vụ thêm sản phẩm: hết hàng variantId={}, cartId={}", variant.getId(), cart.getId());
                throw new IllegalArgumentException("Sản phẩm [" + variant.getProduct().getName() + " - " + variant.getName() + "] hiện đã hết hàng, không thể thêm vào giỏ hàng.");
            }

            int currentQtyInCart = itemRepository.findByCartIdAndVariantId(cart.getId(), variant.getId())
                    .map(CartItem::getQuantity)
                    .orElse(0);

            if (currentQtyInCart + quantity > availableStock) {
                log.warn("[CART] Lỗi nghiệp vụ thêm sản phẩm: vượt tồn kho variantId={}, cartId={}, yêuCầu={}, tồnKho={}",
                        variant.getId(), cart.getId(), currentQtyInCart + quantity, availableStock);
                throw new IllegalArgumentException("Số lượng trong giỏ (" + (currentQtyInCart + quantity) + ") vượt quá số lượng tồn kho có sẵn (" + availableStock + " sản phẩm).");
            }
        }

        CartItem saved = itemRepository.findByCartIdAndVariantId(cart.getId(), variant.getId())
                .map(item -> {
                    int updatedQuantity = item.getQuantity() + quantity;
                    if (updatedQuantity > 100) {
                        log.warn("[CART] Lỗi nghiệp vụ thêm sản phẩm: vượt 100 mỗi sản phẩm variantId={}, cartId={}",
                                variant.getId(), cart.getId());
                        throw new IllegalArgumentException("Số lượng mỗi sản phẩm không được vượt quá 100");
                    }
                    item.setQuantity(updatedQuantity);
                    return itemRepository.save(item);
                })
                .orElseGet(() -> itemRepository.save(new CartItem(cart, variant, quantity)));
        log.info("[CART] Thêm thành công: cartId={}, tổng số dòng item sau khi thêm={}",
                cart.getId(), itemRepository.findByCartId(cart.getId()).size());
        return saved;
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
            guestCart.setSessionToken(null);
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
        guestCart.setSessionToken(null);
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
