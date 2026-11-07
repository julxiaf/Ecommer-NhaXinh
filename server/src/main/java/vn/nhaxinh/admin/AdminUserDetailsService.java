package vn.nhaxinh.admin;

import java.util.HashSet;
import java.util.Set;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.nhaxinh.user.Permission;
import vn.nhaxinh.user.Role;
import vn.nhaxinh.user.User;
import vn.nhaxinh.user.UserRepository;

@Service
public class AdminUserDetailsService implements UserDetailsService {

    private static final Logger log = LoggerFactory.getLogger(AdminUserDetailsService.class);
    private final UserRepository repository;

    public AdminUserDetailsService(UserRepository repository) {
        this.repository = repository;
    }

    @Override
    @Transactional(readOnly = true)
    public UserDetails loadUserByUsername(String identifier) throws UsernameNotFoundException {
        String clean = identifier != null ? identifier.trim() : "";
        // 1. Ưu tiên đăng nhập bằng Email
        java.util.Optional<User> userOpt = repository.findByEmail(clean.toLowerCase());
        // 2. Hỗ trợ dự phòng username hệ thống (như admin)
        if (userOpt.isEmpty()) {
            userOpt = repository.findByUsername(clean);
        }
        // 3. Dự phòng số điện thoại
        if (userOpt.isEmpty() && clean.matches("^(0|\\+84)[0-9]{8,10}$")) {
            userOpt = repository.findByPhone(clean);
        }
        if (userOpt.isEmpty()) {
            log.warn("[AUTH-CHECK] Không tìm thấy tài khoản với email/tên '{}' trong CSDL (chưa đăng ký)", identifier);
            throw new UsernameNotFoundException("Không tìm thấy tài khoản: " + identifier);
        }
        User user = userOpt.get();
        log.info("[AUTH-CHECK] Tìm thấy tài khoản '{}' (email='{}', id={}), tiến hành kiểm tra mật khẩu...",
                user.getUsername(), user.getEmail(), user.getId());

        return buildUserDetails(user);
    }

    @Transactional(readOnly = true)
    public UserDetails loadUserById(Long userId) throws UsernameNotFoundException {
        if (userId == null) {
            throw new UsernameNotFoundException("ID người dùng không hợp lệ");
        }
        User user = repository.findById(userId)
                .orElseThrow(() -> new UsernameNotFoundException("Không tìm thấy tài khoản với id: " + userId));
        return buildUserDetails(user);
    }

    private UserDetails buildUserDetails(User user) {
        Set<SimpleGrantedAuthority> authorities = new HashSet<>();

        if (user.getRoles() != null && !user.getRoles().isEmpty()) {
            for (Role role : user.getRoles()) {
                if (role.getCode() != null) {
                    authorities.add(new SimpleGrantedAuthority("ROLE_" + role.getCode().toUpperCase()));
                }
                if (role.getPermissions() != null) {
                    for (Permission perm : role.getPermissions()) {
                        if (perm.getCode() != null) {
                            authorities.add(new SimpleGrantedAuthority(perm.getCode()));
                        }
                    }
                }
            }
        }

        // Mặc định người dùng chưa phân quyền sẽ nhận ROLE_CUSTOMER, không thể nhận ROLE_ADMIN
        if (authorities.isEmpty()) {
            authorities.add(new SimpleGrantedAuthority("ROLE_CUSTOMER"));
        }

        return org.springframework.security.core.userdetails.User.withUsername(user.getUsername())
                .password(user.getPasswordHash())
                .authorities(authorities)
                .disabled(!"ACTIVE".equalsIgnoreCase(user.getStatus()))
                .build();
    }
}
