package vn.nhaxinh.order;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Data Transfer Objects (DTO) cho API Đơn hàng (Order).
 */
public final class OrderDtos {

    private OrderDtos() {}

    // =====================================================================
    // Response DTOs
    // =====================================================================

    public record OrderSummaryResponse(
            Long id,
            String orderCode,
            Long userId,
            String recipientName,
            String recipientPhone,
            String recipientEmail,
            String shippingAddress,
            BigDecimal subtotal,
            BigDecimal discountAmount,
            BigDecimal shippingFee,
            BigDecimal totalAmount,
            String couponCode,
            String orderStatus,
            String paymentStatus,
            String paymentMethod,
            String customerNote,
            LocalDateTime createdAt,
            LocalDateTime updatedAt,
            int totalItems,
            List<OrderItemResponse> items,
            List<StatusHistoryResponse> statusHistory
    ) {
        public static OrderSummaryResponse of(Order o, List<OrderItem> items, List<OrderStatusHistory> history, String paymentMethod) {
            List<OrderItemResponse> itemList = items != null
                    ? items.stream().map(OrderItemResponse::of).toList()
                    : List.of();
            List<StatusHistoryResponse> historyList = history != null
                    ? history.stream().map(StatusHistoryResponse::of).toList()
                    : List.of();

            return new OrderSummaryResponse(
                    o.getId(),
                    o.getOrderCode(),
                    o.getUser() != null ? o.getUser().getId() : null,
                    o.getRecipientName(),
                    o.getRecipientPhone(),
                    o.getRecipientEmail(),
                    o.getShippingAddress(),
                    o.getSubtotal(),
                    o.getDiscountAmount(),
                    o.getShippingFee(),
                    o.getTotalAmount(),
                    o.getCouponCode(),
                    o.getOrderStatus(),
                    o.getPaymentStatus(),
                    paymentMethod != null ? paymentMethod : "CASH_ON_DELIVERY",
                    o.getCustomerNote(),
                    o.getCreatedAt(),
                    o.getUpdatedAt(),
                    itemList.size(),
                    itemList,
                    historyList
            );
        }

        public static OrderSummaryResponse of(Order o, List<OrderItem> items, List<OrderStatusHistory> history) {
            return of(o, items, history, "CASH_ON_DELIVERY");
        }

        public static OrderSummaryResponse of(Order o, String paymentMethod) {
            List<OrderItemResponse> itemList = List.of();
            try {
                if (o.getItems() != null && org.hibernate.Hibernate.isInitialized(o.getItems())) {
                    itemList = o.getItems().stream().map(OrderItemResponse::of).toList();
                }
            } catch (Exception ignored) {}

            List<StatusHistoryResponse> historyList = List.of();
            try {
                if (o.getStatusHistory() != null && org.hibernate.Hibernate.isInitialized(o.getStatusHistory())) {
                    historyList = o.getStatusHistory().stream().map(StatusHistoryResponse::of).toList();
                }
            } catch (Exception ignored) {}

            return new OrderSummaryResponse(
                    o.getId(),
                    o.getOrderCode(),
                    o.getUser() != null ? o.getUser().getId() : null,
                    o.getRecipientName(),
                    o.getRecipientPhone(),
                    o.getRecipientEmail(),
                    o.getShippingAddress(),
                    o.getSubtotal(),
                    o.getDiscountAmount(),
                    o.getShippingFee(),
                    o.getTotalAmount(),
                    o.getCouponCode(),
                    o.getOrderStatus(),
                    o.getPaymentStatus(),
                    paymentMethod != null ? paymentMethod : "CASH_ON_DELIVERY",
                    o.getCustomerNote(),
                    o.getCreatedAt(),
                    o.getUpdatedAt(),
                    itemList.size(),
                    itemList,
                    historyList
            );
        }

        public static OrderSummaryResponse of(Order o) {
            return of(o, "CASH_ON_DELIVERY");
        }
    }

    public record OrderDetailResponse(
            Long id,
            String orderCode,
            Long userId,
            String recipientName,
            String recipientPhone,
            String recipientEmail,
            String shippingAddress,
            BigDecimal subtotal,
            BigDecimal discountAmount,
            BigDecimal shippingFee,
            BigDecimal totalAmount,
            String couponCode,
            String orderStatus,
            String paymentStatus,
            String paymentMethod,
            String customerNote,
            LocalDateTime createdAt,
            LocalDateTime updatedAt,
            List<OrderItemResponse> items,
            List<StatusHistoryResponse> statusHistory,
            DepositResponse deposit
    ) {
        public static OrderDetailResponse of(Order o, List<OrderItem> items, List<OrderStatusHistory> history, OrderDeposit deposit, String paymentMethod) {
            return new OrderDetailResponse(
                    o.getId(),
                    o.getOrderCode(),
                    o.getUser() != null ? o.getUser().getId() : null,
                    o.getRecipientName(),
                    o.getRecipientPhone(),
                    o.getRecipientEmail(),
                    o.getShippingAddress(),
                    o.getSubtotal(),
                    o.getDiscountAmount(),
                    o.getShippingFee(),
                    o.getTotalAmount(),
                    o.getCouponCode(),
                    o.getOrderStatus(),
                    o.getPaymentStatus(),
                    paymentMethod != null ? paymentMethod : "CASH_ON_DELIVERY",
                    o.getCustomerNote(),
                    o.getCreatedAt(),
                    o.getUpdatedAt(),
                    items != null ? items.stream().map(OrderItemResponse::of).toList() : List.of(),
                    history != null ? history.stream().map(StatusHistoryResponse::of).toList() : List.of(),
                    deposit != null ? DepositResponse.of(deposit) : null
            );
        }

        public static OrderDetailResponse of(Order o, List<OrderItem> items, List<OrderStatusHistory> history, OrderDeposit deposit) {
            return of(o, items, history, deposit, "CASH_ON_DELIVERY");
        }
    }

