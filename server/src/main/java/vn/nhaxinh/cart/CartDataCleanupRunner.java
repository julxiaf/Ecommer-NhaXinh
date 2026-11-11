package vn.nhaxinh.cart;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Chạy một lần khi khởi động: nhả session_token của các giỏ không còn ACTIVE
 * (tương đương docs/sql/clean_carts_session_token.sql) để dữ liệu cũ không gây
 * vi phạm unique constraint uq_carts_session_token.
 */
@Component
@Order(3)
public class CartDataCleanupRunner implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(CartDataCleanupRunner.class);

    private final CartRepository cartRepository;

    public CartDataCleanupRunner(CartRepository cartRepository) {
        this.cartRepository = cartRepository;
    }

    @Override
    @Transactional
    public void run(String... args) {
        int released = cartRepository.releaseSessionTokensForNonActiveCarts();
        log.info("[CART] Dọn dữ liệu cũ: đã nhả session_token của {} giỏ không ACTIVE", released);
    }
}

