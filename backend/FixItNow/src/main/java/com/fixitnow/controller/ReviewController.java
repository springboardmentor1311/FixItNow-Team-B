package com.fixitnow.controller;

import com.fixitnow.dto.ApiResponse;
import com.fixitnow.dto.ProviderRatingDTO;
import com.fixitnow.dto.ReviewCreateRequest;
import com.fixitnow.dto.ReviewDTO;
import com.fixitnow.dto.ReviewNotificationDTO;
import com.fixitnow.model.UserRole;
import com.fixitnow.service.ReviewService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import com.fixitnow.repository.UserRepository;
import com.fixitnow.model.User;

@Slf4j
@RestController
@RequestMapping("/reviews")
@RequiredArgsConstructor
@CrossOrigin(origins = "*", maxAge = 3600)
public class ReviewController {

    private final ReviewService reviewService;
    private final UserRepository userRepository;

    private User getAuthenticatedUser(UserDetails userDetails) {
        return userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
    }

    private User getAuthenticatedProvider(UserDetails userDetails) {
        User user = getAuthenticatedUser(userDetails);
        if (user.getRole() != UserRole.PROVIDER) {
            throw new IllegalArgumentException("Only providers can access this resource");
        }
        return user;
    }

    /**
     * Create a new review for a service
     */
    @PostMapping
    public ResponseEntity<ApiResponse<ReviewDTO>> createReview(
            @Valid @RequestBody ReviewCreateRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        log.info("Creating review for service {}", request.getServiceId());

        User user = getAuthenticatedUser(userDetails);

        ReviewDTO review = reviewService.createReview(user.getId(), request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Review created successfully", review));
    }

    /**
     * Get all reviews for a specific service
     */
    @GetMapping("/service/{serviceId}")
    public ResponseEntity<ApiResponse<Page<ReviewDTO>>> getServiceReviews(
            @PathVariable Long serviceId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        log.info("Fetching reviews for service {} - Page: {}, Size: {}", serviceId, page, size);
        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        Page<ReviewDTO> reviews = reviewService.getServiceReviews(serviceId, pageable);
        return ResponseEntity.ok(ApiResponse.success("Service reviews fetched successfully", reviews));
    }

    /**
     * Get all reviews for a specific provider
     */
    @GetMapping("/provider/{providerId}")
    public ResponseEntity<ApiResponse<Page<ReviewDTO>>> getProviderReviews(
            @PathVariable Long providerId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        log.info("Fetching reviews for provider {} - Page: {}, Size: {}", providerId, page, size);
        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        Page<ReviewDTO> reviews = reviewService.getProviderReviews(providerId, pageable);
        return ResponseEntity.ok(ApiResponse.success("Provider reviews fetched successfully", reviews));
    }

    /**
     * Get provider rating summary with average rating and review count
     */
    @GetMapping("/provider/{providerId}/summary")
    public ResponseEntity<ApiResponse<ProviderRatingDTO>> getProviderRatingSummary(
            @PathVariable Long providerId) {
        log.info("Fetching rating summary for provider {}", providerId);
        ProviderRatingDTO summary = reviewService.getProviderRatingSummary(providerId);
        return ResponseEntity.ok(ApiResponse.success("Provider rating summary fetched successfully", summary));
    }

    /**
     * Get a specific review by ID
     */
    @GetMapping("/{reviewId}")
    public ResponseEntity<ApiResponse<ReviewDTO>> getReviewById(@PathVariable Long reviewId) {
        log.info("Fetching review with id: {}", reviewId);
        ReviewDTO review = reviewService.getReviewById(reviewId);
        return ResponseEntity.ok(ApiResponse.success("Review fetched successfully", review));
    }

    /**
     * Update a review
     */
    @PutMapping("/{reviewId}")
    public ResponseEntity<ApiResponse<ReviewDTO>> updateReview(
            @PathVariable Long reviewId,
            @Valid @RequestBody ReviewCreateRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        log.info("Updating review {}", reviewId);

        User user = getAuthenticatedUser(userDetails);

        ReviewDTO review = reviewService.updateReview(reviewId, request, user.getId());
        return ResponseEntity.ok(ApiResponse.success("Review updated successfully", review));
    }

    /**
     * Delete a review
     */
    @DeleteMapping("/{reviewId}")
    public ResponseEntity<ApiResponse<String>> deleteReview(
            @PathVariable Long reviewId,
            @AuthenticationPrincipal UserDetails userDetails) {
        log.info("Deleting review {}", reviewId);

        User user = getAuthenticatedUser(userDetails);

        reviewService.deleteReview(reviewId, user.getId());
        return ResponseEntity.ok(ApiResponse.success("Review deleted successfully", null));
    }

    /**
     * Get all reviews for currently logged-in provider.
     */
    @GetMapping("/provider/my")
    public ResponseEntity<ApiResponse<Page<ReviewDTO>>> getMyProviderReviews(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @AuthenticationPrincipal UserDetails userDetails) {
        User provider = getAuthenticatedProvider(userDetails);
        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        Page<ReviewDTO> reviews = reviewService.getProviderReviews(provider.getId(), pageable);
        return ResponseEntity.ok(ApiResponse.success("Provider reviews fetched successfully", reviews));
    }

    /**
     * Get review notifications for currently logged-in provider.
     */
    @GetMapping("/provider/my/notifications")
    public ResponseEntity<ApiResponse<Page<ReviewNotificationDTO>>> getMyReviewNotifications(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "false") boolean unreadOnly,
            @AuthenticationPrincipal UserDetails userDetails) {
        User provider = getAuthenticatedProvider(userDetails);
        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        Page<ReviewNotificationDTO> notifications =
                reviewService.getProviderReviewNotifications(provider.getId(), unreadOnly, pageable);
        return ResponseEntity.ok(ApiResponse.success("Provider review notifications fetched successfully", notifications));
    }

    /**
     * Get unread review notification count for logged-in provider.
     */
    @GetMapping("/provider/my/notifications/unread-count")
    public ResponseEntity<ApiResponse<Long>> getMyUnreadReviewNotificationCount(
            @AuthenticationPrincipal UserDetails userDetails) {
        User provider = getAuthenticatedProvider(userDetails);
        long unreadCount = reviewService.getUnreadProviderReviewNotificationCount(provider.getId());
        return ResponseEntity.ok(ApiResponse.success("Unread review notification count fetched successfully", unreadCount));
    }

    /**
     * Mark a review notification as read for logged-in provider.
     */
    @PatchMapping("/provider/my/notifications/{notificationId}/read")
    public ResponseEntity<ApiResponse<String>> markReviewNotificationAsRead(
            @PathVariable Long notificationId,
            @AuthenticationPrincipal UserDetails userDetails) {
        User provider = getAuthenticatedProvider(userDetails);
        reviewService.markProviderReviewNotificationAsRead(provider.getId(), notificationId);
        return ResponseEntity.ok(ApiResponse.success("Review notification marked as read", null));
    }

    /**
     * Mark all review notifications as read for logged-in provider.
     */
    @PatchMapping("/provider/my/notifications/read-all")
    public ResponseEntity<ApiResponse<Integer>> markAllReviewNotificationsAsRead(
            @AuthenticationPrincipal UserDetails userDetails) {
        User provider = getAuthenticatedProvider(userDetails);
        int updated = reviewService.markAllProviderReviewNotificationsAsRead(provider.getId());
        return ResponseEntity.ok(ApiResponse.success("All review notifications marked as read", updated));
    }
}