    public record OrderItemResponse(
            Long id,
            Long variantId,
            String sku,
            String productName,
            String variantName,
            String optionValues,
            BigDecimal unitPrice,
            Integer quantity,
            BigDecimal discountAmount,
            BigDecimal lineTotal,
            String image
    ) {
        public static OrderItemResponse of(OrderItem item) {
            String img = null;
            try {
                if (item.getVariant() != null && org.hibernate.Hibernate.isInitialized(item.getVariant())) {
                    var product = item.getVariant().getProduct();
                    if (product != null && org.hibernate.Hibernate.isInitialized(product.getMedia())) {
                        var mediaList = product.getMedia();
                        if (mediaList != null && !mediaList.isEmpty()) {
                            img = mediaList.get(0).getMediaUrl();
                        }
                    }
                }
            } catch (Exception ignored) {}

            return new OrderItemResponse(
                    item.getId(),
                    item.getVariant() != null ? item.getVariant().getId() : null,
                    item.getSku(),
                    item.getProductName(),
                    item.getVariantName(),
                    item.getOptionValues(),
                    item.getUnitPrice(),
                    item.getQuantity(),
                    item.getDiscountAmount(),
                    item.getLineTotal(),
                    img
            );
        }
    }

    public record StatusHistoryResponse(
            Long id,
            String oldStatus,
            String newStatus,
            String note,
            String changedByUsername,
            LocalDateTime createdAt
    ) {
        public static StatusHistoryResponse of(OrderStatusHistory h) {
            String username = "Hệ thống";
            try {
                if (h.getChangedBy() != null) {
                    username = h.getChangedBy().getUsername();
                }
            } catch (Exception ignored) {}
            return new StatusHistoryResponse(
                    h.getId(),
                    h.getOldStatus(),
                    h.getNewStatus(),
                    h.getNote(),
                    username,
                    h.getCreatedAt()
            );
        }
    }

    public record DepositResponse(
            Long id,
            BigDecimal depositRate,
            BigDecimal requiredAmount,
            BigDecimal paidAmount,
            String depositStatus,
            LocalDateTime dueAt,
            LocalDateTime paidAt,
            LocalDateTime createdAt
    ) {
        public static DepositResponse of(OrderDeposit d) {
            return new DepositResponse(
                    d.getId(),
                    d.getDepositRate(),
                    d.getRequiredAmount(),
                    d.getPaidAmount(),
                    d.getDepositStatus(),
                    d.getDueAt(),
                    d.getPaidAt(),
                    d.getCreatedAt()
            );
        }
    }

    // =====================================================================
    // Request DTOs
    // =====================================================================

    public record UpdateOrderStatusRequest(
            @NotBlank(message = "Trạng thái mới không được để trống")
            @Pattern(regexp = "PENDING|CONFIRMED|PROCESSING|SHIPPING|DELIVERED|COMPLETED|CANCELLED|REFUNDED",
                    message = "Trạng thái không hợp lệ (PENDING, CONFIRMED, PROCESSING, SHIPPING, DELIVERED, COMPLETED, CANCELLED, REFUNDED)")
            String status,

            @Size(max = 500, message = "Ghi chú tối đa 500 ký tự")
            String note
    ) {}

    public record UpdateOrderPaymentStatusRequest(
            @NotBlank(message = "Trạng thái thanh toán không được để trống")
            @Pattern(regexp = "UNPAID|PARTIALLY_PAID|PAID|REFUNDED",
                    message = "Trạng thái thanh toán không hợp lệ (UNPAID, PARTIALLY_PAID, PAID, REFUNDED)")
            String paymentStatus,

            String paymentMethod,

            @Size(max = 500, message = "Ghi chú tối đa 500 ký tự")
            String note
    ) {}

    public record UpdateShippingInfoRequest(
            @NotBlank(message = "Tên người nhận không được để trống")
            @Size(max = 180, message = "Tên người nhận tối đa 180 ký tự")
            String recipientName,

            @NotBlank(message = "Số điện thoại không được để trống")
            @Pattern(regexp = "^[0-9+() .-]{8,30}$", message = "Số điện thoại không hợp lệ")
            String recipientPhone,

            @NotBlank(message = "Địa chỉ nhận hàng không được để trống")
            @Size(max = 1000, message = "Địa chỉ nhận hàng tối đa 1000 ký tự")
            String shippingAddress,

            @Size(max = 1000, message = "Ghi chú tối đa 1000 ký tự")
            String customerNote
    ) {}

    public record CancelOrderRequest(
            @NotBlank(message = "Lý do hủy đơn không được để trống")
            @Size(max = 500, message = "Lý do hủy đơn tối đa 500 ký tự")
            String reason
    ) {}
}
