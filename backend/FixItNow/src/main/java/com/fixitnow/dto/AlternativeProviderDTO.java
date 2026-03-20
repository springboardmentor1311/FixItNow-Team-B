package com.fixitnow.dto;

import lombok.*;

import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AlternativeProviderDTO {

    private Long providerId;

    private String providerName;

    private String phone;

    private String email;

    private Long serviceId;

    private BigDecimal servicePrice;

    private String serviceDescription;

    private String location;

    private Boolean isAvailable;

    private String availabilityStatus;

    private Double distance;

    private Integer completedBookings;
}
