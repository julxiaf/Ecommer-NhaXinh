package vn.nhaxinh.inventory;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface InventoryMovementRepository extends JpaRepository<InventoryMovement, Long> {

    List<InventoryMovement> findByVariantIdOrderByCreatedAtDesc(Long variantId);

    List<InventoryMovement> findByReferenceTypeAndReferenceId(String referenceType, Long referenceId);
}
