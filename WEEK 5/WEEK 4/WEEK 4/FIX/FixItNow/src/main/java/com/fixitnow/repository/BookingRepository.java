package com.fixitnow.repository;

import com.fixitnow.model.Booking;
import com.fixitnow.model.BookingStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface BookingRepository extends JpaRepository<Booking, String> {

    List<Booking> findByCustomer_IdOrderByCreatedAtDesc(Long customerId);

    List<Booking> findByProvider_IdOrderByCreatedAtDesc(Long providerId);

    @Query("""
            select b from Booking b
            join b.customer c
            where (b.provider is not null and b.provider.id = :providerId)
               or (b.status = :pendingStatus and (:providerLocation is null or :providerLocation = '' or lower(c.location) = lower(:providerLocation)))
            order by b.createdAt desc
            """)
    List<Booking> findProviderInbox(
            @Param("providerId") Long providerId,
            @Param("pendingStatus") BookingStatus pendingStatus,
            @Param("providerLocation") String providerLocation
    );

    @Query("""
            select b.status, count(b)
            from Booking b
            where b.customer.id = :customerId
            group by b.status
            """)
    List<Object[]> countByStatusForCustomer(@Param("customerId") Long customerId);

    @Query("""
            select b.status, count(b)
            from Booking b
            where b.provider is not null and b.provider.id = :providerId
            group by b.status
            """)
    List<Object[]> countByStatusForProvider(@Param("providerId") Long providerId);

    @Query("""
            select count(b)
            from Booking b
            join b.customer c
            where b.status = :pendingStatus
              and (:providerLocation is null or :providerLocation = '' or lower(c.location) = lower(:providerLocation))
            """)
    long countPendingInProviderArea(
            @Param("pendingStatus") BookingStatus pendingStatus,
            @Param("providerLocation") String providerLocation
    );
}

