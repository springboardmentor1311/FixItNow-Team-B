package com.fixitnow.controller;

import com.fixitnow.dto.ApiResponse;
import com.fixitnow.dto.UserInfoDTO;
import com.fixitnow.model.ApprovalStatus;
import com.fixitnow.model.User;
import com.fixitnow.model.UserRole;
import com.fixitnow.repository.UserRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.annotation.Secured;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@RestController
@RequestMapping("/admin")
@CrossOrigin(origins = "*", maxAge = 3600)
@Secured("ADMIN")
public class AdminController {

    @Autowired
    private UserRepository userRepository;

    // ---------------------------------------------------------------
    // GET /admin/providers/pending
    // Lists all providers waiting for approval
    // ---------------------------------------------------------------
    @GetMapping("/providers/pending")
    public ResponseEntity<ApiResponse<List<UserInfoDTO>>> getPendingProviders() {
        List<UserInfoDTO> pending = userRepository
                .findByRoleAndApprovalStatus(UserRole.PROVIDER, ApprovalStatus.PENDING)
                .stream()
                .map(this::toUserInfo)
                .collect(Collectors.toList());

        return ResponseEntity.ok(ApiResponse.success("Pending providers fetched", pending));
    }

    // ---------------------------------------------------------------
    // GET /admin/providers/all
    // Lists all providers (any approval status)
    // ---------------------------------------------------------------
    @GetMapping("/providers/all")
    public ResponseEntity<ApiResponse<List<UserInfoDTO>>> getAllProviders() {
        List<UserInfoDTO> all = userRepository
                .findByRole(UserRole.PROVIDER)
                .stream()
                .map(this::toUserInfo)
                .collect(Collectors.toList());

        return ResponseEntity.ok(ApiResponse.success("All providers fetched", all));
    }

    // ---------------------------------------------------------------
    // PUT /admin/providers/{id}/approve → APPROVED
    // ---------------------------------------------------------------
    @PutMapping("/providers/{id}/approve")
    public ResponseEntity<ApiResponse<UserInfoDTO>> approveProvider(@PathVariable Long id) {
        return updateProviderStatus(id, ApprovalStatus.APPROVED);
    }

    // ---------------------------------------------------------------
    // PUT /admin/providers/{id}/hold → ON_HOLD
    // ---------------------------------------------------------------
    @PutMapping("/providers/{id}/hold")
    public ResponseEntity<ApiResponse<UserInfoDTO>> holdProvider(@PathVariable Long id) {
        return updateProviderStatus(id, ApprovalStatus.ON_HOLD);
    }

    // ---------------------------------------------------------------
    // PUT /admin/providers/{id}/reject → back to PENDING
    // ---------------------------------------------------------------
    @PutMapping("/providers/{id}/reject")
    public ResponseEntity<ApiResponse<UserInfoDTO>> rejectProvider(@PathVariable Long id) {
        return updateProviderStatus(id, ApprovalStatus.PENDING);
    }

    private ResponseEntity<ApiResponse<UserInfoDTO>> updateProviderStatus(
            Long id, ApprovalStatus newStatus) {

        User user = userRepository.findById(id).orElse(null);

        if (user == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ApiResponse.error("Provider not found with id: " + id));
        }

        if (user.getRole() != UserRole.PROVIDER) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(ApiResponse.error("User is not a provider"));
        }

        user.setApprovalStatus(newStatus);
        userRepository.save(user);
        log.info("Provider {} approval status updated to {}", user.getEmail(), newStatus);

        return ResponseEntity.ok(
                ApiResponse.success("Provider status updated to " + newStatus, toUserInfo(user)));
    }

    private UserInfoDTO toUserInfo(User user) {
        return UserInfoDTO.builder()
                .id(user.getId())
                .name(user.getName())
                .email(user.getEmail())
                .role(user.getRole())
                .approvalStatus(user.getApprovalStatus())
                .location(user.getLocation())
                .createdAt(user.getCreatedAt())
                .isActive(user.getIsActive())
                .build();
    }
}
