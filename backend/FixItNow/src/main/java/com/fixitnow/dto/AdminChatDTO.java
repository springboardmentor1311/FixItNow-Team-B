package com.fixitnow.dto;

import lombok.*;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AdminChatDTO {
    private Long id;
    private Long senderId;
    private String senderName;
    private String senderRole;
    private Long receiverId;
    private String receiverName;
    private String receiverRole;
    private String content;
    private LocalDateTime sentAt;
}
