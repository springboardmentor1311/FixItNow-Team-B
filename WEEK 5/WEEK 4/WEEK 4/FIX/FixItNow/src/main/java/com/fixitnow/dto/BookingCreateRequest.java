package com.fixitnow.dto;

import com.fixitnow.model.BookingServiceType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;

@Getter
@Setter
public class BookingCreateRequest {

    @NotNull(message = "serviceType is required")
    private BookingServiceType serviceType;

    @NotNull(message = "bookingDate is required")
    private LocalDate bookingDate;

    @NotBlank(message = "timeSlot is required")
    private String timeSlot;

    private String problemDescription;

    /**
     * Optional. If provided, the booking is assigned to this provider.
     * If not provided, it remains unassigned (Pending).
     */
    private Long providerId;
}

