package com.fixitnow.controller;

import com.fixitnow.dto.*;
import com.fixitnow.model.ApprovalStatus;
import com.fixitnow.model.User;
import com.fixitnow.repository.UserRepository;
import com.fixitnow.service.AuthenticationService;
import jakarta.validation.Valid;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.AuthenticationException;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/auth")
@CrossOrigin(origins = "*", maxAge = 3600)
public class AuthenticationController {

    @Autowired
    private AuthenticationService authenticationService;

    @Autowired
    private UserRepository userRepository;

    // ---------------------------------------------------------------
    // POST /auth/signup — original endpoint (Postman/Swagger)
    // ---------------------------------------------------------------
    @PostMapping("/signup")
    public ResponseEntity<ApiResponse<JwtAuthenticationResponse>> signup(
            @Valid @RequestBody SignUpRequest signUpRequest) {
        return handleRegister(signUpRequest);
    }

    // ---------------------------------------------------------------
    // POST /auth/register — alias used by the React frontend
    // ---------------------------------------------------------------
    @PostMapping("/register")
    public ResponseEntity<ApiResponse<JwtAuthenticationResponse>> register(
            @Valid @RequestBody SignUpRequest signUpRequest) {
        return handleRegister(signUpRequest);
    }

    private ResponseEntity<ApiResponse<JwtAuthenticationResponse>> handleRegister(
            SignUpRequest signUpRequest) {
        try {
            JwtAuthenticationResponse response = authenticationService.register(signUpRequest);
            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(ApiResponse.success("User registered successfully", response));

        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(ApiResponse.error(e.getMessage()));

        } catch (Exception e) {
            log.error("Signup error", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("An error occurred during registration: " + e.getMessage()));
        }
    }

    // ---------------------------------------------------------------
    // POST /auth/login
    // ---------------------------------------------------------------
    @PostMapping("/login")
    public ResponseEntity<ApiResponse<JwtAuthenticationResponse>> login(
            @Valid @RequestBody LoginRequest loginRequest) {
        try {
            JwtAuthenticationResponse response = authenticationService.login(loginRequest);
            return ResponseEntity.ok(ApiResponse.success("Login successful", response));

        } catch (AuthenticationException e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(ApiResponse.error(e.getMessage()));

        } catch (Exception e) {
            log.error("Login error", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("An error occurred during login"));
        }
    }

    // ---------------------------------------------------------------
    // GET /auth/validate
    // ---------------------------------------------------------------
    @GetMapping("/validate")
    public ResponseEntity<ApiResponse<Boolean>> validateToken(
            @RequestHeader("Authorization") String token) {
        if (token == null || !token.startsWith("Bearer ")) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("Invalid token format"));
        }
        return ResponseEntity.ok(ApiResponse.success("Token is valid", true));
    }

    // ---------------------------------------------------------------
    // GET /auth/provider-status?email=...
    // Public endpoint — frontend polls this to show approval state.
    // Returns: { "status": "PENDING" | "APPROVED" | "ON_HOLD", "email": "..." }
    // ---------------------------------------------------------------
    @GetMapping("/provider-status")
    public ResponseEntity<ApiResponse<Map<String, String>>> providerStatus(
            @RequestParam String email) {
        if (email == null || email.isBlank()) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("Email is required"));
        }

        User user = userRepository.findByEmail(email.trim().toLowerCase()).orElse(null);

        if (user == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ApiResponse.error("No account found with this email"));
        }

        ApprovalStatus status = user.getApprovalStatus() != null
                ? user.getApprovalStatus()
                : ApprovalStatus.PENDING;

        return ResponseEntity.ok(
                ApiResponse.success("Provider status fetched",
                        Map.of("status", status.name(), "email", email)));
    }
}
