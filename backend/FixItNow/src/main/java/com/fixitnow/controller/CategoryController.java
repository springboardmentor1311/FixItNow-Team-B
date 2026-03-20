package com.fixitnow.controller;

import com.fixitnow.dto.ApiResponse;
import com.fixitnow.dto.CategoryDTO;
import com.fixitnow.dto.SubcategoryDTO;
import com.fixitnow.service.CategoryService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/categories")
@RequiredArgsConstructor
@CrossOrigin(origins = "*", maxAge = 3600)
public class CategoryController {

    private final CategoryService categoryService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<CategoryDTO>>> getAllCategories() {
        List<CategoryDTO> categories = categoryService.getAllCategories();
        return ResponseEntity.ok(ApiResponse.success("Categories fetched successfully", categories));
    }

    @PostMapping
    @PreAuthorize("hasAuthority('ADMIN')")
    public ResponseEntity<ApiResponse<CategoryDTO>> createCategory(@RequestBody CategoryDTO categoryDTO) {
        CategoryDTO response = categoryService.createCategory(categoryDTO);
        return ResponseEntity.ok(ApiResponse.success("Category created successfully", response));
    }

    @PostMapping("/{categoryId}/subcategories")
    @PreAuthorize("hasAuthority('ADMIN')")
    public ResponseEntity<ApiResponse<SubcategoryDTO>> createSubcategory(
            @PathVariable Long categoryId,
            @RequestBody SubcategoryDTO subcategoryDTO) {
        SubcategoryDTO response = categoryService.createSubcategory(categoryId, subcategoryDTO);
        return ResponseEntity.ok(ApiResponse.success("Subcategory created successfully", response));
    }

    @GetMapping("/{categoryId}/subcategories")
    public ResponseEntity<ApiResponse<List<SubcategoryDTO>>> getSubcategoriesByCategoryId(
            @PathVariable Long categoryId) {
        List<SubcategoryDTO> subcategories = categoryService.getSubcategoriesByCategoryId(categoryId);
        return ResponseEntity.ok(ApiResponse.success("Subcategories fetched successfully", subcategories));
    }
}
