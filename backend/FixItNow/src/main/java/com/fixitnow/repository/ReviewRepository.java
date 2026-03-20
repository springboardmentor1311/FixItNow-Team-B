package com.fixitnow.repository;

import com.fixitnow.model.Review;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

@Repository
public interface ReviewRepository extends JpaRepository<Review, Long> {

    /**
     * Find all reviews for a specific service
     */
    List<Review> findByServiceId(Long serviceId);

    /**
     * Find all reviews for a specific service (paginated)
     */
    Page<Review> findByServiceId(Long serviceId, Pageable pageable);

    /**
     * Find all reviews for a specific provider (service provider)
     */
    List<Review> findByProviderId(Long providerId);

    /**
     * Find all reviews for a specific provider (paginated)
     */
    Page<Review> findByProviderId(Long providerId, Pageable pageable);

    /**
     * Find all reviews by a specific customer
     */
    List<Review> findByCustomerId(Long customerId);

    /**
     * Find reviews for a specific service by a specific customer
     */
    Optional<Review> findByServiceIdAndCustomerId(Long serviceId, Long customerId);

    /**
     * Count reviews for a service
     */
    long countByServiceId(Long serviceId);

    /**
     * Count reviews for a provider
     */
    long countByProviderId(Long providerId);

    /**
     * Get average rating for a service
     */
    @Query("SELECT AVG(r.rating) FROM Review r WHERE r.service.id = :serviceId")
    Optional<BigDecimal> getAverageRatingByServiceId(@Param("serviceId") Long serviceId);

    /**
     * Get average rating for a provider
     */
    @Query("SELECT AVG(r.rating) FROM Review r WHERE r.provider.id = :providerId")
    Optional<BigDecimal> getAverageRatingByProviderId(@Param("providerId") Long providerId);

    /**
     * Get top-rated services
     */
    @Query("SELECT r.service.id, AVG(r.rating) as avgRating FROM Review r " +
            "GROUP BY r.service.id ORDER BY avgRating DESC")
    Page<Object[]> getTopRatedServices(Pageable pageable);
}
