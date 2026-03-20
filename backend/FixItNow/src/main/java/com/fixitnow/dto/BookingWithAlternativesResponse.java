package com.fixitnow.dto;

import lombok.*;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BookingWithAlternativesResponse {

    private BookingDTO booking;

    private List<AlternativeProviderDTO> alternativeProviders;

    private java.time.LocalDate requestedDate;

    private String timeSlot;

    private String responseMessage;

    private Boolean isServiceUnavailable;
}
