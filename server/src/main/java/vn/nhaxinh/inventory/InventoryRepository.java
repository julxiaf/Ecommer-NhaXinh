package vn.nhaxinh.inventory;

import java.util.*;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface InventoryRepository extends JpaRepository<Inventory, Long> {

    @Query("SELECT i FROM Inventory i WHERE i.quantityOnHand <= i.reorderLevel")
    List<Inventory> findLowStockInventories();

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT i FROM Inventory i WHERE i.variantId = :variantId")
    Optional<Inventory> findByVariantIdForUpdate(@Param("variantId") Long variantId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT i FROM Inventory i WHERE i.variantId IN :variantIds ORDER BY i.variantId ASC")
    List<Inventory> findAllByVariantIdInForUpdate(@Param("variantIds") Collection<Long> variantIds);
}
