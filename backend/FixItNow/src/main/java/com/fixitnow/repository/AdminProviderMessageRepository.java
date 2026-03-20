package com.fixitnow.repository;

import com.fixitnow.model.AdminProviderMessage;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface AdminProviderMessageRepository extends JpaRepository<AdminProviderMessage, Long> {

    /**
     * Find all messages exchanged between an admin and a specific provider.
     * Checks both directions (Admin->Provider and Provider->Admin)
     */
    @Query("SELECT m FROM AdminProviderMessage m WHERE " +
           "(m.sender.id = :adminId AND m.receiver.id = :providerId) OR " +
           "(m.sender.id = :providerId AND m.receiver.id = :adminId) " +
           "ORDER BY m.sentAt ASC")
    Page<AdminProviderMessage> findConversation(
            @Param("adminId") Long adminId,
            @Param("providerId") Long providerId,
            Pageable pageable);

    /**
     * Find all messages for a specific provider (where the other party is an admin).
     * Used when the provider requests their chat history, since they can chat with any admin.
     */
    @Query("SELECT m FROM AdminProviderMessage m WHERE " +
           "(m.sender.id = :providerId AND m.receiver.role = 'ADMIN') OR " +
           "(m.receiver.id = :providerId AND m.sender.role = 'ADMIN') " +
           "ORDER BY m.sentAt ASC")
    Page<AdminProviderMessage> findAllForProvider(
            @Param("providerId") Long providerId,
            Pageable pageable);
}
