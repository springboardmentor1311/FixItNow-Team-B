package com.fixitnow.service;

import com.fixitnow.dto.ChatMessageDTO;
import com.fixitnow.dto.ChatMessageRequest;
import com.fixitnow.model.Booking;
import com.fixitnow.model.ChatMessage;
import com.fixitnow.model.User;
import com.fixitnow.repository.BookingRepository;
import com.fixitnow.repository.ChatMessageRepository;
import com.fixitnow.repository.UserRepository;
import com.fixitnow.repository.AdminProviderMessageRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class ChatService {

    private final ChatMessageRepository chatMessageRepository;
    private final BookingRepository bookingRepository;
    private final UserRepository userRepository;
    private final AdminProviderMessageRepository adminProviderMessageRepository;

    /**
     * Send a message in a booking context
     */
    public ChatMessageDTO sendMessage(Long senderId, ChatMessageRequest request) {
        log.info("Sending message from user {} for booking {}", senderId, request.getBookingId());

        // Validate sender exists
        User sender = userRepository.findById(senderId)
                .orElseThrow(() -> new IllegalArgumentException("Sender not found"));

        // Validate booking exists
        Booking booking = bookingRepository.findById(request.getBookingId())
                .orElseThrow(() -> new IllegalArgumentException("Booking not found"));

        // Verify that sender is either customer or provider of the booking
        User customer = booking.getCustomer();
        User provider = booking.getProvider();

        if (!customer.getId().equals(senderId) && !provider.getId().equals(senderId)) {
            throw new IllegalArgumentException("Not authorized to send messages in this booking");
        }

        // Chat is only enabled if the booking is active (PENDING or CONFIRMED)
        com.fixitnow.model.BookingStatus status = booking.getStatus();
        if (status == com.fixitnow.model.BookingStatus.COMPLETED || status == com.fixitnow.model.BookingStatus.CANCELLED) {
            throw new IllegalStateException("Chat is closed for this booking because it is " + status);
        }

        // Determine receiver based on sender
        User receiver = customer.getId().equals(senderId) ? provider : customer;

        ChatMessage message = ChatMessage.builder()
                .booking(booking)
                .sender(sender)
                .receiver(receiver)
                .content(request.getContent())
                .build();

        ChatMessage savedMessage = chatMessageRepository.save(message);
        log.info("Message saved with id: {} for booking {}", savedMessage.getId(), booking.getId());

        return convertToDTO(savedMessage);
    }

    /**
     * Get chat history for a booking (paginated)
     */
    @Transactional(readOnly = true)
    public Page<ChatMessageDTO> getChatHistoryByBooking(Long bookingId, Long currentUserId, Pageable pageable) {
        log.info("Fetching chat history for booking {}", bookingId);

        // Validate booking exists
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new IllegalArgumentException("Booking not found"));

        // Verify that user is part of the booking
        if (!booking.getCustomer().getId().equals(currentUserId) && !booking.getProvider().getId().equals(currentUserId)) {
            throw new IllegalArgumentException("Not authorized to view messages in this booking");
        }

        return chatMessageRepository.findByBookingIdOrderBySentAtAsc(bookingId, pageable)
                .map(this::convertToDTO);
    }

    /**
     * Get all messages sent by a user across all bookings
     */
    @Transactional(readOnly = true)
    public Page<ChatMessageDTO> getSentMessages(Long senderId, Pageable pageable) {
        log.info("Fetching sent messages from user {}", senderId);

        userRepository.findById(senderId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        return chatMessageRepository.findBySenderIdOrderBySentAtDesc(senderId, pageable)
                .map(this::convertToDTO);
    }

    /**
     * Get message count for a booking
     */
    @Transactional(readOnly = true)
    public long getMessageCountByBooking(Long bookingId) {
        log.info("Getting message count for booking {}", bookingId);
        return chatMessageRepository.countByBookingId(bookingId);
    }

    /**
     * Convert ChatMessage entity to DTO
     */
    private ChatMessageDTO convertToDTO(ChatMessage message) {
        return ChatMessageDTO.builder()
                .id(message.getId())
                .bookingId(message.getBooking().getId())
                .senderId(message.getSender().getId())
                .senderName(message.getSender().getName())
                .receiverId(message.getReceiver().getId())
                .receiverName(message.getReceiver().getName())
                .content(message.getContent())
                .sentAt(message.getSentAt())
                .build();
    }

    /**
     * Send a message between Admin and Provider
     */
    public com.fixitnow.dto.AdminChatDTO sendAdminProviderMessage(Long senderId, com.fixitnow.dto.AdminChatRequest request) {
        log.info("Sending admin-provider message from user {} to user {}", senderId, request.getTargetUserId());

        User sender = userRepository.findById(senderId)
                .orElseThrow(() -> new IllegalArgumentException("Sender not found"));

        User receiver = userRepository.findById(request.getTargetUserId())
                .orElseThrow(() -> new IllegalArgumentException("Receiver not found"));

        // Validate roles (One must be ADMIN, one must be PROVIDER)
        boolean isAdminSender = sender.getRole() == com.fixitnow.model.UserRole.ADMIN;
        boolean isProviderReceiver = receiver.getRole() == com.fixitnow.model.UserRole.PROVIDER;
        
        boolean isProviderSender = sender.getRole() == com.fixitnow.model.UserRole.PROVIDER;
        boolean isAdminReceiver = receiver.getRole() == com.fixitnow.model.UserRole.ADMIN;

        if (!(isAdminSender && isProviderReceiver) && !(isProviderSender && isAdminReceiver)) {
            throw new IllegalArgumentException("Admin-Provider chat must be strictly between an Admin and a Provider.");
        }

        com.fixitnow.model.AdminProviderMessage message = com.fixitnow.model.AdminProviderMessage.builder()
                .sender(sender)
                .receiver(receiver)
                .content(request.getContent())
                .build();

        com.fixitnow.model.AdminProviderMessage savedMessage = adminProviderMessageRepository.save(message);
        return convertAdminMessageToDTO(savedMessage);
    }

    /**
     * Get chat history between Admin and a specific Provider
     */
    @Transactional(readOnly = true)
    public Page<com.fixitnow.dto.AdminChatDTO> getAdminProviderHistory(Long adminId, Long providerId, Pageable pageable) {
        if (adminId == null) {
            log.info("Fetching admin-provider history for provider {} (All Admins)", providerId);
            return adminProviderMessageRepository.findAllForProvider(providerId, pageable)
                    .map(this::convertAdminMessageToDTO);
        } else {
            log.info("Fetching admin-provider history for admin {} and provider {}", adminId, providerId);
            return adminProviderMessageRepository.findConversation(adminId, providerId, pageable)
                    .map(this::convertAdminMessageToDTO);
        }
    }

    private com.fixitnow.dto.AdminChatDTO convertAdminMessageToDTO(com.fixitnow.model.AdminProviderMessage message) {
        return com.fixitnow.dto.AdminChatDTO.builder()
                .id(message.getId())
                .senderId(message.getSender().getId())
                .senderName(message.getSender().getName())
                .senderRole(message.getSender().getRole().name())
                .receiverId(message.getReceiver().getId())
                .receiverName(message.getReceiver().getName())
                .receiverRole(message.getReceiver().getRole().name())
                .content(message.getContent())
                .sentAt(message.getSentAt())
                .build();
    }
}
