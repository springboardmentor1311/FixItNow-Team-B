package com.fixitnow.dto;

import com.fixitnow.model.BookingStatus;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class BookingStatusUpdateRequest {
    @NotNull(message = "status is required")
    private BookingStatus status;
}

