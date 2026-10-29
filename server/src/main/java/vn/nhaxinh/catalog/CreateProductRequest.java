package vn.nhaxinh.catalog;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.util.List;

public record CreateProductRequest(
        @NotBlank @Size(max = 240) String name,
        @NotBlank @Size(max = 260)
        @Pattern(regexp = "[a-z0-9]+(?:-[a-z0-9]+)*", message = "Slug chỉ gồm chữ thường, số và dấu gạch ngang")
        String slug,
        @Size(max = 600) String shortDescription,
        String description,
        String specifications,
        Long brandId,
        List<@NotNull Long> categoryIds,
        @Pattern(regexp = "DRAFT|ACTIVE") String status,
        @NotEmpty List<@NotNull @Valid VariantRequest> variants,
        List<@NotNull @Valid MediaRequest> media
) {
    public record VariantRequest(
            @NotBlank @Size(max = 100) String sku,
            @NotBlank @Size(max = 180) String name,
            String optionValues,
            @NotNull @DecimalMin(value = "0.0", inclusive = true) BigDecimal price,
            @DecimalMin(value = "0.0", inclusive = true) BigDecimal compareAtPrice,
            @DecimalMin(value = "0.0", inclusive = true) BigDecimal costPrice,
            @jakarta.validation.constraints.PositiveOrZero Integer weightGrams,
            @jakarta.validation.constraints.PositiveOrZero Integer widthMm,
            @jakarta.validation.constraints.PositiveOrZero Integer heightMm,
            @jakarta.validation.constraints.PositiveOrZero Integer depthMm,
            @jakarta.validation.constraints.PositiveOrZero Integer initialStock
    ) {
    }

    public record MediaRequest(
            @NotBlank             @Pattern(regexp = "IMAGE|MODEL_3D") String mediaType,
            @Size(max = 1000) String mediaUrl,
            Integer fileIndex,
            @Size(max = 300) String altText,
            Integer sortOrder,
            Boolean isPrimary
    ) {
    }
}
