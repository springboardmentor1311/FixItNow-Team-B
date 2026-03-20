package com.fixitnow.dto;

import lombok.*;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SlotDTO {
    private LocalDateTime startTime;
    private LocalDateTime endTime;
    private boolean available;
}
