package com.fixitnow.controller;

import com.fixitnow.dto.ApiResponse;
import com.fixitnow.dto.BookingCreateRequest;
import com.fixitnow.dto.BookingResponseDTO;
import com.fixitnow.dto.BookingStatusUpdateRequest;
import com.fixitnow.model.BookingStatus;
import com.fixitnow.model.User;
import com.fixitnow.model.UserRole;
import com.fixitnow.repository.UserRepository;
import com.fixitnow.service.BookingService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Objects;

@Slf4j
@RestController
@RequestMapping("/bookings")
@RequiredArgsConstructor
@CrossOrigin(origins = "*", maxAge = 3600)
public class BookingController {

    private final BookingService bookingService;
    private final UserRepository userRepository;

    @PostMapping({ "", "/" })
    public ResponseEntity<ApiResponse<BookingResponseDTO>> createBooking(
            @Valid @RequestBody BookingCreateRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {

        try {
            User actor = requireUser(userDetails);
            BookingResponseDTO created = bookingService.createBooking(actor.getId(), request);
            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(ApiResponse.success("Booking created successfully", created));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        } catch (Exception e) {
            log.error("Create booking failed", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("Failed to create booking"));
        }
    }

    @GetMapping("/customer/{id}")
    public ResponseEntity<ApiResponse<List<BookingResponseDTO>>> getBookingsForCustomer(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails) {
        try {
            User actor = requireUser(userDetails);
            if (actor.getRole() != UserRole.ADMIN && !Objects.equals(actor.getId(), id)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(ApiResponse.error("You are not allowed to view these bookings"));
            }
            List<BookingResponseDTO> bookings = bookingService.getBookingsForCustomer(id);
            return ResponseEntity.ok(ApiResponse.success("Customer bookings fetched", bookings));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        } catch (Exception e) {
            log.error("Fetch customer bookings failed", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("Failed to fetch bookings"));
        }
    }

    @GetMapping("/provider/{id}")
    public ResponseEntity<ApiResponse<List<BookingResponseDTO>>> getBookingsForProvider(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails) {
        try {
            User actor = requireUser(userDetails);
            if (actor.getRole() != UserRole.ADMIN && !Objects.equals(actor.getId(), id)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(ApiResponse.error("You are not allowed to view these bookings"));
            }
            List<BookingResponseDTO> bookings = bookingService.getBookingsForProviderInbox(id);
            return ResponseEntity.ok(ApiResponse.success("Provider bookings fetched", bookings));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        } catch (Exception e) {
            log.error("Fetch provider bookings failed", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("Failed to fetch bookings"));
        }
    }

    /**
     * GET /bookings?status=Pending&userRole=CUSTOMER&userId=1
     * Allows filtering by status and role scope.
     */
    @GetMapping({ "", "/" })
    public ResponseEntity<ApiResponse<List<BookingResponseDTO>>> getBookings(
            @RequestParam(required = false) BookingStatus status,
            @RequestParam(required = false, name = "user_role") UserRole userRole,
            @RequestParam(required = false) Long userId,
            @AuthenticationPrincipal UserDetails userDetails) {
        try {
            User actor = requireUser(userDetails);

            if (userRole != null && userId != null && actor.getRole() != UserRole.ADMIN && !Objects.equals(actor.getId(), userId)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(ApiResponse.error("You are not allowed to view these bookings"));
            }

            List<BookingResponseDTO> bookings = bookingService.getAllBookingsFiltered(status, userRole, userId);
            return ResponseEntity.ok(ApiResponse.success("Bookings fetched", bookings));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        } catch (Exception e) {
            log.error("Fetch bookings failed", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("Failed to fetch bookings"));
        }
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<ApiResponse<BookingResponseDTO>> updateStatus(
            @PathVariable String id,
            @Valid @RequestBody BookingStatusUpdateRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        return handleStatusUpdate(id, request, userDetails);
    }

    /**
     * Alias for frontend compatibility: PATCH /bookings/:id
     */
    @PatchMapping("/{id}")
    public ResponseEntity<ApiResponse<BookingResponseDTO>> updateStatusAlias(
            @PathVariable String id,
            @Valid @RequestBody BookingStatusUpdateRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        return handleStatusUpdate(id, request, userDetails);
    }

    private ResponseEntity<ApiResponse<BookingResponseDTO>> handleStatusUpdate(
            String id,
            BookingStatusUpdateRequest request,
            UserDetails userDetails) {
        try {
            User actor = requireUser(userDetails);
            BookingResponseDTO updated = bookingService.updateStatus(id, actor.getId(), actor.getRole(), request);
            return ResponseEntity.ok(ApiResponse.success("Booking status updated", updated));
        } catch (SecurityException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(ApiResponse.error(e.getMessage()));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(ApiResponse.error(e.getMessage()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(ApiResponse.error(e.getMessage()));
        } catch (Exception e) {
            log.error("Update booking status failed", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("Failed to update booking status"));
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

