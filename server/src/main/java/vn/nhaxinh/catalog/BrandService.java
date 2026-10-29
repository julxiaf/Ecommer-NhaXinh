package vn.nhaxinh.catalog;

import java.util.List;
import java.util.Optional;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class BrandService {

    private final BrandRepository repository;

    public BrandService(BrandRepository repository) {
        this.repository = repository;
    }

    @Transactional(readOnly = true)
    public List<Brand> findAll() {
        return repository.findAll();
    }

    @Transactional(readOnly = true)
    public List<Brand> findActiveBrands() {
        return repository.findByIsActiveTrue();
    }

    @Transactional(readOnly = true)
    public Optional<Brand> findById(Long id) {
        return repository.findById(id);
    }

    @Transactional(readOnly = true)
    public Optional<Brand> findBySlug(String slug) {
        return repository.findBySlug(slug);
    }

    public Brand save(Brand brand) {
        return repository.save(brand);
    }

    public void deleteById(Long id) {
        repository.deleteById(id);
    }
}
