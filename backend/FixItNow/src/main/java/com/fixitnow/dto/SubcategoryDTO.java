package com.fixitnow.dto;

import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SubcategoryDTO {
    private Long id;
    private String name;
    private Long categoryId;
}
