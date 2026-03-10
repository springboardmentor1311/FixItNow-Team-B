package com.fixitnow.controller;

import com.fixitnow.dto.ApiResponse;
import com.fixitnow.dto.ServiceDTO;
import com.fixitnow.dto.ServiceResponseDTO;
import com.fixitnow.model.User;
import com.fixitnow.repository.UserRepository;
import com.fixitnow.service.ServiceOfferService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;

@Slf4j
@RestController
@RequestMapping("/services")
@RequiredArgsConstructor
@CrossOrigin(origins = "*", maxAge = 3600)
public class ServiceController {

    private final ServiceOfferService serviceOfferService;
    private final UserRepository userRepository;

    @GetMapping("/health-check")
    public ResponseEntity<ApiResponse<String>> healthCheck() {
        return ResponseEntity.ok(ApiResponse.success("Public access is working!", "Connected to ServiceController"));
    }

    @GetMapping({ "", "/" })
    public ResponseEntity<ApiResponse<Page<ServiceResponseDTO>>> getAllServices(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        log.info("Fetching all services - Page: {}, Size: {}", page, size);
        Pageable pageable = PageRequest.of(page, size, Sort.by("id").descending());
        Page<ServiceResponseDTO> response = serviceOfferService.searchServices(null, null, null, null, pageable);
        log.debug("Fetched {} services", response.getTotalElements());
        return ResponseEntity.ok(ApiResponse.success("Services fetched successfully", response));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<ServiceResponseDTO>> createService(
            @Valid @RequestBody ServiceDTO serviceDTO,
            @AuthenticationPrincipal UserDetails userDetails) {

        User user = userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        ServiceResponseDTO response = serviceOfferService.createService(user.getId(), serviceDTO);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Service created successfully", response));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<ServiceResponseDTO>> getServiceById(@PathVariable Long id) {
        ServiceResponseDTO response = serviceOfferService.getServiceById(id);
        return ResponseEntity.ok(ApiResponse.success("Service fetched successfully", response));
    }

    @GetMapping("/provider/{providerId}")
    public ResponseEntity<ApiResponse<List<ServiceResponseDTO>>> getServicesByProvider(@PathVariable Long providerId) {
        List<ServiceResponseDTO> response = serviceOfferService.getServicesByProvider(providerId);
        return ResponseEntity.ok(ApiResponse.success("Services fetched successfully", response));
    }

    @GetMapping("/search")
    public ResponseEntity<ApiResponse<Page<ServiceResponseDTO>>> searchServices(
            @RequestParam(required = false) Long categoryId,
            @RequestParam(required = false) String location,
            @RequestParam(required = false) BigDecimal minPrice,
            @RequestParam(required = false) BigDecimal maxPrice,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "id,desc") String[] sort) {

        log.info("Searching services - Category: {}, Location: {}, Price Range: [{}, {}]",
                categoryId, location, minPrice, maxPrice);

        Sort.Direction direction = Sort.Direction.DESC;
        String sortBy = "id";

        if (sort.length > 0) {
            sortBy = sort[0];
        }
        if (sort.length > 1 && "asc".equalsIgnoreCase(sort[1])) {
            direction = Sort.Direction.ASC;
        }

        Pageable pageable = PageRequest.of(page, size, Sort.by(direction, sortBy));
        Page<ServiceResponseDTO> response = serviceOfferService.searchServices(categoryId, location, minPrice, maxPrice,
                pageable);
        log.debug("Search returned {} results", response.getTotalElements());
        return ResponseEntity.ok(ApiResponse.success("Services searched successfully", response));
    }

    /**
     * Search services by geographic location (Google Maps integration)
     * Finds all services within a specified radius from provided coordinates
     */
    @GetMapping("/search/nearby")
    public ResponseEntity<ApiResponse<Page<ServiceResponseDTO>>> searchNearbyServices(
            @RequestParam(required = true) BigDecimal latitude,
            @RequestParam(required = true) BigDecimal longitude,
            @RequestParam(required = false, defaultValue = "10") Double radiusKm,
            @RequestParam(required = false) String category,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {

        log.info("Searching nearby services - Latitude: {}, Longitude: {}, Radius: {} km, Category: {}",
                latitude, longitude, radiusKm, category);

        Pageable pageable = PageRequest.of(page, size, Sort.by("averageRating").descending());
        Page<ServiceResponseDTO> response = serviceOfferService.searchNearbyServices(
                latitude, longitude, radiusKm, category, pageable);

        log.debug("Found {} nearby services", response.getTotalElements());
        return ResponseEntity.ok(ApiResponse.success("Nearby services fetched successfully", response));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<ServiceResponseDTO>> updateService(
            @PathVariable Long id,
            @Valid @RequestBody ServiceDTO serviceDTO,
            @AuthenticationPrincipal UserDetails userDetails) {

        User user = userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        ServiceResponseDTO response = serviceOfferService.updateService(id, user.getId(), user.getRole(), serviceDTO);
        return ResponseEntity.ok(ApiResponse.success("Service updated successfully", response));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteService(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails) {

        User user = userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        serviceOfferService.deleteService(id, user.getId(), user.getRole());
        return ResponseEntity.ok(ApiResponse.success("Service deleted successfully", null));
    }
}
