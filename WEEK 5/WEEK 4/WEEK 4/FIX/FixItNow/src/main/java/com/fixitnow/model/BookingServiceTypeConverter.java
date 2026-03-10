package com.fixitnow.model;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

@Converter(autoApply = false)
public class BookingServiceTypeConverter implements AttributeConverter<BookingServiceType, String> {
    @Override
    public String convertToDatabaseColumn(BookingServiceType attribute) {
        return attribute == null ? null : attribute.getValue();
    }

    @Override
    public BookingServiceType convertToEntityAttribute(String dbData) {
        return BookingServiceType.fromValue(dbData);
    }
}

