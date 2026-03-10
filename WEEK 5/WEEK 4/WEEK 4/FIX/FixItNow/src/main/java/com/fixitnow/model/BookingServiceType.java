package com.fixitnow.model;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

import java.util.Arrays;

public enum BookingServiceType {
    ELECTRICAL("Electrical"),
    PLUMBING("Plumbing"),
    AC_REPAIR("AC Repair"),
    CARPENTRY("Carpentry"),
    HOME_SERVICE("Home Service"),
    APPLIANCE("Appliance"),
    MECHANIC("Mechanic");

    private final String value;

    BookingServiceType(String value) {
        this.value = value;
    }

    @JsonValue
    public String getValue() {
        return value;
    }

    @JsonCreator
    public static BookingServiceType fromValue(String raw) {
        if (raw == null) return null;
        String normalized = raw.trim();
        if (normalized.isEmpty()) return null;

        return Arrays.stream(values())
                .filter(v -> v.value.equalsIgnoreCase(normalized) || v.name().equalsIgnoreCase(normalized))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Invalid service type: " + raw));
    }
}

