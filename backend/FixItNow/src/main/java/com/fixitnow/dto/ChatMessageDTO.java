package com.fixitnow.dto;

import lombok.*;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ChatMessageDTO {

    private Long id;

    private Long senderId;

    private String senderName;

    private Long receiverId;

    private String receiverName;

    private Long bookingId;

    private String content;

    private LocalDateTime sentAt;
}
