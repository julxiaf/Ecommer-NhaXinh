package vn.nhaxinh.catalog;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

public record CategoryRequest(
        @NotBlank @Size(max = 160) String name,
        @NotBlank @Size(max = 180)
        @Pattern(regexp = "[a-z0-9]+(?:-[a-z0-9]+)*", message = "Slug chỉ gồm chữ thường, số và dấu gạch ngang")
        String slug,
        Long parentId,
        @Size(max = 1000) String description,
        @Size(max = 1000) String imageUrl,
        @PositiveOrZero Integer sortOrder,
        Boolean isActive
) {
}
