package vn.nhaxinh.order;

import static org.junit.jupiter.api.Assertions.*;

import java.lang.reflect.Proxy;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import vn.nhaxinh.security.ApiErrorCode;
import vn.nhaxinh.security.ApiException;
import vn.nhaxinh.user.User;

class OrderStatusStateMachineTest {

    private OrderRepository orderRepository;
    private OrderItemRepository orderItemRepository;
    private OrderStatusHistoryRepository statusHistoryRepository;
    private OrderDepositRepository depositRepository;
    private OrderService orderService;

    private Order testOrder;
    private List<OrderStatusHistory> savedHistories;

    @BeforeEach
    void setUp() {
        savedHistories = new ArrayList<>();
        testOrder = new Order();
        testOrder.setId(100L);
        testOrder.setOrderCode("NX_TEST_001");
        testOrder.setOrderStatus("PENDING");

        // Dynamic Proxy để tránh cần Mockito Java agent
        orderRepository = (OrderRepository) Proxy.newProxyInstance(
                OrderRepository.class.getClassLoader(),
                new Class<?>[]{OrderRepository.class},
                (proxy, method, args) -> {
                    if ("findById".equals(method.getName())) {
                        return Optional.ofNullable(testOrder);
                    }
                    if ("save".equals(method.getName()) && args != null && args.length > 0) {
                        return args[0];
                    }
                    return null;
                }
        );

        statusHistoryRepository = (OrderStatusHistoryRepository) Proxy.newProxyInstance(
                OrderStatusHistoryRepository.class.getClassLoader(),
                new Class<?>[]{OrderStatusHistoryRepository.class},
                (proxy, method, args) -> {
                    if ("save".equals(method.getName()) && args != null && args.length > 0) {
                        savedHistories.add((OrderStatusHistory) args[0]);
                        return args[0];
                    }
                    return null;
                }
        );

        orderItemRepository = (OrderItemRepository) Proxy.newProxyInstance(
                OrderItemRepository.class.getClassLoader(),
                new Class<?>[]{OrderItemRepository.class},
                (proxy, method, args) -> List.of()
        );

        depositRepository = (OrderDepositRepository) Proxy.newProxyInstance(
                OrderDepositRepository.class.getClassLoader(),
                new Class<?>[]{OrderDepositRepository.class},
                (proxy, method, args) -> Optional.empty()
        );

        orderService = new OrderService(
                orderRepository,
                orderItemRepository,
                statusHistoryRepository,
                depositRepository,
                null,
                null
        );
    }

