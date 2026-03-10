package com.fixitnow.dto;

import lombok.*;

import java.math.BigDecimal;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProviderRatingDTO {

    private Long providerId;

    private String providerName;

    private BigDecimal averageRating;

    private Integer totalReviews;

    private List<ReviewDTO> reviews;
}
