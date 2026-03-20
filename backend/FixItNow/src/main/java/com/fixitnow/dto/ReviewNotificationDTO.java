package com.fixitnow.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.*;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ReviewNotificationDTO {

    private Long id;
    private Long reviewId;
    private Long serviceId;
    private Long providerId;
    private String providerName;
    private Long customerId;
    private String customerName;
    private Integer rating;
    private String comment;
    private Boolean isRead;

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime createdAt;

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime readAt;
}