    @Test
    @DisplayName("Kiểm tra sơ đồ chuyển đổi trạng thái hợp lệ (State Machine Rules)")
    void testValidTransitions() {
        // PENDING -> CONFIRMED, CANCELLED
        assertTrue(OrderService.isValidTransition("PENDING", "CONFIRMED"));
        assertTrue(OrderService.isValidTransition("PENDING", "CANCELLED"));
        assertFalse(OrderService.isValidTransition("PENDING", "PROCESSING"));
        assertFalse(OrderService.isValidTransition("PENDING", "SHIPPING"));
        assertFalse(OrderService.isValidTransition("PENDING", "COMPLETED"));
        assertFalse(OrderService.isValidTransition("PENDING", "PENDING"));

        // CONFIRMED -> PROCESSING, CANCELLED
        assertTrue(OrderService.isValidTransition("CONFIRMED", "PROCESSING"));
        assertTrue(OrderService.isValidTransition("CONFIRMED", "CANCELLED"));
        assertFalse(OrderService.isValidTransition("CONFIRMED", "PENDING"));
        assertFalse(OrderService.isValidTransition("CONFIRMED", "SHIPPING"));
        assertFalse(OrderService.isValidTransition("CONFIRMED", "COMPLETED"));

        // PROCESSING -> SHIPPING, CANCELLED
        assertTrue(OrderService.isValidTransition("PROCESSING", "SHIPPING"));
        assertTrue(OrderService.isValidTransition("PROCESSING", "CANCELLED"));
        assertFalse(OrderService.isValidTransition("PROCESSING", "PENDING"));
        assertFalse(OrderService.isValidTransition("PROCESSING", "CONFIRMED"));
        assertFalse(OrderService.isValidTransition("PROCESSING", "COMPLETED"));

        // SHIPPING -> COMPLETED
        assertTrue(OrderService.isValidTransition("SHIPPING", "COMPLETED"));
        assertFalse(OrderService.isValidTransition("SHIPPING", "CANCELLED"));
        assertFalse(OrderService.isValidTransition("SHIPPING", "PENDING"));
        assertFalse(OrderService.isValidTransition("SHIPPING", "CONFIRMED"));
        assertFalse(OrderService.isValidTransition("SHIPPING", "PROCESSING"));

        // COMPLETED -> Locked
        assertFalse(OrderService.isValidTransition("COMPLETED", "PENDING"));
        assertFalse(OrderService.isValidTransition("COMPLETED", "CONFIRMED"));
        assertFalse(OrderService.isValidTransition("COMPLETED", "PROCESSING"));
        assertFalse(OrderService.isValidTransition("COMPLETED", "SHIPPING"));
        assertFalse(OrderService.isValidTransition("COMPLETED", "CANCELLED"));
        assertFalse(OrderService.isValidTransition("COMPLETED", "COMPLETED"));

        // CANCELLED -> Locked
        assertFalse(OrderService.isValidTransition("CANCELLED", "PENDING"));
        assertFalse(OrderService.isValidTransition("CANCELLED", "CONFIRMED"));
        assertFalse(OrderService.isValidTransition("CANCELLED", "PROCESSING"));
        assertFalse(OrderService.isValidTransition("CANCELLED", "SHIPPING"));
        assertFalse(OrderService.isValidTransition("CANCELLED", "COMPLETED"));
        assertFalse(OrderService.isValidTransition("CANCELLED", "CANCELLED"));
    }

    @Test
    @DisplayName("Ném lỗi ApiException khi cố tình nhảy cóc trạng thái (PENDING -> COMPLETED)")
    void testJumpTransitionRejection() {
        testOrder.setOrderStatus("PENDING");

        ApiException ex = assertThrows(ApiException.class, () -> {
            orderService.updateStatus(100L, "COMPLETED", "Nhảy cóc trạng thái", null);
        });

        assertEquals(ApiErrorCode.VALIDATION_FAILED, ex.getErrorCode());
        assertEquals("Invalid status transition from PENDING to COMPLETED", ex.getCustomMessage());
    }

    @Test
    @DisplayName("Ném lỗi ApiException khi cố tình hủy đơn hàng đang giao (SHIPPING -> CANCELLED)")
    void testCancelShippingRejection() {
        testOrder.setOrderStatus("SHIPPING");

        ApiException ex = assertThrows(ApiException.class, () -> {
            orderService.updateStatus(100L, "CANCELLED", "Hủy khi đang giao", null);
        });

        assertEquals(ApiErrorCode.VALIDATION_FAILED, ex.getErrorCode());
        assertEquals("Invalid status transition from SHIPPING to CANCELLED", ex.getCustomMessage());
    }

    @Test
    @DisplayName("Ghi nhật ký OrderStatusHistory khi chuyển trạng thái thành công")
    void testValidTransitionSavesHistory() {
        testOrder.setOrderStatus("PENDING");

        User staff = new User();
        staff.setUsername("admin_tester");

        Order updated = orderService.updateStatus(100L, "CONFIRMED", "Đã xác nhận đơn hàng qua điện thoại", staff);

        assertEquals("CONFIRMED", updated.getOrderStatus());
        assertEquals(1, savedHistories.size());

        OrderStatusHistory history = savedHistories.get(0);
        assertEquals("PENDING", history.getOldStatus());
        assertEquals("CONFIRMED", history.getNewStatus());
        assertEquals("NX_TEST_001", history.getOrderCode());
        assertEquals(staff, history.getChangedBy());
    }
}
