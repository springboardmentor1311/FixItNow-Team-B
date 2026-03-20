package com.fixitnow.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * Configuration properties for FixItNow application
 * Maps to application.properties: app.* and google.maps.*
 */
@Component
@ConfigurationProperties(prefix = "app")
@Getter
@Setter
public class AppConfigProperties {

    private String name;
    private String version;
    private String jwtSecret;
    private Long jwtExpirationMs;

}
