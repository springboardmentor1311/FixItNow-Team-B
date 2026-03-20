package com.fixitnow.dto;

import jakarta.validation.constraints.Size;
import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BookingActionRequest {

    @Size(max = 500, message = "Reason cannot exceed 500 characters")
    private String reason;
}
