package vn.nhaxinh.cart;

import ch.qos.logback.classic.Level;
import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import java.lang.reflect.Proxy;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import vn.nhaxinh.catalog.Product;
import vn.nhaxinh.catalog.ProductVariant;
import vn.nhaxinh.inventory.Inventory;
import vn.nhaxinh.inventory.InventoryService;
import vn.nhaxinh.user.User;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;

/**
 * Unit + concurrency test cho CartService.
 * Dùng JDK Dynamic Proxy (không cần Mockito agent) và Logback ListAppender để kiểm tra log.
 */
class CartServiceConcurrentTest {

    private static final String FULL_SESSION_TOKEN = "54EMDWAc9UmNtu9Oq3-VCO_iH0UTogblirWyInt52MA";
    private static final String EXPECTED_MASKED_TOKEN = "54EMDW***";

    private Logger cartLogger;
    private ListAppender<ILoggingEvent> listAppender;

    @BeforeEach
    void setUp() {
        cartLogger = (Logger) LoggerFactory.getLogger(CartService.class);
        listAppender = new ListAppender<>();
        listAppender.start();
        cartLogger.addAppender(listAppender);
    }

    @AfterEach
    void tearDown() {
        cartLogger.detachAppender(listAppender);
    }

    @Test
    @DisplayName("Mua lần 2 cùng session_token: giỏ cũ token=NULL, giỏ mới ACTIVE, không lỗi")
    void secondPurchaseWithSameToken_success() {
        Cart oldCart = new Cart();
        oldCart.setId(101L);
        oldCart.setStatus("CONVERTED");
        oldCart.setSessionToken(null); // đã nhả token khi checkout

        Cart newActiveCart = new Cart();
        newActiveCart.setId(102L);
        newActiveCart.setStatus("ACTIVE");
        newActiveCart.setSessionToken(FULL_SESSION_TOKEN);

        CartRepository repo = (CartRepository) Proxy.newProxyInstance(
                CartRepository.class.getClassLoader(), new Class<?>[]{CartRepository.class},
                (proxy, method, args) -> switch (method.getName()) {
                    case "findBySessionTokenAndStatus" -> Optional.empty();
                    case "findBySessionToken" -> Collections.emptyList();
                    default -> null;
                });

        CartCreator creator = new CartCreator(repo) {
            @Override
            public Cart createCart(User user, String sessionToken) {
                return newActiveCart;
            }
        };

        Cart cart = new CartService(repo, null, null, creator).getOrCreateCart(null, FULL_SESSION_TOKEN);

        assertEquals(102L, cart.getId());
        assertEquals("ACTIVE", cart.getStatus());
        assertNull(oldCart.getSessionToken());
        assertThat(listAppender.list.stream().anyMatch(e -> e.getFormattedMessage().contains(FULL_SESSION_TOKEN))).isFalse();
        assertThat(listAppender.list.stream().anyMatch(e -> e.getFormattedMessage().contains(EXPECTED_MASKED_TOKEN))).isTrue();
    }

