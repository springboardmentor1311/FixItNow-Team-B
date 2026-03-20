package com.fixitnow.controller;

import com.fixitnow.dto.ApiResponse;
import com.fixitnow.dto.ChatMessageDTO;
import com.fixitnow.dto.ChatMessageRequest;
import com.fixitnow.dto.AdminChatDTO;
import com.fixitnow.dto.AdminChatRequest;
import com.fixitnow.repository.UserRepository;
import com.fixitnow.service.ChatService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.*;

@Slf4j
@Controller
@RequiredArgsConstructor
public class ChatController {

    private final ChatService chatService;
    private final SimpMessagingTemplate messagingTemplate;
    private final UserRepository userRepository;

    /**
     * WebSocket endpoint for sending messages in a booking
     * Maps: /app/chat.send → /topic/chat/{bookingId}
     */
    @MessageMapping("/chat.send")
    public void sendMessage(@Payload ChatMessageRequest request,
                            @AuthenticationPrincipal UserDetails userDetails) {
        try {
            log.info("WebSocket message received from {}", userDetails.getUsername());

            Long senderId = userRepository.findByEmail(userDetails.getUsername())
                    .map(u -> u.getId())
                    .orElseThrow(() -> new IllegalArgumentException("User not found"));

            ChatMessageDTO savedMessage = chatService.sendMessage(senderId, request);

            // Broadcast to booking-specific topic
            String topicDestination = "/topic/chat/" + request.getBookingId();
            messagingTemplate.convertAndSend(topicDestination, savedMessage);
            log.info("Message broadcasted to {}", topicDestination);

        } catch (Exception e) {
            log.error("Error sending message", e);
            if (userDetails != null) {
                messagingTemplate.convertAndSendToUser(
                        userDetails.getUsername(),
                        "/queue/errors",
                        ApiResponse.error("Error: " + e.getMessage())
                );
            }
        }
    }

