package com.fixitnow.dto;

import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ServiceResponseDTO {
    private Long id;
    private Long providerId;
    private String providerName;
    private String category;
    private String subcategory;
    private String description;
    private BigDecimal price;
    private String availability;
    private String location;
    private BigDecimal latitude;
    private BigDecimal longitude;
    private BigDecimal averageRating;
    private Integer reviewCount;
    private LocalDateTime createdAt;
}
