package com.fixitnow.service;

import com.fixitnow.dto.*;
import com.fixitnow.model.ApprovalStatus;
import com.fixitnow.model.User;
import com.fixitnow.model.UserRole;
import com.fixitnow.repository.UserRepository;
import com.fixitnow.security.JwtTokenProvider;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
public class AuthenticationService {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private AuthenticationManager authenticationManager;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    /**
     * Register a new user.
     * Providers are set to PENDING and do NOT receive a JWT token until admin
     * approves.
     */
    @Transactional
    public JwtAuthenticationResponse register(SignUpRequest signUpRequest) throws IllegalArgumentException {
        log.info("Registering new user with email: {}", signUpRequest.getEmail());

        if (userRepository.existsByEmail(signUpRequest.getEmail())) {
            log.warn("User with email {} already exists", signUpRequest.getEmail());
            throw new IllegalArgumentException("Email already in use");
        }

        UserRole role = signUpRequest.getRole();

        // Providers require admin approval before login
        ApprovalStatus approvalStatus = (role == UserRole.PROVIDER) 
            ? ApprovalStatus.PENDING 
            : ApprovalStatus.APPROVED;

        User user = User.builder()
                .name(signUpRequest.getName())
                .email(signUpRequest.getEmail())
                .password(passwordEncoder.encode(signUpRequest.getPassword()))
                .role(role)
                .approvalStatus(approvalStatus)
                .location(signUpRequest.getLocation())
                .phone(signUpRequest.getPhone())
                .serviceType(signUpRequest.getServiceType())
                .idProofType(signUpRequest.getIdProofType())
                .idProofDocumentName(signUpRequest.getIdProofDocumentName())
                .isActive(true)
                .build();

        User savedUser = userRepository.save(user);
        log.info("User registered — email: {}, role: {}, approvalStatus: {}",
                savedUser.getEmail(), savedUser.getRole(), savedUser.getApprovalStatus());

        // Providers now get token on registration for easier testing
        String token = jwtTokenProvider.generateTokenFromEmail(savedUser.getEmail());
        return buildAuthenticationResponse(token, savedUser);
    }

    /**
     * Authenticate user and generate JWT token.
     * Blocks providers who haven't been approved yet.
     */
    public JwtAuthenticationResponse login(LoginRequest loginRequest) throws AuthenticationException {
        log.info("Login attempt for user: {}", loginRequest.getEmail());

        try {
            Authentication authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(
                            loginRequest.getEmail(),
                            loginRequest.getPassword()));

            User user = userRepository.findByEmail(loginRequest.getEmail())
                    .orElseThrow(() -> new RuntimeException("User not found"));

            // Block provider login until admin approves
            if (user.getRole() == UserRole.PROVIDER
                    && user.getApprovalStatus() != ApprovalStatus.APPROVED) {
                throw new AuthenticationException("Provider account is pending admin approval. Please wait for admin to review your registration.") {
                };
            }

            String token = jwtTokenProvider.generateToken(authentication);
            log.info("User logged in successfully: {}", loginRequest.getEmail());

            return buildAuthenticationResponse(token, user);

        } catch (AuthenticationException e) {
            log.error("Authentication failed for user: {}", loginRequest.getEmail());
            throw e;
        }
    }

    private JwtAuthenticationResponse buildAuthenticationResponse(String token, User user) {
        return JwtAuthenticationResponse.builder()
                .token(token)
                .tokenType("Bearer")
                .expiresIn(jwtTokenProvider.getJwtExpirationMs())
                .user(toUserInfo(user))
                .build();
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
