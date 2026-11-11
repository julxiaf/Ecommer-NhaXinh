package vn.nhaxinh.cart;

import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import vn.nhaxinh.user.User;

/**
 * Bean riêng chuyên tạo giỏ hàng trong transaction độc lập (REQUIRES_NEW).
 *
 * Tách thành bean riêng để Spring proxy hoạt động. Khi insert vi phạm unique constraint
 * (race condition), chỉ transaction con bị rollback, transaction ngoài của request vẫn dùng được
 * để tra cứu lại giỏ ACTIVE do request khác vừa tạo.
 */
@Component
public class CartCreator {

    private final CartRepository cartRepository;

    public CartCreator(CartRepository cartRepository) {
        this.cartRepository = cartRepository;
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public Cart createCart(User user, String sessionToken) {
        Cart cart = new Cart();
        cart.setStatus(CartStatus.ACTIVE.name());
        if (user != null) {
            // Giỏ của user đã đăng nhập không lưu session_token
            cart.setUser(user);
            cart.setSessionToken(null);
        } else {
            // Dữ liệu cũ: giỏ không ACTIVE còn giữ token sẽ làm insert bị trùng -> nhả token trong cùng transaction
            if (sessionToken != null && !sessionToken.isBlank()) {
                cartRepository.releaseSessionToken(sessionToken);
            }
            cart.setSessionToken(sessionToken);
        }
        return cartRepository.saveAndFlush(cart);
    }
}
