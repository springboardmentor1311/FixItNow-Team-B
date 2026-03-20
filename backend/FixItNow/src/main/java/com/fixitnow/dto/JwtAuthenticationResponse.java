package com.fixitnow.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@NoArgsConstructor
@AllArgsConstructor
@Builder
@Getter
@Setter
public class JwtAuthenticationResponse {
    
    private String token;

    @Builder.Default
    private String tokenType = "Bearer";
    
    private Long expiresIn;
    private UserInfoDTO user;
}
