package vn.nhaxinh.order;

import static org.junit.jupiter.api.Assertions.*;

import java.lang.reflect.Proxy;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import vn.nhaxinh.catalog.ProductVariant;
import vn.nhaxinh.inventory.Inventory;
import vn.nhaxinh.inventory.InventoryMovement;
import vn.nhaxinh.inventory.InventoryRepository;
import vn.nhaxinh.inventory.InventoryMovementRepository;
import vn.nhaxinh.inventory.InventoryService;
import vn.nhaxinh.user.User;

class OrderInventoryReleaseTest {

    private OrderRepository orderRepository;
    private OrderItemRepository orderItemRepository;
    private OrderStatusHistoryRepository statusHistoryRepository;
    private OrderDepositRepository depositRepository;
    private InventoryService inventoryService;
    private OrderService orderService;

    private Order testOrder;
    private OrderItem testItem;
    private ProductVariant testVariant;
    private Inventory testInventory;

    private List<Inventory> savedInventories;
    private List<InventoryMovement> recordedMovements;

    @BeforeEach
    void setUp() {
        savedInventories = new ArrayList<>();
        recordedMovements = new ArrayList<>();

        testVariant = new ProductVariant();
        testVariant.setId(55L);
        testVariant.setSku("NX-SOFA-001");

        testInventory = new Inventory(testVariant, 10, 4, 2);
        testInventory.setVariantId(55L);

        testOrder = new Order();
        testOrder.setId(200L);
        testOrder.setOrderCode("NX_ORDER_RELEASE_TEST");
        testOrder.setOrderStatus("PENDING");

        testItem = new OrderItem();
        testItem.setId(301L);
        testItem.setOrder(testOrder);
        testItem.setVariant(testVariant);
        testItem.setQuantity(2);

        // Dynamic Proxy cho OrderRepository
        orderRepository = (OrderRepository) Proxy.newProxyInstance(
                OrderRepository.class.getClassLoader(),
                new Class<?>[]{OrderRepository.class},
                (proxy, method, args) -> {
                    if ("findById".equals(method.getName())) {
                        return Optional.ofNullable(testOrder);
                    }
                    if ("findByOrderCode".equals(method.getName())) {
                        return Optional.ofNullable(testOrder);
                    }
                    if ("save".equals(method.getName()) && args != null && args.length > 0) {
                        return args[0];
                    }
                    return null;
                }
        );

        // Dynamic Proxy cho OrderItemRepository
        orderItemRepository = (OrderItemRepository) Proxy.newProxyInstance(
                OrderItemRepository.class.getClassLoader(),
                new Class<?>[]{OrderItemRepository.class},
                (proxy, method, args) -> {
                    if ("findByOrderId".equals(method.getName())) {
                        return List.of(testItem);
                    }
                    return List.of();
                }
        );

        statusHistoryRepository = (OrderStatusHistoryRepository) Proxy.newProxyInstance(
                OrderStatusHistoryRepository.class.getClassLoader(),
                new Class<?>[]{OrderStatusHistoryRepository.class},
                (proxy, method, args) -> {
                    if ("save".equals(method.getName()) && args != null && args.length > 0) {
                        return args[0];
                    }
                    return null;
                }
        );

        depositRepository = (OrderDepositRepository) Proxy.newProxyInstance(
                OrderDepositRepository.class.getClassLoader(),
                new Class<?>[]{OrderDepositRepository.class},
                (proxy, method, args) -> Optional.empty()
        );

        // Tạo custom subclass của InventoryService để giả lập lưu kho
        InventoryRepository mockInvRepo = (InventoryRepository) Proxy.newProxyInstance(
                InventoryRepository.class.getClassLoader(),
                new Class<?>[]{InventoryRepository.class},
                (proxy, method, args) -> null
        );
        InventoryMovementRepository mockMovRepo = (InventoryMovementRepository) Proxy.newProxyInstance(
                InventoryMovementRepository.class.getClassLoader(),
                new Class<?>[]{InventoryMovementRepository.class},
                (proxy, method, args) -> null
        );

        inventoryService = new InventoryService(mockInvRepo, mockMovRepo) {
            @Override
            public Map<Long, Inventory> findAllByVariantIdsForUpdate(java.util.Collection<Long> variantIds) {
                return Map.of(55L, testInventory);
            }

            @Override
            public List<Inventory> saveAll(Iterable<Inventory> inventories) {
                List<Inventory> result = new ArrayList<>();
                inventories.forEach(inv -> {
                    savedInventories.add(inv);
                    result.add(inv);
                });
                return result;
            }

            @Override
            public List<InventoryMovement> recordMovements(Iterable<InventoryMovement> movements) {
                List<InventoryMovement> result = new ArrayList<>();
                movements.forEach(m -> {
                    recordedMovements.add(m);
                    result.add(m);
                });
                return result;
            }
        };

        orderService = new OrderService(
                orderRepository,
                orderItemRepository,
                statusHistoryRepository,
                depositRepository,
                null,
                null,
                inventoryService
        );
    }

