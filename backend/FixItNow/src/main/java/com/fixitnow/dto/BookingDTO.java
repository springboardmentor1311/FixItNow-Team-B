package com.fixitnow.dto;

import com.fixitnow.model.BookingStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BookingDTO {

    private Long id;

    private Long customerId;

    private String customerName;

    private Long providerId;

    private String providerName;

    private Long serviceId;

    private String serviceName;

    private java.time.LocalDate bookingDate;

    private String timeSlot;

    private BookingStatus status;

    private LocalDateTime createdAt;
}
