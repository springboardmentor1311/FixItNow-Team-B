package com.fixitnow.service;

import com.fixitnow.dto.BookingCreateRequest;
import com.fixitnow.dto.BookingResponseDTO;
import com.fixitnow.dto.BookingStatusUpdateRequest;
import com.fixitnow.dto.DashboardBookingStatsDTO;
import com.fixitnow.model.Booking;
import com.fixitnow.model.BookingStatus;
import com.fixitnow.model.User;
import com.fixitnow.model.UserRole;
import com.fixitnow.repository.BookingRepository;
import com.fixitnow.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

@Service
@RequiredArgsConstructor
public class BookingService {

    private final BookingRepository bookingRepository;
    private final UserRepository userRepository;

    @Transactional
    public BookingResponseDTO createBooking(Long actorUserId, BookingCreateRequest request) {
        User customer = userRepository.findById(actorUserId)
                .orElseThrow(() -> new IllegalArgumentException("Customer not found"));

        User provider = null;
        if (request.getProviderId() != null) {
            provider = userRepository.findById(request.getProviderId())
                    .orElseThrow(() -> new IllegalArgumentException("Provider not found"));
        }

        Booking booking = Booking.builder()
                .customer(customer)
                .customerName(customer.getName())
                .serviceType(request.getServiceType())
                .bookingDate(request.getBookingDate())
                .timeSlot(request.getTimeSlot())
                .problemDescription(request.getProblemDescription())
                .status(BookingStatus.PENDING)
                .provider(provider)
                .build();

        Booking saved = bookingRepository.save(booking);
        return toDto(saved);
    }

    @Transactional(readOnly = true)
    public List<BookingResponseDTO> getBookingsForCustomer(Long customerId) {
        return bookingRepository.findByCustomer_IdOrderByCreatedAtDesc(customerId)
                .stream()
                .map(this::toDto)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<BookingResponseDTO> getBookingsForProviderInbox(Long providerId) {
        User provider = userRepository.findById(providerId)
                .orElseThrow(() -> new IllegalArgumentException("Provider not found"));
        String providerLocation = provider.getLocation();

        return bookingRepository.findProviderInbox(providerId, BookingStatus.PENDING, providerLocation)
                .stream()
                .map(this::toDto)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<BookingResponseDTO> getAllBookingsFiltered(BookingStatus status, UserRole userRole, Long userId) {
        if (userRole == null || userId == null) {
            return bookingRepository.findAll()
                    .stream()
                    .sorted((a, b) -> b.getCreatedAt().compareTo(a.getCreatedAt()))
                    .map(this::toDto)
                    .toList();
        }

        if (userRole == UserRole.CUSTOMER) {
            return bookingRepository.findByCustomer_IdOrderByCreatedAtDesc(userId)
                    .stream()
                    .filter(b -> status == null || b.getStatus() == status)
                    .map(this::toDto)
                    .toList();
        }

        if (userRole == UserRole.PROVIDER) {
            return getBookingsForProviderInbox(userId)
                    .stream()
                    .filter(b -> status == null || Objects.equals(b.getStatus(), status))
                    .toList();
        }

        // ADMIN
        return bookingRepository.findAll()
                .stream()
                .sorted((a, b) -> b.getCreatedAt().compareTo(a.getCreatedAt()))
                .filter(b -> status == null || b.getStatus() == status)
                .map(this::toDto)
                .toList();
    }

    @Transactional
    public BookingResponseDTO updateStatus(String bookingId, Long actorUserId, UserRole actorRole, BookingStatusUpdateRequest request) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new IllegalArgumentException("Booking not found"));

        BookingStatus target = request.getStatus();
        BookingStatus current = booking.getStatus();
        validateTransition(current, target);

        if (target == BookingStatus.CONFIRMED) {
            ensureProviderCanConfirm(booking, actorUserId, actorRole);
        } else if (target == BookingStatus.COMPLETED) {
            ensureProviderCanComplete(booking, actorUserId, actorRole);
        } else if (target == BookingStatus.CANCELLED) {
            ensureCanCancel(booking, actorUserId, actorRole);
        }

        booking.setStatus(target);
        Booking saved = bookingRepository.save(booking);
        return toDto(saved);
    }

