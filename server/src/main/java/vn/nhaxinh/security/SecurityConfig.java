package vn.nhaxinh.security;

import jakarta.servlet.http.HttpServletRequest;
import java.util.Arrays;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.security.web.context.SecurityContextRepository;
// import org.springframework.security.web.csrf.CookieCsrfTokenRepository;
// import org.springframework.security.web.util.matcher.AntPathRequestMatcher;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

@Configuration
@EnableMethodSecurity(prePostEnabled = true)
public class SecurityConfig {

    private static final Logger log = LoggerFactory.getLogger(SecurityConfig.class);

    @Bean
    PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    AuthenticationManager authenticationManager(AuthenticationConfiguration configuration) throws Exception {
        return configuration.getAuthenticationManager();
    }

    @Bean
    SecurityContextRepository securityContextRepository() {
        return new HttpSessionSecurityContextRepository();
    }

    @Bean
    SecurityFilterChain securityFilterChain(
            HttpSecurity http,
            SecurityContextRepository securityContextRepository
    ) throws Exception {
        http
                .cors(Customizer.withDefaults())
                // Vô hiệu hóa CSRF cho REST API (tránh lỗi 403 Forbidden khi test Postman hoặc SPA gọi API)
                .csrf(AbstractHttpConfigurer::disable)
                .securityContext(context -> context
                        .securityContextRepository(securityContextRepository)
                        .requireExplicitSave(true))
                .sessionManagement(session -> session
                        .sessionCreationPolicy(SessionCreationPolicy.IF_REQUIRED)
                        .sessionFixation(fixation -> fixation.changeSessionId()))
                .authorizeHttpRequests(authorize -> authorize
                        // 1. Cho phép tất cả OPTIONS (CORS preflight)
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()

                        // 2. Swagger UI & OpenAPI docs & static assets công khai
                        .requestMatchers(
                                "/favicon.ico",
                                "/error",
                                "/v3/api-docs/**",
                                "/v3/api-docs.yaml",
                                "/swagger-ui/**",
                                "/swagger-ui.html"
                        ).permitAll()

                        // 3. Toàn bộ các API xác thực công khai (login, register, csrf, me, logout)
                        .requestMatchers("/api/v1/auth/**").permitAll()
                        .requestMatchers("/api/v1/cart/**", "/api/v1/checkout", "/api/v1/checkout/**").permitAll()
                        .requestMatchers("/api/v1/payments/order/**", "/api/v1/payments/vnpay/**").permitAll()
                        .requestMatchers("/api/v1/notifications/**").permitAll()
                        .requestMatchers("/api/v1/chatbot/**").permitAll()

                        // 3. API Quản lý đơn hàng, sản phẩm & danh mục dành cho ADMIN và STAFF
                        .requestMatchers(HttpMethod.GET, "/api/v1/categories", "/api/v1/categories/**", "/api/v1/admin/categories").permitAll()
                        // .requestMatchers("/api/v1/admin/orders/**").hasAnyRole("ADMIN", "STAFF")
                        // .requestMatchers("/api/v1/admin/products/**").hasAnyRole("ADMIN", "STAFF")
                        // .requestMatchers("/api/v1/admin/categories/**").hasAnyRole("ADMIN", "STAFF")

                        // 4. API Quản trị hệ thống & Phân quyền (bắt buộc phải có ROLE_ADMIN)
                        // .requestMatchers("/api/v1/admin/**").hasRole("ADMIN")

                        // 5. Khách hàng hủy đơn hàng (xác thực hoặc bằng số điện thoại)
                        .requestMatchers(HttpMethod.POST, "/api/v1/orders/*/cancel").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/v1/orders").permitAll()
                        .requestMatchers("/api/v1/admin/orders/**").permitAll()
                        .requestMatchers("/api/v1/admin/policies/**", "/api/v1/policies/**").permitAll()

                        // 5. Thao tác thêm/sửa/xóa sản phẩm chỉ cho ADMIN hoặc STAFF
                        .requestMatchers(HttpMethod.POST, "/api/v1/products", "/api/v1/products/**").hasAnyRole("ADMIN", "STAFF")
                        .requestMatchers(HttpMethod.PUT, "/api/v1/products", "/api/v1/products/**").hasAnyRole("ADMIN", "STAFF")
                        .requestMatchers(HttpMethod.DELETE, "/api/v1/products", "/api/v1/products/**").hasRole("ADMIN")

                        // 6. API Người dùng cá nhân & Đơn hàng của tôi yêu cầu đăng nhập
                        .requestMatchers("/api/v1/users/**", "/api/v1/orders/my").authenticated()

                        // 7. TOÀN BỘ CÁC API GET THÔNG TIN (sản phẩm, chi tiết, tìm kiếm, chính sách, v.v.) CÔNG KHAI
                        .requestMatchers(HttpMethod.GET, "/media/products/**", "/uploads/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/v1/**").permitAll()

                        // 8. Bất kỳ request thay đổi dữ liệu nào khác (đơn hàng, hồ sơ cá nhân...) yêu cầu đăng nhập
                        .anyRequest().authenticated())
                .exceptionHandling(exceptions -> exceptions
                        .authenticationEntryPoint((request, response, exception) -> {
                            String clientIp = resolveClientIp(request);
                            log.warn("[AUTH-UNAUTHORIZED] Truy cập trái phép | uri={} {} | ip={} | msg={}",
                                    request.getMethod(), request.getRequestURI(), clientIp, exception.getMessage());
                            response.setStatus(HttpStatus.UNAUTHORIZED.value());
                            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
                            response.setCharacterEncoding("UTF-8");
                            response.getWriter().write("{\"code\":\"AUTH_UNAUTHORIZED\",\"message\":\"Cần đăng nhập để thực hiện thao tác này.\"}");
                        })
                        .accessDeniedHandler((request, response, exception) -> {
                            String clientIp = resolveClientIp(request);
                            String principal = request.getUserPrincipal() != null ? request.getUserPrincipal().getName() : "anonymous";
                            log.warn("[AUTH-FORBIDDEN] Bị từ chối quyền truy cập (403) | user={} | uri={} {} | ip={} | msg={}",
                                    principal, request.getMethod(), request.getRequestURI(), clientIp, exception.getMessage());
                            response.setStatus(HttpStatus.FORBIDDEN.value());
                            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
                            response.setCharacterEncoding("UTF-8");
                            response.getWriter().write("{\"code\":\"AUTH_FORBIDDEN\",\"message\":\"Bạn không có quyền thực hiện thao tác này.\"}");
                        }))
                .logout(logout -> logout
                        .logoutUrl("/api/v1/auth/logout")
                        .logoutSuccessHandler((request, response, authentication) ->
                                response.setStatus(HttpStatus.NO_CONTENT.value()))
                        .deleteCookies("JSESSIONID"))
                .httpBasic(AbstractHttpConfigurer::disable)
                .formLogin(AbstractHttpConfigurer::disable);

        return http.build();
    }

    @Bean
    CorsConfigurationSource corsConfigurationSource(
            @Value("${app.cors.allowed-origins}") String allowedOrigins
    ) {
        CorsConfiguration configuration = new CorsConfiguration();
        List<String> origins = Arrays.stream(allowedOrigins.split(","))
                .map(String::trim)
                .filter(origin -> !origin.isEmpty())
                .toList();
        configuration.setAllowedOrigins(origins);
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"));
        configuration.setAllowedHeaders(List.of("Content-Type", "X-XSRF-TOKEN", "Authorization", "X-Cart-Token"));
        configuration.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/api/**", configuration);
        source.registerCorsConfiguration("/media/products/**", configuration);
        return source;
    }

    private static String resolveClientIp(HttpServletRequest request) {
        String xff = request.getHeader("X-Forwarded-For");
        if (xff != null && !xff.isBlank()) {
            return xff.split(",")[0].trim();
        }
        String realIp = request.getHeader("X-Real-IP");
        if (realIp != null && !realIp.isBlank()) {
            return realIp.trim();
        }
        return request.getRemoteAddr();
    }
}
