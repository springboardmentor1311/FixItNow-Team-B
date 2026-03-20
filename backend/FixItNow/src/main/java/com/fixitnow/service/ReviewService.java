package com.fixitnow.service;

import com.fixitnow.dto.ProviderRatingDTO;
import com.fixitnow.dto.ReviewCreateRequest;
import com.fixitnow.dto.ReviewDTO;
import com.fixitnow.dto.ReviewNotificationDTO;
import com.fixitnow.model.Review;
import com.fixitnow.model.ReviewNotification;
import com.fixitnow.model.Service;
import com.fixitnow.model.User;
import com.fixitnow.repository.ReviewNotificationRepository;
import com.fixitnow.repository.ReviewRepository;
import com.fixitnow.repository.ServiceRepository;
import com.fixitnow.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@org.springframework.stereotype.Service
@RequiredArgsConstructor
@Transactional
public class ReviewService {

    private final ReviewRepository reviewRepository;
    private final ReviewNotificationRepository reviewNotificationRepository;
    private final ServiceRepository serviceRepository;
    private final UserRepository userRepository;

    /**
     * Create a new review for a service
     */
    public ReviewDTO createReview(Long customerId, ReviewCreateRequest request) {
        log.info("Creating review for service {} by customer {}", request.getServiceId(), customerId);

        // Validate service exists
        Service service = serviceRepository.findById(request.getServiceId())
                .orElseThrow(() -> new IllegalArgumentException("Service not found with id: " + request.getServiceId()));

        // Validate customer exists
        User customer = userRepository.findById(customerId)
                .orElseThrow(() -> new IllegalArgumentException("Customer not found with id: " + customerId));

        // Check if review already exists for this service by this customer
        if (reviewRepository.findByServiceIdAndCustomerId(request.getServiceId(), customerId).isPresent()) {
            throw new IllegalArgumentException("You have already reviewed this service");
        }

        User provider = service.getProvider();

        Review review = Review.builder()
                .service(service)
                .customer(customer)
                .provider(provider)
                .rating(request.getRating())
                .comment(request.getComment())
                .build();

        Review savedReview = reviewRepository.save(review);
        log.info("Review created successfully with id: {}", savedReview.getId());

        // Update service average rating
        updateServiceRating(service.getId());
        createReviewNotification(savedReview);

        return convertToDTO(savedReview);
    }

    /**
     * Update an existing review
     */
    public ReviewDTO updateReview(Long reviewId, ReviewCreateRequest request, Long customerId) {
        log.info("Updating review {} by customer {}", reviewId, customerId);

        Review review = reviewRepository.findById(reviewId)
                .orElseThrow(() -> new IllegalArgumentException("Review not found with id: " + reviewId));

        // Verify that the customer is the one who created the review
        if (!review.getCustomer().getId().equals(customerId)) {
            throw new IllegalArgumentException("You are not authorized to update this review");
        }

        review.setRating(request.getRating());
        review.setComment(request.getComment());

        Review updatedReview = reviewRepository.save(review);
        log.info("Review updated successfully with id: {}", updatedReview.getId());

        // Update service average rating
        updateServiceRating(review.getService().getId());

        return convertToDTO(updatedReview);
    }

    /**
     * Delete a review
     */
    public void deleteReview(Long reviewId, Long customerId) {
        log.info("Deleting review {} by customer {}", reviewId, customerId);

        Review review = reviewRepository.findById(reviewId)
                .orElseThrow(() -> new IllegalArgumentException("Review not found with id: " + reviewId));

        // Verify authorization
        if (!review.getCustomer().getId().equals(customerId)) {
            throw new IllegalArgumentException("You are not authorized to delete this review");
        }

        Long serviceId = review.getService().getId();
        reviewRepository.deleteById(reviewId);
        log.info("Review deleted successfully");

        // Update service average rating
        updateServiceRating(serviceId);
    }

    /**
     * Get all reviews for a service
     */
    @Transactional(readOnly = true)
    public Page<ReviewDTO> getServiceReviews(Long serviceId, Pageable pageable) {
        log.info("Fetching reviews for service {}", serviceId);
        Page<Review> reviews = reviewRepository.findByServiceId(serviceId, pageable);
        return reviews.map(this::convertToDTO);
    }

    /**
     * Get all reviews for a provider
     */
    @Transactional(readOnly = true)
    public Page<ReviewDTO> getProviderReviews(Long providerId, Pageable pageable) {
        log.info("Fetching reviews for provider {}", providerId);
        Page<Review> reviews = reviewRepository.findByProviderId(providerId, pageable);
        return reviews.map(this::convertToDTO);
    }

    /**
     * Get a single review by ID
     */
    @Transactional(readOnly = true)
    public ReviewDTO getReviewById(Long reviewId) {
        log.info("Fetching review with id: {}", reviewId);
        Review review = reviewRepository.findById(reviewId)
                .orElseThrow(() -> new IllegalArgumentException("Review not found with id: " + reviewId));
        return convertToDTO(review);
    }

