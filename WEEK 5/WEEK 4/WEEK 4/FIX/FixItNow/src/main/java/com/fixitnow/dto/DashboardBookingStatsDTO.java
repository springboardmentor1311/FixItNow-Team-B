package com.fixitnow.dto;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class DashboardBookingStatsDTO {
    private long total;
    private long pending;
    private long confirmed;
    private long completed;
    private long cancelled;
}

