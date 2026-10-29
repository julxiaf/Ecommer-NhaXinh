package vn.nhaxinh.inventory;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.MapsId;
import jakarta.persistence.OneToOne;
import jakarta.persistence.PostLoad;
import jakarta.persistence.PostPersist;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import jakarta.persistence.Transient;
import java.time.LocalDateTime;
import org.springframework.data.domain.Persistable;
import vn.nhaxinh.catalog.ProductVariant;

@Entity
@Table(name = "inventory")
public class Inventory implements Persistable<Long> {

    @Id
    @Column(name = "variant_id")
    private Long variantId;

    @OneToOne(fetch = FetchType.LAZY)
    @MapsId
    @JoinColumn(name = "variant_id")
    private ProductVariant variant;

    @Transient
    private boolean isNew = true;

    @Column(name = "quantity_on_hand", nullable = false)
    private Integer quantityOnHand = 0;

    @Column(name = "quantity_reserved", nullable = false)
    private Integer quantityReserved = 0;

    @Column(name = "reorder_level", nullable = false)
    private Integer reorderLevel = 0;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    public Inventory() {
    }

    public Inventory(ProductVariant variant, Integer quantityOnHand, Integer quantityReserved, Integer reorderLevel) {
        this.variant = variant;
        if (variant != null) {
            this.variantId = variant.getId();
        }
        this.quantityOnHand = quantityOnHand != null ? quantityOnHand : 0;
        this.quantityReserved = quantityReserved != null ? quantityReserved : 0;
        this.reorderLevel = reorderLevel != null ? reorderLevel : 0;
        this.isNew = true;
    }

    @Override
    public Long getId() {
        return variantId;
    }

    @Override
    public boolean isNew() {
        return isNew;
    }

    @PostLoad
    @PostPersist
    void markNotNew() {
        this.isNew = false;
    }

    public void setIsNew(boolean isNew) {
        this.isNew = isNew;
    }

    @PrePersist
    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
        if (quantityOnHand == null) {
            quantityOnHand = 0;
        }
        if (quantityReserved == null) {
            quantityReserved = 0;
        }
        if (reorderLevel == null) {
            reorderLevel = 0;
        }
    }

    public Integer getAvailableQuantity() {
        int onHand = quantityOnHand != null ? quantityOnHand : 0;
        int reserved = quantityReserved != null ? quantityReserved : 0;
        return Math.max(0, onHand - reserved);
    }

    public Long getVariantId() {
        return variantId;
    }

    public void setVariantId(Long variantId) {
        this.variantId = variantId;
    }

    public ProductVariant getVariant() {
        return variant;
    }

    public void setVariant(ProductVariant variant) {
        this.variant = variant;
        if (variant != null) {
            this.variantId = variant.getId();
        }
    }

    public Integer getQuantityOnHand() {
        return quantityOnHand;
    }

    public void setQuantityOnHand(Integer quantityOnHand) {
        this.quantityOnHand = quantityOnHand;
    }

    public Integer getQuantityReserved() {
        return quantityReserved;
    }

    public void setQuantityReserved(Integer quantityReserved) {
        this.quantityReserved = quantityReserved;
    }

    public Integer getReorderLevel() {
        return reorderLevel;
    }

    public void setReorderLevel(Integer reorderLevel) {
        this.reorderLevel = reorderLevel;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }
}
