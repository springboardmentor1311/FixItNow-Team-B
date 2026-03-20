package com.fixitnow.config;

import com.fixitnow.security.JwtAuthenticationFilter;
import com.fixitnow.security.JwtAuthenticationEntryPoint;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;

import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import java.util.List;

@Slf4j
@Configuration
@EnableWebSecurity
@EnableMethodSecurity(securedEnabled = true, jsr250Enabled = true, prePostEnabled = true)
public class SecurityConfig {

    @Autowired
    private JwtAuthenticationEntryPoint jwtAuthenticationEntryPoint;

    @Autowired
    private JwtAuthenticationFilter jwtAuthenticationFilter;

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {

    CorsConfiguration configuration = new CorsConfiguration();

    configuration.setAllowedOrigins(List.of("http://localhost:3000"));
    configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"));
    configuration.setAllowedHeaders(List.of("*"));
    configuration.setAllowCredentials(true);

    UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
    source.registerCorsConfiguration("/**", configuration);

    return source;
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }

    /**
     * Security Filter Chain Configuration
     */
    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        log.info("Configuring security filter chain");

        http
                // CSRF disabled because we're using JWT
                .csrf(csrf -> csrf.disable())

                // Allow CORS using the source defined below
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))

                // Exception handling
                .exceptionHandling(
                        exceptionHandling -> exceptionHandling.authenticationEntryPoint(jwtAuthenticationEntryPoint))

                // Session management - stateless
                .sessionManagement(
                        sessionManagement -> sessionManagement.sessionCreationPolicy(SessionCreationPolicy.STATELESS))

                // Allow H2 console to render in browser frame
                .headers(headers -> headers.frameOptions(frame -> frame.sameOrigin()))

                // Authorize requests
                .authorizeHttpRequests(authz -> authz
                        // 1. WebSocket endpoints - allow all (authentication handled via JWT in handshake)
                        .requestMatchers("/ws/**", "/ws").permitAll()
                        .requestMatchers("/h2-console/**").permitAll()
                        
                        // 2. PUBLIC Service & Booking Info Access (GET only)
                        .requestMatchers(HttpMethod.GET, "/services/**", "/services").permitAll()
                        .requestMatchers(HttpMethod.GET, "/bookings/available-slots/**").permitAll()

                        // 3. Auth & Public Endpoints
                        .requestMatchers("/auth/**").permitAll()
                        .requestMatchers("/public/**").permitAll()
                        .requestMatchers("/swagger-ui/**", "/v3/api-docs/**").permitAll()
                        // 3. Admin Restricted - uses hasAuthority because we removed the prefix
                        .requestMatchers("/admin/**").hasAuthority("ADMIN")
                        .requestMatchers(HttpMethod.POST, "/categories/**", "/categories").hasAuthority("ADMIN")
                        .requestMatchers(HttpMethod.PUT, "/categories/**", "/categories").hasAuthority("ADMIN")
                        .requestMatchers(HttpMethod.DELETE, "/categories/**", "/categories").hasAuthority("ADMIN")

                        // 4. Restricted Service Operations (POST/PUT/DELETE)
                        .requestMatchers(HttpMethod.POST, "/services/**", "/services")
                        .hasAnyAuthority("PROVIDER", "ADMIN")
                        .requestMatchers(HttpMethod.PUT, "/services/**", "/services")
                        .hasAnyAuthority("PROVIDER", "ADMIN")
                        .requestMatchers(HttpMethod.DELETE, "/services/**", "/services")
                        .hasAnyAuthority("PROVIDER", "ADMIN")

                        // 5. Booking management - must be authenticated
                        .requestMatchers("/bookings/**").authenticated()

                        // 6. Chat endpoints - must be authenticated
                        .requestMatchers("/chats/**").authenticated()
                        .requestMatchers("/chats/inquiry/**").authenticated()

                        // All other requests
                        .anyRequest().authenticated());

        // Add JWT filter
        http.addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }
}
