package vn.nhaxinh.inventory;

import java.util.Collection;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.function.Function;
import java.util.stream.Collectors;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class InventoryService {

    private final InventoryRepository inventoryRepository;
    private final InventoryMovementRepository movementRepository;

    @PersistenceContext
    private EntityManager entityManager;

    public InventoryService(InventoryRepository inventoryRepository, InventoryMovementRepository movementRepository) {
        this.inventoryRepository = inventoryRepository;
        this.movementRepository = movementRepository;
    }

    @Transactional(readOnly = true)
    public Optional<Inventory> findByVariantId(Long variantId) {
        return inventoryRepository.findById(variantId);
    }

    public Optional<Inventory> findByVariantIdForUpdate(Long variantId) {
        return inventoryRepository.findByVariantIdForUpdate(variantId);
    }

    public Map<Long, Inventory> findAllByVariantIdsForUpdate(Collection<Long> variantIds) {
        if (variantIds == null || variantIds.isEmpty()) {
            return Collections.emptyMap();
        }
        List<Long> sortedIds = variantIds.stream().distinct().sorted().toList();
        return inventoryRepository.findAllByVariantIdInForUpdate(sortedIds).stream()
                .collect(Collectors.toMap(Inventory::getVariantId, Function.identity()));
    }

    @Transactional(readOnly = true)
    public List<Inventory> findLowStock() {
        return inventoryRepository.findLowStockInventories();
    }

    public Inventory save(Inventory inventory) {
        if (!inventory.isNew()) {
            return entityManager.merge(inventory);
        }
        Long variantId = inventory.getVariantId();
        if (variantId != null && inventoryRepository.existsById(variantId)) {
            inventory.setIsNew(false);
            return entityManager.merge(inventory);
        } else {
            inventory.setIsNew(true);
            entityManager.persist(inventory);
            return inventory;
        }
    }

    public List<Inventory> saveAll(Iterable<Inventory> inventories) {
        return inventoryRepository.saveAll(inventories);
    }

    public InventoryMovement recordMovement(InventoryMovement movement) {
        return movementRepository.save(movement);
    }

    public List<InventoryMovement> recordMovements(Iterable<InventoryMovement> movements) {
        return movementRepository.saveAll(movements);
    }

    @Transactional(readOnly = true)
    public List<InventoryMovement> getMovementsByVariant(Long variantId) {
        return movementRepository.findByVariantIdOrderByCreatedAtDesc(variantId);
    }
}
