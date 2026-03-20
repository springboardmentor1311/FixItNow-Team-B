package com.fixitnow.dto;

import lombok.*;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CategoryDTO {
    private Long id;
    private String description;
    private String icon;
    private String name;
    private List<SubcategoryDTO> subcategories;
}
