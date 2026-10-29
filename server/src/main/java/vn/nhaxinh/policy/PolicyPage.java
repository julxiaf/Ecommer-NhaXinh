package vn.nhaxinh.policy;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import java.time.LocalDateTime;

@Entity
@Table(name = "policy_pages")
public class PolicyPage {
    @Id
    private Integer id;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String introduction;

    @Column(name = "purchase_policy", nullable = false, columnDefinition = "LONGTEXT")
    private String purchasePolicy;

    @Column(name = "return_policy", nullable = false, columnDefinition = "LONGTEXT")
    private String returnPolicy;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    public PolicyPage() {
    }

    @PrePersist
    @PreUpdate
    void updateTimestamp() {
        updatedAt = LocalDateTime.now();
    }

    public Integer getId() {
        return id;
    }

    public void setId(Integer id) {
        this.id = id;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getIntroduction() {
        return introduction;
    }

    public void setIntroduction(String introduction) {
        this.introduction = introduction;
    }

    public String getPurchasePolicy() {
        return purchasePolicy;
    }

    public void setPurchasePolicy(String purchasePolicy) {
        this.purchasePolicy = purchasePolicy;
    }

    public String getReturnPolicy() {
        return returnPolicy;
    }

    public void setReturnPolicy(String returnPolicy) {
        this.returnPolicy = returnPolicy;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }
}
