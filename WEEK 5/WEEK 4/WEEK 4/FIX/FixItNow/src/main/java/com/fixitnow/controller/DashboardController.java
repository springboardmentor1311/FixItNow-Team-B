package com.fixitnow.controller;

import com.fixitnow.dto.ApiResponse;
import com.fixitnow.dto.DashboardBookingStatsDTO;
import com.fixitnow.model.User;
import com.fixitnow.repository.UserRepository;
import com.fixitnow.service.BookingService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

@Slf4j
@RestController
@RequestMapping("/dashboard")
@RequiredArgsConstructor
@CrossOrigin(origins = "*", maxAge = 3600)
public class DashboardController {

    private final BookingService bookingService;
    private final UserRepository userRepository;

    @GetMapping("/stats/{userId}")
    public ResponseEntity<ApiResponse<DashboardBookingStatsDTO>> statsByUserId(
            @PathVariable Long userId,
            @AuthenticationPrincipal UserDetails userDetails) {
        try {
            User actor = requireUser(userDetails);
            if (!actor.getId().equals(userId) && actor.getRole() != com.fixitnow.model.UserRole.ADMIN) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(ApiResponse.error("You are not allowed to view these stats"));
            }
            DashboardBookingStatsDTO stats = bookingService.getDashboardStats(userId);
            return ResponseEntity.ok(ApiResponse.success("Dashboard stats fetched", stats));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        } catch (Exception e) {
            log.error("Fetch dashboard stats failed", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("Failed to fetch dashboard stats"));
        }
    }

    /**
     * Alias: GET /dashboard/stats?userId=123
     * If userId is not provided, defaults to the authenticated user.
     */
    @GetMapping("/stats")
    public ResponseEntity<ApiResponse<DashboardBookingStatsDTO>> stats(
            @RequestParam(required = false) Long userId,
            @AuthenticationPrincipal UserDetails userDetails) {
        try {
            User actor = requireUser(userDetails);
            Long effectiveUserId = userId != null ? userId : actor.getId();
            if (!actor.getId().equals(effectiveUserId) && actor.getRole() != com.fixitnow.model.UserRole.ADMIN) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(ApiResponse.error("You are not allowed to view these stats"));
            }
            DashboardBookingStatsDTO stats = bookingService.getDashboardStats(effectiveUserId);
            return ResponseEntity.ok(ApiResponse.success("Dashboard stats fetched", stats));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        } catch (Exception e) {
            log.error("Fetch dashboard stats failed", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("Failed to fetch dashboard stats"));
        }
    }

    private User requireUser(UserDetails userDetails) {
        if (userDetails == null) {
            throw new SecurityException("Unauthorized");
        }
        return userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
    }
}

