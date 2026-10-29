package vn.nhaxinh.user;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import org.hibernate.annotations.Immutable;

@Entity
@Immutable
@Table(name = "v_customer_summary")
public class CustomerSummary {

    @Id
    private Long id;

    @Column(name = "full_name")
    private String fullName;

    private String phone;

    private String email;

    @Column(name = "account_type")
    private String accountType;

    @Column(name = "marketing_consent")
    private Boolean marketingConsent;

    @Column(name = "total_orders")
    private Long totalOrders;

    @Column(name = "total_spent")
    private BigDecimal totalSpent;

    @Column(name = "first_order_at")
    private LocalDateTime firstOrderAt;

    @Column(name = "last_order_at")
    private LocalDateTime lastOrderAt;

    public CustomerSummary() {
    }

    public Long getId() {
        return id;
    }

    public String getFullName() {
        return fullName;
    }

    public String getPhone() {
        return phone;
    }

    public String getEmail() {
        return email;
    }

    public String getAccountType() {
        return accountType;
    }

    public Boolean getMarketingConsent() {
        return marketingConsent;
    }

    public Long getTotalOrders() {
        return totalOrders;
    }

    public BigDecimal getTotalSpent() {
        return totalSpent;
    }

    public LocalDateTime getFirstOrderAt() {
        return firstOrderAt;
    }

    public LocalDateTime getLastOrderAt() {
        return lastOrderAt;
    }
}
