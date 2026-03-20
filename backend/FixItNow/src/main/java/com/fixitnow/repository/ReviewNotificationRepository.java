package com.fixitnow.repository;

import com.fixitnow.model.ReviewNotification;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.Optional;

@Repository
public interface ReviewNotificationRepository extends JpaRepository<ReviewNotification, Long> {

    Page<ReviewNotification> findByProviderIdOrderByCreatedAtDesc(Long providerId, Pageable pageable);

    Page<ReviewNotification> findByProviderIdAndIsReadFalseOrderByCreatedAtDesc(Long providerId, Pageable pageable);

    long countByProviderIdAndIsReadFalse(Long providerId);

    Optional<ReviewNotification> findByReviewIdAndProviderId(Long reviewId, Long providerId);

    Optional<ReviewNotification> findByIdAndProviderId(Long id, Long providerId);

    @Modifying
    @Query("UPDATE ReviewNotification rn " +
            "SET rn.isRead = true, rn.readAt = :readAt " +
            "WHERE rn.provider.id = :providerId AND rn.isRead = false")
    int markAllAsReadByProviderId(@Param("providerId") Long providerId,
                                  @Param("readAt") LocalDateTime readAt);
}
