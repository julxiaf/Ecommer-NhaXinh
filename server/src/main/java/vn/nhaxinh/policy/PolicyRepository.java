package vn.nhaxinh.policy;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface PolicyRepository extends JpaRepository<Policy, Integer> {

    Optional<Policy> findBySlug(String slug);

    boolean existsBySlug(String slug);

    boolean existsBySlugAndIdNot(String slug, Integer id);

    List<Policy> findAllByOrderByCreatedAtDesc();

    List<Policy> findByStatusOrderByCreatedAtDesc(String status);

    @Query("SELECT p FROM Policy p WHERE " +
           "(:status IS NULL OR p.status = :status) AND " +
           "(:keyword IS NULL OR LOWER(p.title) LIKE LOWER(CONCAT('%', :keyword, '%')) OR LOWER(p.slug) LIKE LOWER(CONCAT('%', :keyword, '%')) OR LOWER(p.shortTitle) LIKE LOWER(CONCAT('%', :keyword, '%'))) " +
           "ORDER BY p.id ASC")
    List<Policy> searchPolicies(@Param("status") String status, @Param("keyword") String keyword);
}
