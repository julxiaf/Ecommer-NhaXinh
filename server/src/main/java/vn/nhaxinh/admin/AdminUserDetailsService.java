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
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        java.util.Optional<User> userOpt = repository.findByUsername(username);
        if (userOpt.isEmpty() && username != null && username.contains("@")) {
            userOpt = repository.findByEmail(username.trim().toLowerCase());
        }
        if (userOpt.isEmpty() && username != null && username.matches("^(0|\\+84)[0-9]{8,10}$")) {
            userOpt = repository.findByPhone(username.trim());
        }
        if (userOpt.isEmpty()) {
            log.warn("[AUTH-CHECK] Không tìm thấy tài khoản '{}' trong CSDL (chưa đăng ký)", username);
            throw new UsernameNotFoundException("Không tìm thấy tài khoản: " + username);
        }
        User user = userOpt.get();
        log.info("[AUTH-CHECK] Tìm thấy tài khoản '{}' (id={}), tiến hành kiểm tra mật khẩu...", username, user.getId());

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
