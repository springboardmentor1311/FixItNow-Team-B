package com.fixitnow.config;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;

/**
 * Google Maps API Configuration
 * 
 * Setup Instructions:
 * 1. Go to Google Cloud Console (https://console.cloud.google.com)
 * 2. Create a new project
 * 3. Enable the following APIs:
 *    - Google Maps JavaScript API
 *    - Google Places API
 *    - Google Maps Geocoding API
 *    - Google Maps Distance Matrix API
 * 4. Create an API key (Restrict to Android/Web)
 * 5. Add to application.properties:
 *    google.maps.api.key=YOUR_API_KEY
 *    google.maps.api.endpoint=https://maps.googleapis.com/maps/api
 */
@Configuration
@RequiredArgsConstructor
public class GoogleMapsConfig {

    @Value("${google.maps.api.key:}")
    private String apiKey;

    @Value("${google.maps.api.endpoint:https://maps.googleapis.com/maps/api}")
    private String apiEndpoint;

    /**
     * Get the Google Maps API Key
     */
    public String getApiKey() {
        return apiKey;
    }

    /**
     * Get the Google Maps API Endpoint
     */
    public String getApiEndpoint() {
        return apiEndpoint;
    }

    /**
     * Validate if Google Maps API is configured
     */
    public boolean isConfigured() {
        return !apiKey.isEmpty() && !apiKey.equals("");
    }
}