    @Transactional(readOnly = true)
    public DashboardBookingStatsDTO getDashboardStats(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        Map<BookingStatus, Long> counts = new EnumMap<>(BookingStatus.class);
        for (BookingStatus status : BookingStatus.values()) {
            counts.put(status, 0L);
        }

        if (user.getRole() == UserRole.CUSTOMER) {
            bookingRepository.countByStatusForCustomer(userId).forEach(row -> {
                BookingStatus status = (BookingStatus) row[0];
                Long count = (Long) row[1];
                counts.put(status, count);
            });
        } else if (user.getRole() == UserRole.PROVIDER) {
            bookingRepository.countByStatusForProvider(userId).forEach(row -> {
                BookingStatus status = (BookingStatus) row[0];
                Long count = (Long) row[1];
                counts.put(status, count);
            });

            long pendingInArea = bookingRepository.countPendingInProviderArea(BookingStatus.PENDING, user.getLocation());
            counts.put(BookingStatus.PENDING, pendingInArea);
        } else {
            // ADMIN: simple aggregation via filtering in memory (small datasets)
            bookingRepository.findAll().forEach(b -> counts.put(b.getStatus(), counts.get(b.getStatus()) + 1));
        }

        long total = counts.values().stream().mapToLong(Long::longValue).sum();

        return DashboardBookingStatsDTO.builder()
                .total(total)
                .pending(counts.get(BookingStatus.PENDING))
                .confirmed(counts.get(BookingStatus.CONFIRMED))
                .completed(counts.get(BookingStatus.COMPLETED))
                .cancelled(counts.get(BookingStatus.CANCELLED))
                .build();
    }

    private void validateTransition(BookingStatus current, BookingStatus target) {
        if (target == null) throw new IllegalArgumentException("Status is required");
        if (current == target) return;

        if (current == BookingStatus.CANCELLED || current == BookingStatus.COMPLETED) {
            throw new IllegalStateException("Booking is already " + current.getValue() + " and cannot be changed");
        }

        if (current == BookingStatus.PENDING && (target == BookingStatus.CONFIRMED || target == BookingStatus.CANCELLED)) {
            return;
        }

        if (current == BookingStatus.CONFIRMED && (target == BookingStatus.COMPLETED || target == BookingStatus.CANCELLED)) {
            return;
        }

        throw new IllegalStateException("Invalid status transition: " + current.getValue() + " -> " + target.getValue());
    }

    private void ensureProviderCanConfirm(Booking booking, Long actorUserId, UserRole actorRole) {
        if (actorRole != UserRole.PROVIDER && actorRole != UserRole.ADMIN) {
            throw new SecurityException("Only provider can confirm a booking");
        }

        if (actorRole == UserRole.ADMIN) return;

        User actor = userRepository.findById(actorUserId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        if (booking.getProvider() == null) {
            booking.setProvider(actor);
            return;
        }

        if (!Objects.equals(booking.getProvider().getId(), actorUserId)) {
            throw new SecurityException("This booking is assigned to another provider");
        }
    }

    private void ensureProviderCanComplete(Booking booking, Long actorUserId, UserRole actorRole) {
        if (actorRole != UserRole.PROVIDER && actorRole != UserRole.ADMIN) {
            throw new SecurityException("Only provider can complete a booking");
        }
        if (actorRole == UserRole.ADMIN) return;

        if (booking.getProvider() == null || !Objects.equals(booking.getProvider().getId(), actorUserId)) {
            throw new SecurityException("Only the assigned provider can complete this booking");
        }
    }

    private void ensureCanCancel(Booking booking, Long actorUserId, UserRole actorRole) {
        if (actorRole == UserRole.ADMIN) return;

        boolean isCustomer = booking.getCustomer() != null && Objects.equals(booking.getCustomer().getId(), actorUserId);
        boolean isProvider = booking.getProvider() != null && Objects.equals(booking.getProvider().getId(), actorUserId);

        if (!isCustomer && !isProvider) {
            throw new SecurityException("Only the customer or assigned provider can cancel this booking");
        }
    }

    private BookingResponseDTO toDto(Booking booking) {
        User customer = booking.getCustomer();
        User provider = booking.getProvider();

        return BookingResponseDTO.builder()
                .id(booking.getId())
                .customerId(customer != null ? customer.getId() : null)
                .customerName(booking.getCustomerName())
                .customerLocation(customer != null ? customer.getLocation() : null)
                .serviceType(booking.getServiceType())
                .bookingDate(booking.getBookingDate())
                .timeSlot(booking.getTimeSlot())
                .problemDescription(booking.getProblemDescription())
                .status(booking.getStatus())
                .providerId(provider != null ? provider.getId() : null)
                .providerName(provider != null ? provider.getName() : null)
                .providerLocation(provider != null ? provider.getLocation() : null)
                .createdAt(booking.getCreatedAt())
                .updatedAt(booking.getUpdatedAt())
                .build();
    }
}