    @Test
    @DisplayName("Khách hàng hủy đơn hàng (cancelOrder) -> Tự động giảm quantityReserved và ghi nhận biến động RELEASE")
    void testCancelOrderReleasesInventory() {
        assertEquals(4, testInventory.getQuantityReserved(), "Số lượng giữ chỗ ban đầu phải là 4");

        Order cancelled = orderService.cancelOrder(
                "NX_ORDER_RELEASE_TEST",
                "Không còn nhu cầu mua",
                null,
                "customer123",
                null,
                null,
                true // isStaffOrAdmin
        );

        assertEquals("CANCELLED", cancelled.getOrderStatus());
        assertEquals(2, testInventory.getQuantityReserved(), "Số lượng giữ chỗ phải giảm từ 4 xuống 2 (4 - 2)");

        assertEquals(1, recordedMovements.size(), "Phải ghi nhận đúng 1 lượt biến động kho");
        InventoryMovement movement = recordedMovements.get(0);
        assertEquals("RELEASE", movement.getMovementType(), "Loại biến động phải là RELEASE");
        assertEquals(2, movement.getQuantity(), "Số lượng giải phóng phải là 2");
        assertEquals(200L, movement.getReferenceId(), "ReferenceId phải là ID đơn hàng");
    }

    @Test
    @DisplayName("Admin cập nhật trạng thái đơn sang CANCELLED (updateStatus) -> Tự động giải phóng tồn kho giữ chỗ")
    void testUpdateStatusToCancelledReleasesInventory() {
        testOrder.setOrderStatus("CONFIRMED");
        assertEquals(4, testInventory.getQuantityReserved());

        User adminUser = new User();
        adminUser.setUsername("admin_lead");

        Order updated = orderService.updateStatus(200L, "CANCELLED", "Hết hàng nguồn cung ứng", adminUser);

        assertEquals("CANCELLED", updated.getOrderStatus());
        assertEquals(2, testInventory.getQuantityReserved(), "Số lượng giữ chỗ phải giảm 2");

        assertEquals(1, recordedMovements.size());
        InventoryMovement m = recordedMovements.get(0);
        assertEquals("RELEASE", m.getMovementType());
        assertEquals(2, m.getQuantity());
    }

    @Test
    @DisplayName("Admin chuyển trạng thái không phải CANCELLED (CONFIRMED -> PROCESSING) -> Không giải phóng tồn kho")
    void testOtherTransitionsDoNotReleaseInventory() {
        testOrder.setOrderStatus("CONFIRMED");
        assertEquals(4, testInventory.getQuantityReserved());

        orderService.updateStatus(200L, "PROCESSING", "Bắt đầu đóng gói", null);

        assertEquals(4, testInventory.getQuantityReserved(), "Số lượng giữ chỗ không được đổi khi chuyển PROCESSING");
        assertEquals(0, recordedMovements.size(), "Không được ghi nhận biến động RELEASE");
    }
}