    /**
     * Get provider rating summary
     */
    @Transactional(readOnly = true)
    public ProviderRatingDTO getProviderRatingSummary(Long providerId) {
        log.info("Fetching rating summary for provider {}", providerId);

        User provider = userRepository.findById(providerId)
                .orElseThrow(() -> new IllegalArgumentException("Provider not found with id: " + providerId));

        BigDecimal averageRating = reviewRepository.getAverageRatingByProviderId(providerId)
                .orElse(BigDecimal.ZERO)
                .setScale(2, RoundingMode.HALF_UP);

        long totalReviews = reviewRepository.countByProviderId(providerId);

        List<ReviewDTO> reviews = reviewRepository.findByProviderId(providerId)
                .stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());

        return ProviderRatingDTO.builder()
                .providerId(providerId)
                .providerName(provider.getName())
                .averageRating(averageRating)
                .totalReviews((int) totalReviews)
                .reviews(reviews)
                .build();
    }

    /**
     * Get review notifications for an authenticated provider.
     */
    @Transactional(readOnly = true)
    public Page<ReviewNotificationDTO> getProviderReviewNotifications(Long providerId, boolean unreadOnly, Pageable pageable) {
        Page<ReviewNotification> notifications = unreadOnly
                ? reviewNotificationRepository.findByProviderIdAndIsReadFalseOrderByCreatedAtDesc(providerId, pageable)
                : reviewNotificationRepository.findByProviderIdOrderByCreatedAtDesc(providerId, pageable);

        return notifications.map(this::convertNotificationToDTO);
    }

    /**
     * Get unread review notification count for provider.
     */
    @Transactional(readOnly = true)
    public long getUnreadProviderReviewNotificationCount(Long providerId) {
        return reviewNotificationRepository.countByProviderIdAndIsReadFalse(providerId);
    }

    /**
     * Mark a single review notification as read.
     */
    @Transactional
    public void markProviderReviewNotificationAsRead(Long providerId, Long notificationId) {
        ReviewNotification notification = reviewNotificationRepository.findByIdAndProviderId(notificationId, providerId)
                .orElseThrow(() -> new IllegalArgumentException("Review notification not found"));

        if (Boolean.TRUE.equals(notification.getIsRead())) {
            return;
        }

        notification.setIsRead(true);
        notification.setReadAt(LocalDateTime.now());
        reviewNotificationRepository.save(notification);
    }

    /**
     * Mark all provider review notifications as read.
     */
    @Transactional
    public int markAllProviderReviewNotificationsAsRead(Long providerId) {
        return reviewNotificationRepository.markAllAsReadByProviderId(providerId, LocalDateTime.now());
    }

    /**
     * Update service average rating and review count
     */
    @Transactional
    public void updateServiceRating(Long serviceId) {
        log.info("Updating rating for service {}", serviceId);

        Service service = serviceRepository.findById(serviceId)
                .orElseThrow(() -> new IllegalArgumentException("Service not found with id: " + serviceId));

        BigDecimal averageRating = reviewRepository.getAverageRatingByServiceId(serviceId)
                .orElse(BigDecimal.ZERO)
                .setScale(2, RoundingMode.HALF_UP);

        long reviewCount = reviewRepository.countByServiceId(serviceId);

        service.setAverageRating(averageRating);
        service.setReviewCount((int) reviewCount);

        serviceRepository.save(service);
        log.info("Service rating updated: avgRating={}, reviewCount={}", averageRating, reviewCount);
    }

    /**
     * Convert Review entity to ReviewDTO
     */
    private ReviewDTO convertToDTO(Review review) {
        return ReviewDTO.builder()
                .id(review.getId())
                .serviceId(review.getService().getId())
                .customerId(review.getCustomer().getId())
                .customerName(review.getCustomer().getName())
                .providerId(review.getProvider().getId())
                .providerName(review.getProvider().getName())
                .rating(review.getRating())
                .comment(review.getComment())
                .createdAt(review.getCreatedAt())
                .updatedAt(review.getUpdatedAt())
                .build();
    }

    private void createReviewNotification(Review review) {
        if (review == null || review.getId() == null) {
            return;
        }

        Long providerId = review.getProvider().getId();
        Long reviewId = review.getId();
        if (providerId == null || reviewId == null) {
            return;
        }

        boolean alreadyExists = reviewNotificationRepository.findByReviewIdAndProviderId(reviewId, providerId).isPresent();
        if (alreadyExists) {
            return;
        }

        ReviewNotification notification = ReviewNotification.builder()
                .review(review)
                .provider(review.getProvider())
                .customer(review.getCustomer())
                .isRead(false)
                .build();

        reviewNotificationRepository.save(notification);
    }

    private ReviewNotificationDTO convertNotificationToDTO(ReviewNotification notification) {
        Review review = notification.getReview();
        User provider = notification.getProvider();
        User customer = notification.getCustomer();

        return ReviewNotificationDTO.builder()
                .id(notification.getId())
                .reviewId(review.getId())
                .serviceId(review.getService().getId())
                .providerId(provider.getId())
                .providerName(provider.getName())
                .customerId(customer.getId())
                .customerName(customer.getName())
                .rating(review.getRating())
                .comment(review.getComment())
                .isRead(notification.getIsRead())
                .createdAt(notification.getCreatedAt())
                .readAt(notification.getReadAt())
                .build();
    }
}
