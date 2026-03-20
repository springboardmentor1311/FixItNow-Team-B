package com.fixitnow.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * Google Maps API Configuration properties
 * Maps to application.properties: google.maps.*
 */
@Component
@ConfigurationProperties(prefix = "google.maps.api")
@Getter
@Setter
public class GoogleMapsApiProperties {

    private String key;
    private String endpoint = "https://maps.googleapis.com/maps/api";

}
