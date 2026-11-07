package vn.nhaxinh.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import vn.nhaxinh.admin.AdminUserDetailsService;

/**
 * Bộ lọc xác thực JWT cho mọi request gửi tới API.
 * Ưu tiên đọc từ header "Authorization: Bearer <token>", dự phòng đọc từ cookie "nhaxinh_jwt".
 */
@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(JwtAuthenticationFilter.class);
    public static final String JWT_COOKIE_NAME = "nhaxinh_jwt";

    private final JwtService jwtService;
    private final AdminUserDetailsService userDetailsService;

    public JwtAuthenticationFilter(JwtService jwtService, AdminUserDetailsService userDetailsService) {
        this.jwtService = jwtService;
        this.userDetailsService = userDetailsService;
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain) throws ServletException, IOException {
        try {
            String token = resolveToken(request);
            if (token != null) {
                Long userId = jwtService.validateAndExtractUserId(token);
                Authentication existingAuth = SecurityContextHolder.getContext().getAuthentication();
                boolean notAuthenticatedYet = existingAuth == null
                        || !existingAuth.isAuthenticated()
                        || existingAuth instanceof AnonymousAuthenticationToken;

                if (userId != null && notAuthenticatedYet) {
                    UserDetails userDetails = userDetailsService.loadUserById(userId);
                    if (userDetails.isEnabled()) {
                        UsernamePasswordAuthenticationToken authToken = new UsernamePasswordAuthenticationToken(
                                userDetails,
                                null,
                                userDetails.getAuthorities());
                        authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                        SecurityContextHolder.getContext().setAuthentication(authToken);
                    }
                }
            }
        } catch (Exception ex) {
            log.debug("[JWT-FILTER] Bỏ qua xác thực JWT: {}", ex.getMessage());
        }

        filterChain.doFilter(request, response);
    }

    private String resolveToken(HttpServletRequest request) {
        String bearer = request.getHeader("Authorization");
        if (bearer != null && bearer.startsWith("Bearer ")) {
            String jwt = bearer.substring(7).trim();
            if (!jwt.isEmpty() && !"null".equalsIgnoreCase(jwt) && !"undefined".equalsIgnoreCase(jwt)) {
                return jwt;
            }
        }
        if (request.getCookies() != null) {
            for (Cookie cookie : request.getCookies()) {
                if (JWT_COOKIE_NAME.equals(cookie.getName()) && cookie.getValue() != null && !cookie.getValue().isBlank()) {
                    return cookie.getValue().trim();
                }
            }
        }
        return null;
    }
}

