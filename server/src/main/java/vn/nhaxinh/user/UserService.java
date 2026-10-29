package vn.nhaxinh.user;

import java.util.List;
import java.util.Optional;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class UserService {

    private final UserRepository userRepository;
    private final UserAddressRepository addressRepository;
    private final PasswordEncoder passwordEncoder;
    private final RoleRepository roleRepository;

    public UserService(
            UserRepository userRepository,
            UserAddressRepository addressRepository,
            PasswordEncoder passwordEncoder,
            RoleRepository roleRepository) {
        this.userRepository = userRepository;
        this.addressRepository = addressRepository;
        this.passwordEncoder = passwordEncoder;
        this.roleRepository = roleRepository;
    }

    @Transactional(readOnly = true)
    public List<User> findAll() {
        return userRepository.findAll();
    }

    @Transactional(readOnly = true)
    public Optional<User> findById(Long id) {
        return userRepository.findById(id);
    }

    @Transactional(readOnly = true)
    public Optional<User> findByUsername(String username) {
        return userRepository.findByUsername(username);
    }

    @Transactional(readOnly = true)
    public Optional<User> findByPhone(String phone) {
        return userRepository.findByPhone(phone);
    }

    @Transactional(readOnly = true)
    public Optional<User> findByEmail(String email) {
        return userRepository.findByEmail(email);
    }

    /**
     * Đăng ký tài khoản khách hàng mới.
     *
     * Kiểm tra trùng lặp username / email / phone trước khi lưu.
     * Password được hash bằng BCrypt — KHÔNG bao giờ lưu plain text.
     *
     * @throws IllegalArgumentException nếu username, email hoặc phone đã tồn tại
     */
    public User registerUser(String username, String rawPassword,
            String email, String phone, String fullName,
            boolean marketingConsent) {

        if (username != null && userRepository.findByUsername(username).isPresent()) {
            throw new IllegalArgumentException("USERNAME_TAKEN");
        }
        if (email != null && userRepository.findByEmail(email).isPresent()) {
            throw new IllegalArgumentException("EMAIL_TAKEN");
        }
        if (phone != null && userRepository.findByPhone(phone).isPresent()) {
            throw new IllegalArgumentException("PHONE_TAKEN");
        }

        User user = new User();
        user.setUsername(username);
        user.setPasswordHash(passwordEncoder.encode(rawPassword));
        user.setEmail(email);
        user.setPhone(phone);
        user.setFullName(fullName);
        user.setAccountType("REGISTERED");
        user.setStatus("ACTIVE");
        user.setMarketingConsent(marketingConsent);
        Role customerRole = roleRepository.findByCodeWithPermissions("CUSTOMER")
                .or(() -> roleRepository.findByCode("CUSTOMER"))
                .orElseGet(() -> {
                    Role r = new Role("CUSTOMER", "Khách hàng", "Khách hàng mua sắm thành viên", true);
                    return roleRepository.save(r);
                });
        user.getRoles().add(customerRole);

        User saved = userRepository.save(user);
        for (Role r : saved.getRoles()) {
            if (r.getPermissions() != null) {
                r.getPermissions().size();
            }
        }
        return saved;
    }

    /**
     * Gán vai trò cho người dùng (chỉ Admin mới có quyền gọi).
     */
    public User assignRoles(Long userId, java.util.Set<String> roleCodes) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("USER_NOT_FOUND"));

        java.util.Set<Role> newRoles = new java.util.HashSet<>();
        if (roleCodes != null) {
            for (String code : roleCodes) {
                String cleanCode = code.trim().toUpperCase();
                Role role = roleRepository.findByCodeWithPermissions(cleanCode)
                        .or(() -> roleRepository.findByCode(cleanCode))
                        .orElseThrow(() -> new IllegalArgumentException("ROLE_NOT_FOUND: " + cleanCode));
                if (role.getPermissions() != null) {
                    role.getPermissions().size();
                }
                newRoles.add(role);
            }
        }
        user.setRoles(newRoles);
        return userRepository.save(user);
    }

    public User save(User user) {
        return userRepository.save(user);
    }

    public void changePassword(Long userId, String rawPassword) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("USER_NOT_FOUND"));
        user.setPasswordHash(passwordEncoder.encode(rawPassword));
        userRepository.save(user);
    }

    public void deleteById(Long id) {
        userRepository.deleteById(id);
    }

    @Transactional(readOnly = true)
    public List<UserAddress> getAddressesByUserId(Long userId) {
        return addressRepository.findByUserId(userId);
    }

    public UserAddress saveAddress(UserAddress address) {
        if (Boolean.TRUE.equals(address.getIsDefault()) && address.getUser() != null) {
            addressRepository.findByUserIdAndIsDefaultTrue(address.getUser().getId())
                    .ifPresent(existingDefault -> {
                        if (!existingDefault.getId().equals(address.getId())) {
                            existingDefault.setIsDefault(false);
                            addressRepository.save(existingDefault);
                        }
                    });
        }
        return addressRepository.save(address);
    }
}
