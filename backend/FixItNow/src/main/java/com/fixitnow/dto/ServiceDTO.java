package com.fixitnow.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.*;

import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ServiceDTO {

    private Long categoryId;

    @com.fasterxml.jackson.annotation.JsonAlias("category")
    private String categoryName;

    private Long subcategoryId;

    @com.fasterxml.jackson.annotation.JsonAlias("subcategory")
    private String subcategoryName;

    @Size(max = 1000, message = "Description cannot exceed 1000 characters")
    private String description;

    @NotNull(message = "Price is required")
    @Min(value = 0, message = "Price must be at least 0")
    private BigDecimal price;

    @Size(max = 255, message = "Availability cannot exceed 255 characters")
    private String availability;

    @Size(max = 255, message = "Location cannot exceed 255 characters")
    private String location;

    @DecimalMin(value = "-90.0", message = "Latitude must be between -90 and 90")
    @DecimalMax(value = "90.0", message = "Latitude must be between -90 and 90")
    private BigDecimal latitude;

    @DecimalMin(value = "-180.0", message = "Longitude must be between -180 and 180")
    @DecimalMax(value = "180.0", message = "Longitude must be between -180 and 180")
    private BigDecimal longitude;

    @Min(value = 1, message = "Duration must be at least 1 minute")
    private Integer durationMinutes;
}
