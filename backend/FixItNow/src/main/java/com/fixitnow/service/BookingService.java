package com.fixitnow.service;

import com.fixitnow.dto.BookingDTO;
import com.fixitnow.dto.CreateBookingRequest;
import com.fixitnow.model.Booking;
import com.fixitnow.model.BookingStatus;
import com.fixitnow.model.User;
import com.fixitnow.repository.BookingRepository;
import com.fixitnow.repository.ServiceRepository;
import com.fixitnow.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class BookingService {

    private final BookingRepository bookingRepository;
    private final ServiceRepository serviceRepository;
    private final UserRepository userRepository;

    /**
     * Generate available slots for a service on a specific date
     * Uses a default 9 AM - 6 PM window
     */
    public List<com.fixitnow.dto.SlotDTO> generateAvailableSlots(Long serviceId, java.time.LocalDate date) {
        com.fixitnow.model.Service service = serviceRepository.findById(serviceId)
                .orElseThrow(() -> new IllegalArgumentException("Service not found"));

        // Default working hours: 09:00 to 18:00 (6 PM)
        java.time.LocalTime currentSlotStart = java.time.LocalTime.of(9, 0);
        java.time.LocalTime endOfDay = java.time.LocalTime.of(18, 0);
        int duration = service.getDurationMinutes() != null && service.getDurationMinutes() > 0 
                ? service.getDurationMinutes() : 120;

        List<com.fixitnow.dto.SlotDTO> availableSlots = new java.util.ArrayList<>();

        // Generate slots starting from currentSlotStart up to endOfDay
        while (currentSlotStart.plusMinutes(duration).isBefore(endOfDay) ||
                currentSlotStart.plusMinutes(duration).equals(endOfDay)) {

            java.time.LocalTime currentSlotEnd = currentSlotStart.plusMinutes(duration);
            String timeSlotStr = currentSlotStart.toString() + " - " + currentSlotEnd.toString();

            boolean hasConflict = bookingRepository.findConflictingBookings(
                    service.getProvider().getId(), date, timeSlotStr).size() > 0;

            if (!hasConflict) {
                availableSlots.add(com.fixitnow.dto.SlotDTO.builder()
                        .startTime(date.atTime(currentSlotStart))
                        .endTime(date.atTime(currentSlotEnd))
                        .available(true)
                        .build());
            }

            // Move to next 30-min window
            currentSlotStart = currentSlotStart.plusMinutes(30);
        }

        return availableSlots;
    }

    /**
     * Create a new booking request
     */
    @Transactional
    public BookingDTO createBooking(Long customerId, CreateBookingRequest request) {
        // Validate customer exists
        User customer = userRepository.findById(customerId)
                .orElseThrow(() -> new IllegalArgumentException("Customer not found"));

        // Validate service exists
        com.fixitnow.model.Service serviceEntity = serviceRepository.findById(request.getServiceId())
                .orElseThrow(() -> new IllegalArgumentException("Service not found"));

        // Check for conflicts
        List<Booking> conflicts = bookingRepository.findConflictingBookings(
                serviceEntity.getProvider().getId(),
                request.getBookingDate(),
                request.getTimeSlot());

        if (!conflicts.isEmpty()) {
            throw new IllegalArgumentException("Provider has conflicting bookings during this time slot");
        }

        // Create booking
        Booking booking = Booking.builder()
                .customer(customer)
                .provider(serviceEntity.getProvider())
                .service(serviceEntity)
                .bookingDate(request.getBookingDate())
                .timeSlot(request.getTimeSlot())
                .status(BookingStatus.PENDING)
                .build();

        Booking savedBooking = bookingRepository.save(booking);
        return mapToDTO(savedBooking);
    }

    /**
     * Provider accepts a booking
     */
    @Transactional
    public BookingDTO acceptBooking(Long bookingId, Long providerId) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new IllegalArgumentException("Booking not found"));

        if (!booking.getProvider().getId().equals(providerId)) {
            throw new IllegalArgumentException("Not authorized");
        }

        if (booking.getStatus() != BookingStatus.PENDING) {
            throw new IllegalArgumentException("Can only accept bookings in PENDING status. Current status: " + booking.getStatus());
        }

        booking.setStatus(BookingStatus.CONFIRMED);
        return mapToDTO(bookingRepository.save(booking));
    }

    /**
     * Provider rejects a booking
     */
    @Transactional
    public BookingDTO rejectBooking(Long bookingId, Long providerId, String reason) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new IllegalArgumentException("Booking not found"));

        if (!booking.getProvider().getId().equals(providerId)) {
            throw new IllegalArgumentException("Not authorized");
        }

        if (booking.getStatus() != BookingStatus.PENDING) {
            throw new IllegalArgumentException("Can only reject bookings in PENDING status. Current status: " + booking.getStatus());
        }

        booking.setStatus(BookingStatus.CANCELLED);
        return mapToDTO(bookingRepository.save(booking));
    }

    /**
     * Customer cancels a booking
     */
    @Transactional
    public BookingDTO cancelBooking(Long bookingId, Long customerId, String reason) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new IllegalArgumentException("Booking not found"));

        if (!booking.getCustomer().getId().equals(customerId)) {
            throw new IllegalArgumentException("Not authorized");
        }

        booking.setStatus(BookingStatus.CANCELLED);
        return mapToDTO(bookingRepository.save(booking));
    }

    /**
     * Mark booking as completed
     */
    @Transactional
    public BookingDTO completeBooking(Long bookingId, Long providerId) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new IllegalArgumentException("Booking not found"));

        if (!booking.getProvider().getId().equals(providerId)) {
            throw new IllegalArgumentException("Not authorized");
        }

        if (booking.getStatus() != BookingStatus.CONFIRMED) {
            throw new IllegalArgumentException("Can only complete bookings in CONFIRMED status. Current status: " + booking.getStatus());
        }

        booking.setStatus(BookingStatus.COMPLETED);
        return mapToDTO(bookingRepository.save(booking));
    }

    /**
     * Get booking by ID
     */
    public BookingDTO getBookingById(Long bookingId) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new IllegalArgumentException("Booking not found"));

        return mapToDTO(booking);
    }

    /**
     * Get all bookings for a customer
     */
    public Page<BookingDTO> getCustomerBookings(Long customerId, Pageable pageable) {
        return bookingRepository.findByCustomerId(customerId, pageable)
                .map(this::mapToDTO);
    }

    /**
     * Get all bookings for a provider
     */
    public Page<BookingDTO> getProviderBookings(Long providerId, Pageable pageable) {
        return bookingRepository.findByProviderId(providerId, pageable)
                .map(this::mapToDTO);
    }

    /**
     * Get pending bookings for a provider
     */
    public Page<BookingDTO> getProviderPendingBookings(Long providerId, Pageable pageable) {
        return bookingRepository.findByProviderIdAndStatus(providerId, BookingStatus.PENDING, pageable)
                .map(this::mapToDTO);
    }

    /**
     * Get confirmed bookings for a customer
     */
    public Page<BookingDTO> getCustomerConfirmedBookings(Long customerId, Pageable pageable) {
        return bookingRepository.findByCustomerIdAndStatus(customerId, BookingStatus.CONFIRMED, pageable)
                .map(this::mapToDTO);
    }

    /**
     * Get completed bookings for a provider
     */
    public Page<BookingDTO> getProviderCompletedBookings(Long providerId, Pageable pageable) {
        return bookingRepository.findByProviderIdAndStatus(providerId, BookingStatus.COMPLETED, pageable)
                .map(this::mapToDTO);
    }

    /**
     * Get provider's available time slots (checking conflicts)
     */
    public boolean isTimeSlotAvailable(Long providerId, java.time.LocalDate date, String timeSlot) {
        List<Booking> conflicts = bookingRepository.findConflictingBookings(providerId, date, timeSlot);
        return conflicts.isEmpty();
    }

    /**
     * Get count of pending bookings for a provider
     */
    public long getPendingBookingCount(Long providerId) {
        return bookingRepository.findByProviderIdAndStatus(providerId, BookingStatus.PENDING, Pageable.unpaged())
                .getTotalElements();
    }


    /**
     * Find alternative providers for the same service category
     */
    public List<com.fixitnow.dto.AlternativeProviderDTO> findAlternativeProviders(
            Long serviceId,
            java.time.LocalDate date,
            String timeSlot) {

        // Get the original service
        com.fixitnow.model.Service originalService = serviceRepository.findById(serviceId)
                .orElseThrow(() -> new IllegalArgumentException("Service not found"));

        String category = originalService.getCategory();

        // Find all services in the same category (excluding original provider)
        List<com.fixitnow.model.Service> alternativeServices = serviceRepository.findByCategory(category);

        return alternativeServices.stream()
                .filter(svc -> !svc.getProvider().getId().equals(originalService.getProvider().getId()))
                .map(svc -> {
                    boolean isAvailable = isTimeSlotAvailable(svc.getProvider().getId(), date, timeSlot);

                    return com.fixitnow.dto.AlternativeProviderDTO.builder()
                            .providerId(svc.getProvider().getId())
                            .providerName(svc.getProvider().getName())
                            .phone(svc.getProvider().getPhone())
                            .email(svc.getProvider().getEmail())
                            .serviceId(svc.getId())
                            .servicePrice(svc.getPrice())
                            .serviceDescription(svc.getDescription())
                            .location(svc.getLocation())
                            .isAvailable(isAvailable)
                            .availabilityStatus(isAvailable ? "AVAILABLE" : "UNAVAILABLE")
                            .build();
                })
                .filter(alt -> alt.getIsAvailable()) // Only show available providers
                .collect(java.util.stream.Collectors.toList());
    }

    /**
     * Get all alternative providers (available or not)
     */
    public List<com.fixitnow.dto.AlternativeProviderDTO> getAllAlternativeProviders(
            Long serviceId,
            java.time.LocalDate date,
            String timeSlot) {

        // Get the original service
        com.fixitnow.model.Service originalService = serviceRepository.findById(serviceId)
                .orElseThrow(() -> new IllegalArgumentException("Service not found"));

        String category = originalService.getCategory();

        // Find all services in the same category (excluding original provider)
        List<com.fixitnow.model.Service> alternativeServices = serviceRepository.findByCategory(category);

        return alternativeServices.stream()
                .filter(svc -> !svc.getProvider().getId().equals(originalService.getProvider().getId()))
                .map(svc -> {
                    boolean isAvailable = isTimeSlotAvailable(svc.getProvider().getId(), date, timeSlot);

                    return com.fixitnow.dto.AlternativeProviderDTO.builder()
                            .providerId(svc.getProvider().getId())
                            .providerName(svc.getProvider().getName())
                            .phone(svc.getProvider().getPhone())
                            .email(svc.getProvider().getEmail())
                            .serviceId(svc.getId())
                            .servicePrice(svc.getPrice())
                            .serviceDescription(svc.getDescription())
                            .location(svc.getLocation())
                            .isAvailable(isAvailable)
                            .availabilityStatus(isAvailable ? "AVAILABLE" : "UNAVAILABLE")
                            .build();
                })
                .collect(java.util.stream.Collectors.toList());
    }


    /**
     * Convert Booking entity to BookingDTO
     */
    private BookingDTO mapToDTO(Booking booking) {
        return BookingDTO.builder()
                .id(booking.getId())
                .customerId(booking.getCustomer().getId())
                .customerName(booking.getCustomer().getName())
                .providerId(booking.getProvider().getId())
                .providerName(booking.getProvider().getName())
                .serviceId(booking.getService().getId())
                .serviceName(booking.getService().getCategory())
                .bookingDate(booking.getBookingDate())
                .timeSlot(booking.getTimeSlot())
                .status(booking.getStatus())
                .createdAt(booking.getCreatedAt())
                .build();
    }
}
