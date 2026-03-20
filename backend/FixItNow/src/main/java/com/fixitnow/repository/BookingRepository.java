package com.fixitnow.repository;

import com.fixitnow.model.Booking;
import com.fixitnow.model.BookingStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface BookingRepository extends JpaRepository<Booking, Long> {

    /**
     * Find all bookings for a specific customer with pagination
     */
    Page<Booking> findByCustomerId(Long customerId, Pageable pageable);

    /**
     * Find all bookings for a specific provider with pagination
     */
    Page<Booking> findByProviderId(Long providerId, Pageable pageable);

    /**
     * Find all bookings for a specific service
     */
    List<Booking> findByServiceId(Long serviceId);

    /**
     * Find bookings by status
     */
    List<Booking> findByStatus(BookingStatus status);

    /**
     * Find bookings for a provider with specific status
     */
    Page<Booking> findByProviderIdAndStatus(Long providerId, BookingStatus status, Pageable pageable);

    /**
     * Find bookings for a customer with specific status
     */
    Page<Booking> findByCustomerIdAndStatus(Long customerId, BookingStatus status, Pageable pageable);

    /**
     * Check for booking conflicts - bookings that overlap with the given time slot
     */
    @Query("SELECT b FROM Booking b WHERE b.provider.id = :providerId " +
            "AND b.status != 'CANCELLED' " +
            "AND b.bookingDate = :bookingDate " +
            "AND b.timeSlot = :timeSlot")
    List<Booking> findConflictingBookings(
            @Param("providerId") Long providerId,
            @Param("bookingDate") java.time.LocalDate bookingDate,
            @Param("timeSlot") String timeSlot);

    /**
     * Find all pending bookings for a provider
     */
    List<Booking> findByProviderIdAndStatusOrderByBookingDateAsc(Long providerId, BookingStatus status);

    /**
     * Find bookings within a date range for statistics
     */
    @Query("SELECT b FROM Booking b WHERE b.provider.id = :providerId " +
            "AND b.status = :status " +
            "AND b.bookingDate BETWEEN :startDate AND :endDate")
    List<Booking> findBookingsByProviderAndDateRange(
            @Param("providerId") Long providerId,
            @Param("status") BookingStatus status,
            @Param("startDate") java.time.LocalDate startDate,
            @Param("endDate") java.time.LocalDate endDate);
}
