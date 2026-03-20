package com.fixitnow.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AdminChatRequest {

    // If sent by Admin, this is the Provider's ID.
    // If sent by Provider, this is ideally null (backend routes to an admin) or a specific admin ID.
    // Assuming 1-on-1 where the provider must specify the target, or the backend infers it.
    @NotNull(message = "Target User ID is required")
    private Long targetUserId;

    @NotBlank(message = "Message content cannot be empty")
    private String content;
}