    /**
     * POST /chats/send - Send message in booking
     * Request body: { "bookingId": 1, "content": "message" }
     * REST endpoint for clients that don't use WebSocket
     */
    @PostMapping("/chats/send")
    public ResponseEntity<ApiResponse<ChatMessageDTO>> sendMessageRest(
            @Valid @RequestBody ChatMessageRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        try {
            log.info("REST message from {}", userDetails.getUsername());

            Long senderId = userRepository.findByEmail(userDetails.getUsername())
                    .map(u -> u.getId())
                    .orElseThrow(() -> new IllegalArgumentException("User not found"));

            ChatMessageDTO savedMessage = chatService.sendMessage(senderId, request);

            // Broadcast to booking's topic
            String topicDestination = "/topic/chat/" + request.getBookingId();
            messagingTemplate.convertAndSend(topicDestination, savedMessage);

            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(ApiResponse.success("Message sent successfully", savedMessage));

        } catch (IllegalArgumentException e) {
            log.warn("Invalid message request: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(ApiResponse.error(e.getMessage()));
        } catch (Exception e) {
            log.error("Error sending message via REST", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("Error sending message: " + e.getMessage()));
        }
    }

    /**
     * GET /chats/{bookingId}/history - Get conversation history for a booking
     */
    @GetMapping("/chats/{bookingId}/history")
    @ResponseBody
    public ResponseEntity<ApiResponse<Page<ChatMessageDTO>>> getChatHistory(
            @PathVariable Long bookingId,
            @AuthenticationPrincipal UserDetails userDetails,
            Pageable pageable) {
        try {
            Long currentUserId = userRepository.findByEmail(userDetails.getUsername())
                    .map(u -> u.getId())
                    .orElseThrow(() -> new IllegalArgumentException("User not found"));

            log.info("Fetching chat history for booking {}", bookingId);

            Page<ChatMessageDTO> messages = chatService.getChatHistoryByBooking(bookingId, currentUserId, pageable);

            return ResponseEntity.ok(ApiResponse.success("Chat history retrieved", messages));

        } catch (IllegalArgumentException e) {
            log.warn("Invalid chat history request: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(ApiResponse.error(e.getMessage()));
        } catch (Exception e) {
            log.error("Error fetching chat history", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("Error retrieving chat history: " + e.getMessage()));
        }
    }

    // ==========================================
    // ADMIN - PROVIDER CHAT ENDPOINTS
    // ==========================================

    /**
     * WebSocket endpoint for Admin-Provider chat
     * Maps: /app/chat.admin.send → /topic/admin-chat/{targetUserId}
     */
    @MessageMapping("/chat.admin.send")
    public void sendAdminMessage(@Payload AdminChatRequest request,
                                 @AuthenticationPrincipal UserDetails userDetails) {
        try {
            Long senderId = userRepository.findByEmail(userDetails.getUsername())
                    .map(u -> u.getId())
                    .orElseThrow(() -> new IllegalArgumentException("User not found"));

            AdminChatDTO savedMessage = chatService.sendAdminProviderMessage(senderId, request);

            // The topic is specific to the conversation between these two
            // To make it simple, broadcast to both the sender's and receiver's private queue or a shared topic based on provider ID
            // Assuming the provider ID is the stable identifier for this chat room:
            Long providerId = savedMessage.getSenderRole().equals("PROVIDER") ? savedMessage.getSenderId() : savedMessage.getReceiverId();
            String topicDestination = "/topic/admin-chat/" + providerId;
            
            messagingTemplate.convertAndSend(topicDestination, savedMessage);

        } catch (Exception e) {
            log.error("Error sending admin message", e);
            if (userDetails != null) {
                messagingTemplate.convertAndSendToUser(
                        userDetails.getUsername(),
                        "/queue/errors",
                        ApiResponse.error("Error: " + e.getMessage())
                );
            }
        }
    }

    /**
     * REST endpoint for Admin-Provider chat
     */
    @PostMapping("/chats/admin/send")
    public ResponseEntity<ApiResponse<AdminChatDTO>> sendAdminMessageRest(
            @Valid @RequestBody AdminChatRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        try {
            Long senderId = userRepository.findByEmail(userDetails.getUsername())
                    .map(u -> u.getId())
                    .orElseThrow(() -> new IllegalArgumentException("User not found"));

            AdminChatDTO savedMessage = chatService.sendAdminProviderMessage(senderId, request);

            Long providerId = savedMessage.getSenderRole().equals("PROVIDER") ? savedMessage.getSenderId() : savedMessage.getReceiverId();
            String topicDestination = "/topic/admin-chat/" + providerId;
            
            messagingTemplate.convertAndSend(topicDestination, savedMessage);

            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(ApiResponse.success("Message sent successfully", savedMessage));

        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(ApiResponse.error(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(ApiResponse.error(e.getMessage()));
        }
    }

    /**
     * GET history between Admin and Provider
     * For providers: providerId in path should be their own ID.
     * For admins: providerId can be any provider.
     */
    @GetMapping("/chats/admin/{providerId}/history")
    @ResponseBody
    public ResponseEntity<ApiResponse<Page<AdminChatDTO>>> getAdminChatHistory(
            @PathVariable Long providerId,
            @AuthenticationPrincipal UserDetails userDetails,
            Pageable pageable) {
        try {
            Long currentUserId = userRepository.findByEmail(userDetails.getUsername())
                    .map(u -> u.getId())
                    .orElseThrow(() -> new IllegalArgumentException("User not found"));

            // Get the current user's role to validate access
            com.fixitnow.model.UserRole role = userRepository.findById(currentUserId).get().getRole();
            
            // If the user is a provider, they can only request their own history
            if (role == com.fixitnow.model.UserRole.PROVIDER && !currentUserId.equals(providerId)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(ApiResponse.error("Providers can only view their own admin chat history."));
            }

            // In our schema, we just need ANY admin ID since the query checks for messages between an admin and provider.
            // If an admin requests this, use their ID. If provider requests, use any admin ID they've interacted with, 
            // OR change the service method to allow null adminId to fetch all admin interactions for that provider.
            // For now, we pass currentUserId if admin, else we pass a known admin or modify the query.
            // *Correction*: A provider might chat with multiple admins. Let's update this to just pass the current user, 
            // and the service will handle it. Wait, the service method requires both. Let's pass the other ID.
            
            Long adminId = (role == com.fixitnow.model.UserRole.ADMIN) ? currentUserId : null; // We'll modify ChatService to handle null adminId if provider
            
            // Actually, if a provider logs in, they want to see all admin messages.
            // Let's call the service. We will need to update ChatService to handle `getAdminProviderHistory(providerId, pageable)`
            Page<AdminChatDTO> messages = chatService.getAdminProviderHistory(adminId, providerId, pageable);

            return ResponseEntity.ok(ApiResponse.success("Admin Chat history retrieved", messages));

        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("Error retrieving admin chat history: " + e.getMessage()));
        }
    }
}
