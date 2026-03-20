package com.fixitnow.repository;

import com.fixitnow.model.ChatMessage;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ChatMessageRepository extends JpaRepository<ChatMessage, Long> {

    /**
     * Find all messages for a specific booking
     * Paginated results ordered by sent time (ascending)
     */
    @Query("SELECT cm FROM ChatMessage cm WHERE cm.booking.id = :bookingId ORDER BY cm.sentAt ASC")
    Page<ChatMessage> findByBookingIdOrderBySentAtAsc(
            @Param("bookingId") Long bookingId,
            Pageable pageable);

    /**
     * Find all messages for a specific booking (non-paginated)
     */
    @Query("SELECT cm FROM ChatMessage cm WHERE cm.booking.id = :bookingId ORDER BY cm.sentAt ASC")
    List<ChatMessage> findByBookingId(@Param("bookingId") Long bookingId);

    /**
     * Find all messages sent by a user in a specific booking
     */
    @Query("SELECT cm FROM ChatMessage cm WHERE cm.booking.id = :bookingId AND cm.sender.id = :senderId ORDER BY cm.sentAt DESC")
    Page<ChatMessage> findByBookingIdAndSenderId(
            @Param("bookingId") Long bookingId,
            @Param("senderId") Long senderId,
            Pageable pageable);

    /**
     * Find all messages sent by a user (across all bookings)
     */
    @Query("SELECT cm FROM ChatMessage cm WHERE cm.sender.id = :senderId ORDER BY cm.sentAt DESC")
    Page<ChatMessage> findBySenderIdOrderBySentAtDesc(
            @Param("senderId") Long senderId,
            Pageable pageable);

    /**
     * Count messages in a specific booking
     */
    @Query("SELECT COUNT(cm) FROM ChatMessage cm WHERE cm.booking.id = :bookingId")
    Long countByBookingId(@Param("bookingId") Long bookingId);
}
