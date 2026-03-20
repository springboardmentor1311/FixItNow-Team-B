package com.fixitnow.config;

import com.fixitnow.model.Booking;
import com.fixitnow.model.User;
import com.fixitnow.repository.BookingRepository;
import com.fixitnow.repository.UserRepository;
import com.fixitnow.security.CustomUserDetailsService;
import com.fixitnow.security.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Configuration;
import org.springframework.lang.NonNull;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

import java.util.List;

@Slf4j
@Configuration
@EnableWebSocketMessageBroker
@RequiredArgsConstructor
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    private final JwtTokenProvider jwtTokenProvider;
    private final CustomUserDetailsService userDetailsService;
    private final UserRepository userRepository;
    private final BookingRepository bookingRepository;

    @Override
    public void configureMessageBroker(@NonNull MessageBrokerRegistry config) {
        config.enableSimpleBroker("/topic", "/queue");
        config.setApplicationDestinationPrefixes("/app");
    }

    @Override
    public void registerStompEndpoints(@NonNull StompEndpointRegistry registry) {
        registry.addEndpoint("/ws")
                .setAllowedOriginPatterns("*")
                .withSockJS();
    }

    @Override
    public void configureClientInboundChannel(@NonNull ChannelRegistration registration) {
        registration.interceptors(new ChannelInterceptor() {
            @Override
            public Message<?> preSend(@NonNull Message<?> message, @NonNull MessageChannel channel) {
                StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
                
                if (accessor == null) return message;

                if (StompCommand.CONNECT.equals(accessor.getCommand())) {
                    List<String> authorization = accessor.getNativeHeader("Authorization");
                    log.debug("WebSocket CONNECT: Authorization header: {}", authorization);

                    if (authorization != null && !authorization.isEmpty()) {
                        String bearerToken = authorization.get(0);
                        if (bearerToken.startsWith("Bearer ")) {
                            String token = bearerToken.substring(7);
                            if (jwtTokenProvider.validateToken(token)) {
                                String email = jwtTokenProvider.getEmailFromToken(token);
                                if (email != null) {
                                    UserDetails userDetails = userDetailsService.loadUserByUsername(email);
                                    UsernamePasswordAuthenticationToken authentication =
                                            new UsernamePasswordAuthenticationToken(userDetails, null, userDetails.getAuthorities());
                                    accessor.setUser(authentication);
                                    log.info("WebSocket Authenticated user: {}", email);
                                }
                            } else {
                                log.warn("WebSocket CONNECT: Invalid JWT token");
                            }
                        }
                    } else {
                        // Some clients may pass token as a parameter in query string
                        log.warn("WebSocket CONNECT: No Authorization header found");
                    }
                } else if (StompCommand.SUBSCRIBE.equals(accessor.getCommand())) {
                    String destination = accessor.getDestination();
                    java.security.Principal principal = accessor.getUser();
                    
                    if (principal == null) {
                        throw new IllegalArgumentException("Unauthorized: No principal found for subscription");
                    }
                    
                    if (destination != null) {
                        UsernamePasswordAuthenticationToken auth = (UsernamePasswordAuthenticationToken) principal;
                        UserDetails userDetails = (UserDetails) auth.getPrincipal();
                        String email = userDetails.getUsername();
                        
                        User user = userRepository.findByEmail(email).orElse(null);
                        if (user == null) {
                            throw new IllegalArgumentException("Unauthorized: User not found");
                        }

                        if (destination.startsWith("/topic/admin-chat/")) {
                            String providerIdStr = destination.substring("/topic/admin-chat/".length());
                            Long providerId = Long.parseLong(providerIdStr);
                            
                            boolean isAdmin = user.getRole() == com.fixitnow.model.UserRole.ADMIN;
                            boolean isTheProvider = (user.getRole() == com.fixitnow.model.UserRole.PROVIDER && user.getId().equals(providerId));
                            
                            if (!isAdmin && !isTheProvider) {
                                throw new IllegalArgumentException("Unauthorized: Cannot subscribe to this admin chat topic");
                            }
                        } else if (destination.startsWith("/topic/chat/")) {
                            String bookingIdStr = destination.substring("/topic/chat/".length());
                            Long bookingId = Long.parseLong(bookingIdStr);
                            
                            Booking booking = bookingRepository.findById(bookingId).orElse(null);
                            if (booking == null) {
                                throw new IllegalArgumentException("Invalid booking ID for subscription");
                            }
                            
                            if (!booking.getCustomer().getId().equals(user.getId()) && !booking.getProvider().getId().equals(user.getId())) {
                                throw new IllegalArgumentException("Unauthorized: Cannot subscribe to this booking chat topic");
                            }
                        }
                    }
                }
                return message;
            }
        });
    }
}
