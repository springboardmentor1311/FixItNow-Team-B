package com.fixitnow.controller;
import com.fixitnow.repository.UserRepository;

import com.fixitnow.dto.ApiResponse;
import com.fixitnow.dto.BookingActionRequest;
import com.fixitnow.dto.BookingDTO;
import com.fixitnow.dto.CreateBookingRequest;
import com.fixitnow.service.BookingService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;

@RestController
@RequestMapping("/bookings")
@RequiredArgsConstructor
@CrossOrigin(origins = "*", maxAge = 3600)
public class BookingController {

    private final BookingService bookingService;
    private final UserRepository userRepository;

    private Long getUserId(Principal principal) {
        return userRepository.findByEmail(principal.getName())
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + principal.getName()))
                .getId();
    }

    /**
     * Customer creates a new booking request
     * POST /api/bookings
     */
    @PostMapping
    public ResponseEntity<ApiResponse<BookingDTO>> createBooking(
            @Valid @RequestBody CreateBookingRequest request,
            Principal principal) {
        try {
            Long customerId = getUserId(principal);
            BookingDTO bookingDTO = bookingService.createBooking(customerId, request);
            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(ApiResponse.<BookingDTO>builder()
                            .success(true)
                            .message("Booking request created successfully")
                            .data(bookingDTO)
                            .build());
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(ApiResponse.<BookingDTO>builder()
                            .success(false)
                            .message(e.getMessage())
                            .build());
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.<BookingDTO>builder()
                            .success(false)
                            .message("Error creating booking: " + e.getMessage())
                            .build());
        }
    }

    /**
     * Get a specific booking by ID
     * GET /api/bookings/{id}
     */
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<BookingDTO>> getBooking(@PathVariable Long id) {
        try {
            BookingDTO bookingDTO = bookingService.getBookingById(id);
            return ResponseEntity.ok(ApiResponse.<BookingDTO>builder()
                    .success(true)
                    .message("Booking retrieved successfully")
                    .data(bookingDTO)
                    .build());
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ApiResponse.<BookingDTO>builder()
                            .success(false)
                            .message(e.getMessage())
                            .build());
        }
    }

    /**
     * Customer gets all their bookings
     * GET /api/bookings/customer/my-bookings
     */
    @GetMapping("/customer/my-bookings")
    public ResponseEntity<ApiResponse<Page<BookingDTO>>> getMyBookings(
            Principal principal,
            Pageable pageable) {
        try {
            Long customerId = getUserId(principal);
            Page<BookingDTO> bookings = bookingService.getCustomerBookings(customerId, pageable);
            return ResponseEntity.ok(ApiResponse.<Page<BookingDTO>>builder()
                    .success(true)
                    .message("Customer bookings retrieved successfully")
                    .data(bookings)
                    .build());
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.<Page<BookingDTO>>builder()
                            .success(false)
                            .message("Error retrieving bookings: " + e.getMessage())
                            .build());
        }
    }

    /**
     * Customer gets their confirmed bookings only
     * GET /api/bookings/customer/confirmed
     */
    @GetMapping("/customer/confirmed")
    public ResponseEntity<ApiResponse<Page<BookingDTO>>> getMyConfirmedBookings(
            Principal principal,
            Pageable pageable) {
        try {
            Long customerId = getUserId(principal);
            Page<BookingDTO> bookings = bookingService.getCustomerConfirmedBookings(customerId, pageable);
            return ResponseEntity.ok(ApiResponse.<Page<BookingDTO>>builder()
                    .success(true)
                    .message("Confirmed bookings retrieved successfully")
                    .data(bookings)
                    .build());
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.<Page<BookingDTO>>builder()
                            .success(false)
                            .message("Error retrieving bookings: " + e.getMessage())
                            .build());
        }
    }

    /**
     * Customer cancels their booking
     * PATCH /api/bookings/{id}/cancel
     */
    @PatchMapping("/{id}/cancel")
    public ResponseEntity<ApiResponse<BookingDTO>> cancelBooking(
            @PathVariable Long id,
            @RequestBody(required = false) BookingActionRequest request,
            Principal principal) {
        try {
            Long customerId = getUserId(principal);
            String reason = request != null ? request.getReason() : null;
            BookingDTO bookingDTO = bookingService.cancelBooking(id, customerId, reason);
            return ResponseEntity.ok(ApiResponse.<BookingDTO>builder()
                    .success(true)
                    .message("Booking cancelled successfully")
                    .data(bookingDTO)
                    .build());
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(ApiResponse.<BookingDTO>builder()
                            .success(false)
                            .message(e.getMessage())
                            .build());
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.<BookingDTO>builder()
                            .success(false)
                            .message("Error cancelling booking: " + e.getMessage())
                            .build());
        }
    }

    /**
     * Provider gets all their bookings
     * GET /api/bookings/provider/my-bookings
     */
    @GetMapping("/provider/my-bookings")
    public ResponseEntity<ApiResponse<Page<BookingDTO>>> getProviderBookings(
            Principal principal,
            Pageable pageable) {
        try {
            Long providerId = getUserId(principal);
            Page<BookingDTO> bookings = bookingService.getProviderBookings(providerId, pageable);
            return ResponseEntity.ok(ApiResponse.<Page<BookingDTO>>builder()
                    .success(true)
                    .message("Provider bookings retrieved successfully")
                    .data(bookings)
                    .build());
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.<Page<BookingDTO>>builder()
                            .success(false)
                            .message("Error retrieving bookings: " + e.getMessage())
                            .build());
        }
    }

    /**
     * Provider gets pending booking requests
     * GET /api/bookings/provider/pending
     */
    @GetMapping("/provider/pending")
    public ResponseEntity<ApiResponse<Page<BookingDTO>>> getProviderPendingBookings(
            Principal principal,
            Pageable pageable) {
        try {
            Long providerId = getUserId(principal);
            Page<BookingDTO> bookings = bookingService.getProviderPendingBookings(providerId, pageable);
            return ResponseEntity.ok(ApiResponse.<Page<BookingDTO>>builder()
                    .success(true)
                    .message("Pending bookings retrieved successfully")
                    .data(bookings)
                    .build());
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.<Page<BookingDTO>>builder()
                            .success(false)
                            .message("Error retrieving bookings: " + e.getMessage())
                            .build());
        }
    }

    /**
     * Provider gets completed bookings
     * GET /api/bookings/provider/completed
     */
    @GetMapping("/provider/completed")
    public ResponseEntity<ApiResponse<Page<BookingDTO>>> getProviderCompletedBookings(
            Principal principal,
            Pageable pageable) {
        try {
            Long providerId = getUserId(principal);
            Page<BookingDTO> bookings = bookingService.getProviderCompletedBookings(providerId, pageable);
            return ResponseEntity.ok(ApiResponse.<Page<BookingDTO>>builder()
                    .success(true)
                    .message("Completed bookings retrieved successfully")
                    .data(bookings)
                    .build());
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.<Page<BookingDTO>>builder()
                            .success(false)
                            .message("Error retrieving bookings: " + e.getMessage())
                            .build());
        }
    }

    /**
     * Provider accepts a booking request
     * PATCH /api/bookings/{id}/accept
     */
    @PatchMapping("/{id}/accept")
    public ResponseEntity<ApiResponse<BookingDTO>> acceptBooking(
            @PathVariable Long id,
            Principal principal) {
        try {
            Long providerId = getUserId(principal);
            BookingDTO bookingDTO = bookingService.acceptBooking(id, providerId);
            return ResponseEntity.ok(ApiResponse.<BookingDTO>builder()
                    .success(true)
                    .message("Booking accepted successfully")
                    .data(bookingDTO)
                    .build());
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(ApiResponse.<BookingDTO>builder()
                            .success(false)
                            .message(e.getMessage())
                            .build());
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.<BookingDTO>builder()
                            .success(false)
                            .message("Error accepting booking: " + e.getMessage())
                            .build());
        }
    }

    /**
     * Provider rejects a booking request
     * PATCH /api/bookings/{id}/reject
     */
    @PatchMapping("/{id}/reject")
    public ResponseEntity<ApiResponse<BookingDTO>> rejectBooking(
            @PathVariable Long id,
            @Valid @RequestBody BookingActionRequest request,
            Principal principal) {
        try {
            Long providerId = getUserId(principal);
            BookingDTO bookingDTO = bookingService.rejectBooking(id, providerId, request.getReason());
            return ResponseEntity.ok(ApiResponse.<BookingDTO>builder()
                    .success(true)
                    .message("Booking rejected successfully")
                    .data(bookingDTO)
                    .build());
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(ApiResponse.<BookingDTO>builder()
                            .success(false)
                            .message(e.getMessage())
                            .build());
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.<BookingDTO>builder()
                            .success(false)
                            .message("Error rejecting booking: " + e.getMessage())
                            .build());
        }
    }

    /**
     * Provider completes a booking after service is done
     * PATCH /api/bookings/{id}/complete
     */
    @PatchMapping("/{id}/complete")
    public ResponseEntity<ApiResponse<BookingDTO>> completeBooking(
            @PathVariable Long id,
            Principal principal) {
        try {
            Long providerId = getUserId(principal);
            BookingDTO bookingDTO = bookingService.completeBooking(id, providerId);
            return ResponseEntity.ok(ApiResponse.<BookingDTO>builder()
                    .success(true)
                    .message("Booking marked as completed")
                    .data(bookingDTO)
                    .build());
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(ApiResponse.<BookingDTO>builder()
                            .success(false)
                            .message(e.getMessage())
                            .build());
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.<BookingDTO>builder()
                            .success(false)
                            .message("Error completing booking: " + e.getMessage())
                            .build());
        }
    }

    /**
     * Check provider's availability for a time slot
     * GET /api/bookings/provider/{providerId}/available
     */
    @GetMapping("/provider/{providerId}/available")
    public ResponseEntity<ApiResponse<Boolean>> checkAvailability(
            @PathVariable Long providerId,
            @RequestParam String date,
            @RequestParam String timeSlot) {
        try {
            java.time.LocalDate localDate = java.time.LocalDate.parse(date);
            boolean available = bookingService.isTimeSlotAvailable(providerId, localDate, timeSlot);
            return ResponseEntity.ok(ApiResponse.<Boolean>builder()
                    .success(true)
                    .message(available ? "Time slot is available" : "Time slot is not available")
                    .data(available)
                    .build());
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(ApiResponse.<Boolean>builder()
                            .success(false)
                            .message("Invalid format. Use YYYY-MM-DD for date.")
                            .build());
        }
    }

    /**
     * Get available booking slots for a service on a specific date
     * GET /api/bookings/available-slots/{serviceId}?date=2024-01-20
     */
    @GetMapping("/available-slots/{serviceId}")
    public ResponseEntity<ApiResponse<java.util.List<com.fixitnow.dto.SlotDTO>>> getAvailableSlots(
            @PathVariable Long serviceId,
            @RequestParam String date) {
        try {
            java.time.LocalDate localDate = java.time.LocalDate.parse(date);
            java.util.List<com.fixitnow.dto.SlotDTO> slots = bookingService.generateAvailableSlots(serviceId, localDate);
            return ResponseEntity.ok(ApiResponse.<java.util.List<com.fixitnow.dto.SlotDTO>>builder()
                    .success(true)
                    .message("Available slots retrieved successfully")
                    .data(slots)
                    .build());
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(ApiResponse.<java.util.List<com.fixitnow.dto.SlotDTO>>builder()
                            .success(false)
                            .message("Invalid date format. Use YYYY-MM-DD")
                            .build());
        }
    }


    /**
     * Get pending booking count for a provider
     * GET /api/bookings/provider/pending-count
     */
    @GetMapping("/provider/pending-count")
    public ResponseEntity<ApiResponse<Long>> getPendingBookingCount(Principal principal) {
        try {
            Long providerId = getUserId(principal);
            long count = bookingService.getPendingBookingCount(providerId);
            return ResponseEntity.ok(ApiResponse.<Long>builder()
                    .success(true)
                    .message("Pending count retrieved successfully")
                    .data(count)
                    .build());
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.<Long>builder()
                            .success(false)
                            .message("Error retrieving pending count: " + e.getMessage())
                            .build());
        }
    }

    /**
     * Get alternative available providers for a service
     * Useful when primary provider is unavailable
     * GET /api/bookings/alternatives?serviceId=1&startTime=2024-01-20T10:00:00&endTime=2024-01-20T11:30:00
     */
    @GetMapping("/alternatives")
    public ResponseEntity<ApiResponse<java.util.List<com.fixitnow.dto.AlternativeProviderDTO>>> getAlternativeProviders(
            @RequestParam Long serviceId,
            @RequestParam String date,
            @RequestParam String timeSlot) {
        try {
            java.time.LocalDate localDate = java.time.LocalDate.parse(date);
            java.util.List<com.fixitnow.dto.AlternativeProviderDTO> alternatives = 
                bookingService.findAlternativeProviders(serviceId, localDate, timeSlot);

            return ResponseEntity.ok(ApiResponse.<java.util.List<com.fixitnow.dto.AlternativeProviderDTO>>builder()
                    .success(true)
                    .message("Alternative providers retrieved successfully")
                    .data(alternatives)
                    .build());
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(ApiResponse.<java.util.List<com.fixitnow.dto.AlternativeProviderDTO>>builder()
                            .success(false)
                            .message("Invalid format. Use YYYY-MM-DD for date.")
                            .build());
        }
    }

    /**
     * Get all alternative providers (available and unavailable)
     * Shows all other providers in same category with availability status
     * GET /api/bookings/alternatives-all?serviceId=1&startTime=2024-01-20T10:00:00&endTime=2024-01-20T11:30:00
     */
    @GetMapping("/alternatives-all")
    public ResponseEntity<ApiResponse<java.util.List<com.fixitnow.dto.AlternativeProviderDTO>>> getAllAlternativeProviders(
            @RequestParam Long serviceId,
            @RequestParam String date,
            @RequestParam String timeSlot) {
        try {
            java.time.LocalDate localDate = java.time.LocalDate.parse(date);
            java.util.List<com.fixitnow.dto.AlternativeProviderDTO> alternatives = 
                bookingService.getAllAlternativeProviders(serviceId, localDate, timeSlot);

            return ResponseEntity.ok(ApiResponse.<java.util.List<com.fixitnow.dto.AlternativeProviderDTO>>builder()
                    .success(true)
                    .message("All alternative providers retrieved successfully")
                    .data(alternatives)
                    .build());
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(ApiResponse.<java.util.List<com.fixitnow.dto.AlternativeProviderDTO>>builder()
                            .success(false)
                            .message("Invalid format. Use YYYY-MM-DD for date.")
                            .build());
        }
    }

    /**
     * Create booking with automatic provider fallback
     * If primary provider unavailable, books with first available alternative
     * POST /api/bookings/with-fallback
     */
    @PostMapping("/with-fallback")
    public ResponseEntity<ApiResponse<com.fixitnow.dto.BookingWithAlternativesResponse>> createBookingWithFallback(
            @Valid @RequestBody CreateBookingRequest request,
            @RequestParam(required = false, defaultValue = "false") Boolean autoFallback,
            Principal principal) {
        try {
            Long customerId = getUserId(principal);
            
            // Try to create booking with original service
            BookingDTO booking = null;
            java.util.List<com.fixitnow.dto.AlternativeProviderDTO> alternatives = java.util.Collections.emptyList();
            String message = "Booking created successfully with preferred provider";
            boolean isServiceUnavailable = false;

            try {
                booking = bookingService.createBooking(customerId, request);
            } catch (IllegalArgumentException e) {
                if (e.getMessage().contains("conflicting bookings")) {
                    // Provider unavailable, find alternatives
                    isServiceUnavailable = true;
                    alternatives = bookingService.findAlternativeProviders(
                            request.getServiceId(),
                            request.getBookingDate(),
                            request.getTimeSlot()
                    );

                    if (autoFallback && !alternatives.isEmpty()) {
                        // Auto-book with first available provider
                        CreateBookingRequest fallbackRequest = CreateBookingRequest.builder()
                                .serviceId(alternatives.get(0).getServiceId())
                                .bookingDate(request.getBookingDate())
                                .timeSlot(request.getTimeSlot())
                                .build();

                        booking = bookingService.createBooking(customerId, fallbackRequest);
                        message = "Preferred provider unavailable. Booked with alternative provider: " 
                            + alternatives.get(0).getProviderName();
                    }
                } else {
                    throw e;
                }
            }

            com.fixitnow.dto.BookingWithAlternativesResponse response = 
                com.fixitnow.dto.BookingWithAlternativesResponse.builder()
                    .booking(booking)
                    .alternativeProviders(alternatives)
                    .requestedDate(request.getBookingDate())
                    .timeSlot(request.getTimeSlot())
                    .responseMessage(message)
                    .isServiceUnavailable(isServiceUnavailable)
                    .build();

            return ResponseEntity.status(booking != null ? HttpStatus.CREATED : HttpStatus.OK)
                    .body(ApiResponse.<com.fixitnow.dto.BookingWithAlternativesResponse>builder()
                            .success(true)
                            .message(message)
                            .data(response)
                            .build());
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.<com.fixitnow.dto.BookingWithAlternativesResponse>builder()
                            .success(false)
                            .message("Error creating booking: " + e.getMessage())
                            .build());
        }
    }
}
