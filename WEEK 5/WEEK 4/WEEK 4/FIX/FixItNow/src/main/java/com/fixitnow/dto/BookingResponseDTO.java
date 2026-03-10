package com.fixitnow.dto;

import com.fixitnow.model.BookingServiceType;
import com.fixitnow.model.BookingStatus;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Getter
@Builder
public class BookingResponseDTO {
    private String id;

    private Long customerId;
    private String customerName;
    private String customerLocation;

    private BookingServiceType serviceType;
    private LocalDate bookingDate;
    private String timeSlot;
    private String problemDescription;

    private BookingStatus status;

    private Long providerId;
    private String providerName;
    private String providerLocation;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}

