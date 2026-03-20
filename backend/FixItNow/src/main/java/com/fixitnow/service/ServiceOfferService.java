package com.fixitnow.service;

import com.fixitnow.dto.ServiceDTO;
import com.fixitnow.dto.ServiceResponseDTO;
import com.fixitnow.model.*;
import com.fixitnow.repository.CategoryRepository;
import com.fixitnow.repository.ServiceRepository;
import com.fixitnow.repository.SubcategoryRepository;
import com.fixitnow.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ServiceOfferService {

    private final ServiceRepository serviceRepository;
    private final UserRepository userRepository;
    private final CategoryRepository categoryRepository;
    private final SubcategoryRepository subcategoryRepository;

    @Transactional
    public ServiceResponseDTO createService(Long providerId, ServiceDTO serviceDTO) {
        User provider = userRepository.findById(providerId)
                .orElseThrow(() -> new IllegalArgumentException("Provider not found"));

        if (provider.getRole() != UserRole.PROVIDER && provider.getRole() != UserRole.ADMIN) {
            throw new IllegalArgumentException("Only providers and admins can create services");
        }

        /*
         * Blocked for testing purposes - providers can now create services without
         * approval
         * if (provider.getApprovalStatus() != ApprovalStatus.APPROVED) {
         * throw new
         * IllegalArgumentException("Provider account must be approved to create services"
         * );
         * }
         */

        String categoryName = null;
        if (serviceDTO.getCategoryName() != null) {
            categoryName = serviceDTO.getCategoryName();
        } else if (serviceDTO.getCategoryId() != null) {
            categoryName = categoryRepository.findById(serviceDTO.getCategoryId())
                    .map(Category::getName)
                    .orElseThrow(() -> new IllegalArgumentException(
                            "Category not found with ID: " + serviceDTO.getCategoryId()));
        } else {
            throw new IllegalArgumentException("Category name or ID is required");
        }

        // Verify category exists in master data
        final String finalCategoryName = categoryName;
        categoryRepository.findByName(finalCategoryName)
                .orElseThrow(() -> new IllegalArgumentException(
                        "Category '" + finalCategoryName + "' is not a valid category"));

        String subcategoryName = serviceDTO.getSubcategoryName();
        if (subcategoryName == null && serviceDTO.getSubcategoryId() != null) {
            subcategoryName = subcategoryRepository.findById(serviceDTO.getSubcategoryId())
                    .map(Subcategory::getName)
                    .orElse(null);
        }

        // If subcategory is provided, verify it belongs to the category
        if (subcategoryName != null) {
            final String finalSubcategoryName = subcategoryName;
            subcategoryRepository.findByNameAndCategoryName(finalSubcategoryName, finalCategoryName)
                    .orElseThrow(() -> new IllegalArgumentException("Subcategory '" + finalSubcategoryName
                            + "' not found in category '" + finalCategoryName + "'"));
        }

        com.fixitnow.model.Service service = com.fixitnow.model.Service.builder()
                .provider(provider)
                .category(categoryName)
                .subcategory(subcategoryName)
                .description(serviceDTO.getDescription())
                .price(serviceDTO.getPrice())
                .availability(serviceDTO.getAvailability())
                .durationMinutes(serviceDTO.getDurationMinutes() != null ? serviceDTO.getDurationMinutes() : 120)
                .location(serviceDTO.getLocation())
                .latitude(serviceDTO.getLatitude())
                .longitude(serviceDTO.getLongitude())
                .build();

        service = serviceRepository.save(service);
        return mapToResponseDTO(service);
    }

    @Transactional(readOnly = true)
    public ServiceResponseDTO getServiceById(Long id) {
        com.fixitnow.model.Service service = serviceRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Service not found"));
        return mapToResponseDTO(service);
    }

    @Transactional(readOnly = true)
    public List<ServiceResponseDTO> getServicesByProvider(Long providerId) {
        return serviceRepository.findByProviderId(providerId).stream()
                .map(this::mapToResponseDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public Page<ServiceResponseDTO> searchServices(Long categoryId, String location, BigDecimal minPrice,
            BigDecimal maxPrice, Pageable pageable) {
        Specification<com.fixitnow.model.Service> spec = Specification.where(null);

        if (categoryId != null) {
            // If categoryId is provided, we search by the category name associated with
            // that ID
            String categoryName = categoryRepository.findById(categoryId)
                    .map(Category::getName)
                    .orElse(null);
            if (categoryName != null) {
                spec = spec.and((root, query, cb) -> cb.equal(root.get("category"), categoryName));
            }
        }

        if (location != null && !location.isBlank()) {
            spec = spec.and((root, query, cb) -> cb.like(cb.lower(root.get("location")),
                    "%" + location.toLowerCase() + "%"));
        }

        if (minPrice != null) {
            spec = spec.and((root, query, cb) -> cb.greaterThanOrEqualTo(root.get("price"), minPrice));
        }

        if (maxPrice != null) {
            spec = spec.and((root, query, cb) -> cb.lessThanOrEqualTo(root.get("price"), maxPrice));
        }

        return serviceRepository.findAll(spec, pageable).map(this::mapToResponseDTO);
    }

    @Transactional(readOnly = true)
    public Page<ServiceResponseDTO> searchNearbyServices(BigDecimal latitude, BigDecimal longitude,
            Double radiusKm, String category, Pageable pageable) {
        
        // Get all services
        List<com.fixitnow.model.Service> allServices = serviceRepository.findAll();
        
        // Filter by distance and category
        List<ServiceResponseDTO> filteredServices = allServices.stream()
                .filter(service -> {
                    // Skip services without coordinates
                    if (service.getLatitude() == null || service.getLongitude() == null) {
                        return false;
                    }
                    
                    // Filter by distance using Haversine formula
                    double distance = calculateDistance(
                            latitude.doubleValue(),
                            longitude.doubleValue(),
                            service.getLatitude().doubleValue(),
                            service.getLongitude().doubleValue()
                    );
                    
                    boolean withinRadius = distance <= radiusKm;
                    
                    // Filter by category if provided
                    if (category != null && !category.isBlank()) {
                        return withinRadius && service.getCategory().equalsIgnoreCase(category);
                    }
                    
                    return withinRadius;
                })
                .map(this::mapToResponseDTO)
                .collect(Collectors.toList());
        
        // Manual pagination
        int start = (int) pageable.getOffset();
        int end = Math.min((start + pageable.getPageSize()), filteredServices.size());
        
        List<ServiceResponseDTO> pageContent = filteredServices.subList(start, end);
        long total = filteredServices.size();
        
        return new org.springframework.data.domain.PageImpl<>(pageContent, pageable, total);
    }

    /**
     * Calculate distance between two geographic points using Haversine formula
     * @return distance in kilometers
     */
    private double calculateDistance(double lat1, double lon1, double lat2, double lon2) {
        final int R = 6371; // Earth's radius in kilometers
        
        double latDistance = Math.toRadians(lat2 - lat1);
        double lonDistance = Math.toRadians(lon2 - lon1);
        
        double a = Math.sin(latDistance / 2) * Math.sin(latDistance / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(lonDistance / 2) * Math.sin(lonDistance / 2);
        
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        double distance = R * c;
        
        return distance;
    }

    @Transactional
    public ServiceResponseDTO updateService(Long serviceId, Long requesterId, UserRole requesterRole,
            ServiceDTO serviceDTO) {
        com.fixitnow.model.Service service = serviceRepository.findById(serviceId)
                .orElseThrow(() -> new IllegalArgumentException("Service not found"));

        // Allow update if the requester is an ADMIN or the OWNER of the service
        boolean isOwner = service.getProvider().getId().equals(requesterId);
        boolean isAdmin = requesterRole == UserRole.ADMIN;

        if (!isOwner && !isAdmin) {
            throw new IllegalArgumentException("You are not authorized to update this service");
        }

        String categoryName = serviceDTO.getCategoryName();
        if (categoryName == null) {
            if (serviceDTO.getCategoryId() != null) {
                categoryName = categoryRepository.findById(serviceDTO.getCategoryId())
                        .map(Category::getName)
                        .orElseThrow(() -> new IllegalArgumentException("Category not found"));
            } else {
                categoryName = service.getCategory();
            }
        }

        // Verify category exists
        final String finalCategoryNameUpdate = categoryName;
        categoryRepository.findByName(finalCategoryNameUpdate)
                .orElseThrow(() -> new IllegalArgumentException(
                        "Category '" + finalCategoryNameUpdate + "' is not a valid category"));

        String subcategoryName = serviceDTO.getSubcategoryName();
        if (subcategoryName == null) {
            if (serviceDTO.getSubcategoryId() != null) {
                subcategoryName = subcategoryRepository.findById(serviceDTO.getSubcategoryId())
                        .map(Subcategory::getName)
                        .orElse(null);
            } else {
                subcategoryName = service.getSubcategory();
            }
        }

        // Verify subcategory if present
        if (subcategoryName != null) {
            final String finalSubcategoryNameUpdate = subcategoryName;
            subcategoryRepository.findByNameAndCategoryName(finalSubcategoryNameUpdate, finalCategoryNameUpdate)
                    .orElseThrow(() -> new IllegalArgumentException("Subcategory '" + finalSubcategoryNameUpdate
                            + "' not found in category '" + finalCategoryNameUpdate + "'"));
        }

        service.setCategory(categoryName);
        service.setSubcategory(subcategoryName);
        service.setDescription(serviceDTO.getDescription());
        service.setPrice(serviceDTO.getPrice());
        service.setAvailability(serviceDTO.getAvailability());
        if (serviceDTO.getDurationMinutes() != null) {
            service.setDurationMinutes(serviceDTO.getDurationMinutes());
        }
        service.setLocation(serviceDTO.getLocation());
        service.setLatitude(serviceDTO.getLatitude());
        service.setLongitude(serviceDTO.getLongitude());

        service = serviceRepository.save(service);
        return mapToResponseDTO(service);
    }

    @Transactional
    public void deleteService(Long serviceId, Long requesterId, UserRole requesterRole) {
        com.fixitnow.model.Service service = serviceRepository.findById(serviceId)
                .orElseThrow(() -> new IllegalArgumentException("Service not found"));

        // Allow deletion if the requester is an ADMIN or the OWNER of the service
        boolean isOwner = service.getProvider().getId().equals(requesterId);
        boolean isAdmin = requesterRole == UserRole.ADMIN;

        if (!isOwner && !isAdmin) {
            throw new IllegalArgumentException("You are not authorized to delete this service");
        }

        serviceRepository.delete(service);
    }

    private ServiceResponseDTO mapToResponseDTO(com.fixitnow.model.Service service) {
        return ServiceResponseDTO.builder()
                .id(service.getId())
                .providerId(service.getProvider().getId())
                .providerName(service.getProvider().getName())
                .category(service.getCategory())
                .subcategory(service.getSubcategory())
                .description(service.getDescription())
                .price(service.getPrice())
                .availability(service.getAvailability())
                .durationMinutes(service.getDurationMinutes())
                .location(service.getLocation())
                .latitude(service.getLatitude())
                .longitude(service.getLongitude())
                .averageRating(service.getAverageRating())
                .reviewCount(service.getReviewCount())
                .createdAt(service.getCreatedAt())
                .build();
    }
}
