package com.fixitnow.service;

import com.fixitnow.dto.CategoryDTO;
import com.fixitnow.dto.SubcategoryDTO;
import com.fixitnow.model.Category;
import com.fixitnow.model.Subcategory;
import com.fixitnow.repository.CategoryRepository;
import com.fixitnow.repository.SubcategoryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CategoryService {

        private final CategoryRepository categoryRepository;
        private final SubcategoryRepository subcategoryRepository;

        @Transactional(readOnly = true)
        public List<CategoryDTO> getAllCategories() {
                return categoryRepository.findAll().stream()
                                .map(this::mapToCategoryDTO)
                                .collect(Collectors.toList());
        }

        @Transactional(readOnly = true)
        public List<SubcategoryDTO> getSubcategoriesByCategoryId(Long categoryId) {
                return subcategoryRepository.findByCategoryId(categoryId).stream()
                                .map(this::mapToSubcategoryDTO)
                                .collect(Collectors.toList());
        }

        @Transactional
        public CategoryDTO createCategory(CategoryDTO categoryDTO) {
                Category category = Category.builder()
                                .name(categoryDTO.getName())
                                .description(categoryDTO.getDescription())
                                .icon(categoryDTO.getIcon())
                                .build();
                category = categoryRepository.save(category);
                return mapToCategoryDTO(category);
        }

        @Transactional
        public SubcategoryDTO createSubcategory(Long categoryId, SubcategoryDTO subcategoryDTO) {
                Category category = categoryRepository.findById(categoryId)
                                .orElseThrow(() -> new IllegalArgumentException("Category not found"));

                Subcategory subcategory = Subcategory.builder()
                                .name(subcategoryDTO.getName())
                                .category(category)
                                .build();
                subcategory = subcategoryRepository.save(subcategory);
                return mapToSubcategoryDTO(subcategory);
        }

        private CategoryDTO mapToCategoryDTO(Category category) {
                return CategoryDTO.builder()
                                .id(category.getId())
                                .name(category.getName())
                                .description(category.getDescription())
                                .icon(category.getIcon())
                                .subcategories(
                                                category.getSubcategories() != null
                                                                ? category.getSubcategories().stream()
                                                                                .map(this::mapToSubcategoryDTO)
                                                                                .collect(Collectors.toList())
                                                                : null)
                                .build();
        }

        private SubcategoryDTO mapToSubcategoryDTO(Subcategory subcategory) {
                return SubcategoryDTO.builder()
                                .id(subcategory.getId())
                                .name(subcategory.getName())
                                .categoryId(subcategory.getCategory().getId())
                                .build();
        }
}
