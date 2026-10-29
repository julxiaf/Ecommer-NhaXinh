package vn.nhaxinh.catalog;

import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

@Repository
public interface ProductRepository extends JpaRepository<Product, Long> {

    Optional<Product> findBySlug(String slug);

    boolean existsBySlug(String slug);

    boolean existsBySlugAndIdNot(String slug, Long id);

    Optional<Product> findByIdAndStatus(Long id, String status);

    Optional<Product> findBySlugAndStatus(String slug, String status);

    Page<Product> findByStatus(String status, Pageable pageable);

    @Query("SELECT p FROM Product p JOIN p.categories c WHERE c.id = :categoryId AND p.status = 'ACTIVE'")
    Page<Product> findByCategoryId(Long categoryId, Pageable pageable);

    @Query("SELECT p FROM Product p WHERE p.brand.id = :brandId AND p.status = 'ACTIVE'")
    Page<Product> findByBrandId(Long brandId, Pageable pageable);

    @Query("SELECT p FROM Product p WHERE p.status = 'ACTIVE' AND (LOWER(p.name) LIKE LOWER(CONCAT('%', :keyword, '%')) OR LOWER(p.shortDescription) LIKE LOWER(CONCAT('%', :keyword, '%')))")
    Page<Product> searchByNameOrDescription(String keyword, Pageable pageable);

    @Query(value = """
            select new vn.nhaxinh.catalog.ProductSummary(p.id, p.name, p.slug, p.shortDescription,
                   min(v.price), coalesce(sum(i.quantityOnHand - i.quantityReserved), 0L))
            from Product p
            join p.variants v
            left join Inventory i on i.variantId = v.id
            where p.status = 'ACTIVE' and v.status = 'ACTIVE'
            group by p.id, p.name, p.slug, p.shortDescription, p.createdAt
            """,
           countQuery = "select count(distinct p.id) from Product p join p.variants v where p.status = 'ACTIVE' and v.status = 'ACTIVE'")
    Page<ProductSummary> findActiveSummaries(Pageable pageable);

    @Query(value = """
            select new vn.nhaxinh.catalog.ProductSummary(p.id, p.name, p.slug, p.shortDescription,
                   min(v.price), coalesce(sum(i.quantityOnHand - i.quantityReserved), 0L))
            from Product p
            join p.variants v
            left join Inventory i on i.variantId = v.id
            join p.categories c
            where p.status = 'ACTIVE' and v.status = 'ACTIVE' and c.id = :categoryId
            group by p.id, p.name, p.slug, p.shortDescription, p.createdAt
            """,
           countQuery = "select count(distinct p.id) from Product p join p.variants v join p.categories c where p.status = 'ACTIVE' and v.status = 'ACTIVE' and c.id = :categoryId")
    Page<ProductSummary> findActiveSummariesByCategory(Long categoryId, Pageable pageable);

    @Query(value = """
            select new vn.nhaxinh.catalog.ProductSummary(p.id, p.name, p.slug, p.shortDescription,
                   min(v.price), coalesce(sum(i.quantityOnHand - i.quantityReserved), 0L))
            from Product p
            join p.variants v
            left join Inventory i on i.variantId = v.id
            where p.status = 'ACTIVE' and v.status = 'ACTIVE' and p.brand.id = :brandId
            group by p.id, p.name, p.slug, p.shortDescription, p.createdAt
            """,
           countQuery = "select count(distinct p.id) from Product p join p.variants v where p.status = 'ACTIVE' and v.status = 'ACTIVE' and p.brand.id = :brandId")
    Page<ProductSummary> findActiveSummariesByBrand(Long brandId, Pageable pageable);

    //Query Search 
    @Query(value = """
            select new vn.nhaxinh.catalog.ProductSummary(p.id, p.name, p.slug, p.shortDescription,
                   min(v.price), coalesce(sum(i.quantityOnHand - i.quantityReserved), 0L))
            from Product p
            join p.variants v
            left join Inventory i on i.variantId = v.id
            where p.status = 'ACTIVE' and v.status = 'ACTIVE'
              and (lower(p.name) like lower(concat('%', :keyword, '%')) or lower(p.shortDescription) like lower(concat('%', :keyword, '%')))
            group by p.id, p.name, p.slug, p.shortDescription, p.createdAt
            """,
           countQuery = "select count(distinct p.id) from Product p join p.variants v where p.status = 'ACTIVE' and v.status = 'ACTIVE' and (lower(p.name) like lower(concat('%', :keyword, '%')) or lower(p.shortDescription) like lower(concat('%', :keyword, '%')))")
    Page<ProductSummary> searchActiveSummaries(String keyword, Pageable pageable);



    @Query("""
    SELECT DISTINCT p FROM Product p
    JOIN FETCH p.variants v
    WHERE p.status = 'ACTIVE' AND v.status = 'ACTIVE'
    ORDER BY p.createdAt DESC
""")
List<Product> findFeaturedProducts(Pageable pageable);

}
