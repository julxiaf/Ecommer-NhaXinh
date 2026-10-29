package vn.nhaxinh.catalog;

import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class CategoryService {

    private final CategoryRepository repository;

    public CategoryService(CategoryRepository repository) {
        this.repository = repository;
    }

    @Transactional(readOnly = true)
    public List<Category> findAll() {
        return findAll(false);
    }

    @Transactional(readOnly = true)
    public List<Category> findAll(boolean includeInactive) {
        Sort sort = Sort.by(Sort.Order.asc("sortOrder"), Sort.Order.asc("name"));
        return includeInactive ? repository.findAll(sort) : repository.findByIsActiveTrue(sort);
    }

    @Transactional(readOnly = true)
    public Optional<Category> findById(Long id) {
        return repository.findById(id);
    }

    @Transactional(readOnly = true)
    public Optional<Category> findBySlug(String slug) {
        return repository.findBySlug(slug);
    }

    @Transactional(readOnly = true)
    public List<Category> findRootCategories() {
        return repository.findByParentIsNullAndIsActiveTrueOrderBySortOrderAsc();
    }

    @Transactional(readOnly = true)
    public List<Category> findSubCategories(Long parentId) {
        return repository.findByParentIdAndIsActiveTrueOrderBySortOrderAsc(parentId);
    }

    public Category save(Category category) {
        return repository.save(category);
    }

    public Category save(Long id, CategoryRequest request) {
        String slug = request.slug().trim();
        boolean duplicateSlug = id == null
                ? repository.existsBySlug(slug)
                : repository.existsBySlugAndIdNot(slug, id);
        if (duplicateSlug) {
            throw new IllegalArgumentException("Slug danh mục đã tồn tại");
        }

        Category category = id == null
                ? new Category()
                : repository.findById(id).orElseThrow(() -> new IllegalArgumentException("Không tìm thấy danh mục"));
        Category parent = null;
        if (request.parentId() != null) {
            parent = repository.findById(request.parentId())
                    .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy danh mục cha"));
            Category ancestor = parent;
            while (ancestor != null) {
                if (id != null && id.equals(ancestor.getId())) {
                    throw new IllegalArgumentException("Không thể tạo vòng lặp phân cấp danh mục");
                }
                ancestor = ancestor.getParent();
            }
        }

        category.setName(request.name().trim());
        category.setSlug(slug);
        category.setParent(parent);
        category.setDescription(request.description());
        category.setImageUrl(request.imageUrl());
        category.setSortOrder(request.sortOrder() == null ? 0 : request.sortOrder());
        category.setIsActive(request.isActive() == null
                ? category.getIsActive() == null || category.getIsActive()
                : request.isActive());
        return repository.save(category);
    }

    public void setActive(Long id, Boolean isActive) {
        Category category = repository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy danh mục"));
        category.setIsActive(isActive);
        repository.save(category);
    }

    public void deleteById(Long id) {
        repository.deleteById(id);
    }
}
