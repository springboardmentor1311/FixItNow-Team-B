package com.fixitnow.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.lang.NonNull;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Slf4j
@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {
    @Autowired
    private JwtTokenProvider tokenProvider;

    @Autowired
    private CustomUserDetailsService customUserDetailsService;

    @Override
    protected boolean shouldNotFilter(@NonNull HttpServletRequest request) throws ServletException {
        if ("OPTIONS".equalsIgnoreCase(request.getMethod())) {
            return true;
        }
        String uri = request.getRequestURI();
        return uri != null && uri.contains("/h2-console");
    }

    @Override
    protected void doFilterInternal(@NonNull HttpServletRequest request, @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain) throws ServletException, IOException {
        try {
            String jwt = getJwtFromRequest(request);
            log.info("JWT Filter: Request URI: {} | Token present: {}", request.getRequestURI(), StringUtils.hasText(jwt));

            if (StringUtils.hasText(jwt)) {
                if (tokenProvider.validateToken(jwt)) {
                    Authentication currentAuth = SecurityContextHolder.getContext().getAuthentication();
                    if (currentAuth == null || currentAuth instanceof AnonymousAuthenticationToken) {
                        String email = tokenProvider.getEmailFromToken(jwt);
                        if (email == null) {
                            log.info("JWT Filter: Email could not be extracted from token");
                            request.setAttribute("jwt_error", "Email could not be extracted from token");
                        } else {
                            log.info("JWT Filter: Authenticating user: {}", email);
                            var userDetails = customUserDetailsService.loadUserByUsername(email);
                            UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
                                    userDetails, null, userDetails.getAuthorities());
                            authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                            SecurityContextHolder.getContext().setAuthentication(authentication);
                            log.info("JWT Filter: Successfully authenticated user: {}", email);
                        }
                    } else {
                        log.info("JWT Filter: User already authenticated as: {}", currentAuth.getName());
                    }
                } else {
                    log.warn("Invalid JWT token provided in request");
                    request.setAttribute("jwt_error", "JWT token validation failed (expired, tampered, or invalid)");
                }
            } else {
                // This will help us know if Postman is actually sending the header correctly
                request.setAttribute("jwt_error", "No 'Bearer' token found in Authorization header. Please check Postman Authorization tab.");
            }
        } catch (Exception e) {
            log.error("Could not set user authentication in security context: {}", e.getMessage());
            request.setAttribute("jwt_error", "Authentication error: " + e.getMessage());
        }

        filterChain.doFilter(request, response);
    }

    /**
     * Extract JWT token from request
     */
    private String getJwtFromRequest(HttpServletRequest request) {
        String bearerToken = request.getHeader("Authorization");
        if (StringUtils.hasText(bearerToken) && bearerToken.startsWith("Bearer ")) {
            return bearerToken.substring(7);
        }
        return null;
    }
}
