package com.fixitnow.model;

/**
 * Enum representing the lifecycle of a booking.
 * - PENDING: Initial state, awaiting provider confirmation
 * - CONFIRMED: Provider has accepted the booking
 * - COMPLETED: Service has been completed
 * - CANCELLED: Booking has been cancelled by customer or provider
 */
public enum BookingStatus {
    PENDING,
    CONFIRMED,
    COMPLETED,
    CANCELLED
}