    @Test
    @DisplayName("10 luồng song song cùng token: chỉ 1 giỏ ACTIVE, không exception, có WARN race-condition")
    void concurrentGetOrCreateCart_10Threads() throws Exception {
        int threadCount = 10;
        ExecutorService executor = Executors.newFixedThreadPool(threadCount);
        CountDownLatch ready = new CountDownLatch(threadCount);
        CountDownLatch start = new CountDownLatch(1);

        Cart shared = new Cart();
        shared.setId(501L);
        shared.setStatus("ACTIVE");
        shared.setSessionToken(FULL_SESSION_TOKEN);

        AtomicBoolean created = new AtomicBoolean(false);
        AtomicReference<Cart> active = new AtomicReference<>();

        CartRepository repo = (CartRepository) Proxy.newProxyInstance(
                CartRepository.class.getClassLoader(), new Class<?>[]{CartRepository.class},
                (proxy, method, args) -> switch (method.getName()) {
                    case "findBySessionTokenAndStatus" -> Optional.ofNullable(active.get());
                    case "findBySessionToken" -> Collections.emptyList();
                    default -> null;
                });

        // Mô phỏng unique constraint: đúng 1 luồng insert thành công, các luồng còn lại bị trùng
        CartCreator creator = new CartCreator(repo) {
            @Override
            public Cart createCart(User user, String sessionToken) {
                if (created.compareAndSet(false, true)) {
                    active.set(shared);
                    return shared;
                }
                throw new DataIntegrityViolationException(
                        "Duplicate entry '" + FULL_SESSION_TOKEN + "' for key 'carts.uq_carts_session_token'");
            }
        };
        CartService service = new CartService(repo, null, null, creator);

        List<Future<Cart>> futures = new ArrayList<>();
        for (int i = 0; i < threadCount; i++) {
            futures.add(executor.submit(() -> {
                ready.countDown();
                start.await();
                return service.getOrCreateCart(null, FULL_SESSION_TOKEN);
            }));
        }
        ready.await(5, TimeUnit.SECONDS);
        start.countDown();

        for (Future<Cart> f : futures) {
            Cart c = assertDoesNotThrow(() -> f.get(5, TimeUnit.SECONDS));
            assertNotNull(c);
            assertEquals(501L, c.getId());
        }
        executor.shutdown();

        List<ILoggingEvent> events = listAppender.list;
        assertThat(events.stream().anyMatch(e -> e.getFormattedMessage().contains(FULL_SESSION_TOKEN))).isFalse();
        assertThat(events.stream().anyMatch(e -> e.getLevel() == Level.WARN
                && e.getFormattedMessage().contains("Gặp DataIntegrityViolationException khi tạo giỏ"))).isTrue();
    }

    @Test
    @DisplayName("addItem: log INFO đúng quy chuẩn, không lộ token")
    void addItem_logsAppropriately() {
        Cart cart = new Cart();
        cart.setId(201L);
        cart.setStatus("ACTIVE");
        cart.setSessionToken(FULL_SESSION_TOKEN);

        Product product = new Product();
        product.setId(10L);
        product.setName("Sofa");
        product.setStatus("ACTIVE");

        ProductVariant variant = new ProductVariant();
        variant.setId(25L);
        variant.setName("Nâu");
        variant.setProduct(product);
        variant.setStatus("ACTIVE");

        Inventory inventory = new Inventory(variant, 50, 0, 0);

        CartItemRepository itemRepo = (CartItemRepository) Proxy.newProxyInstance(
                CartItemRepository.class.getClassLoader(), new Class<?>[]{CartItemRepository.class},
                (proxy, method, args) -> switch (method.getName()) {
                    case "findByCartIdAndVariantId" -> Optional.empty();
                    case "save" -> args[0];
                    case "findByCartId" -> List.of(new CartItem(cart, variant, 2));
                    default -> null;
                });

        InventoryService inventoryService = new InventoryService(null, null) {
            @Override
            public Optional<Inventory> findByVariantId(Long variantId) {
                return Optional.of(inventory);
            }
        };

        CartItem item = new CartService(null, itemRepo, inventoryService, null).addItem(cart, variant, 2);

        assertEquals(2, item.getQuantity());
        List<ILoggingEvent> events = listAppender.list;
        assertThat(events.stream().anyMatch(e -> e.getFormattedMessage().contains(
                "[CART] Nhận request thêm sản phẩm: productId=10, quantity=2, cartId=201, tokenMasked=" + EXPECTED_MASKED_TOKEN))).isTrue();
        assertThat(events.stream().anyMatch(e -> e.getFormattedMessage().contains(
                "[CART] Thêm thành công: cartId=201, tổng số dòng item sau khi thêm=1"))).isTrue();
        assertThat(events.stream().anyMatch(e -> e.getFormattedMessage().contains(FULL_SESSION_TOKEN))).isFalse();
    }
}

