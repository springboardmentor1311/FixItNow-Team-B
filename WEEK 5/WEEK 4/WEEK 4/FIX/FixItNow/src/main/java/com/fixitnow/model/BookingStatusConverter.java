package com.fixitnow.model;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

@Converter(autoApply = false)
public class BookingStatusConverter implements AttributeConverter<BookingStatus, String> {
    @Override
    public String convertToDatabaseColumn(BookingStatus attribute) {
        return attribute == null ? null : attribute.getValue();
    }

    @Override
    public BookingStatus convertToEntityAttribute(String dbData) {
        return BookingStatus.fromValue(dbData);
    }
}

