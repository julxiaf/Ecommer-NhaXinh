package vn.nhaxinh.user;

import java.util.List;
import java.util.Optional;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class RoleService {

    private final RoleRepository roleRepository;
    private final PermissionRepository permissionRepository;

    public RoleService(RoleRepository roleRepository, PermissionRepository permissionRepository) {
        this.roleRepository = roleRepository;
        this.permissionRepository = permissionRepository;
    }

    @Transactional(readOnly = true)
    public List<Role> findAllRoles() {
        return roleRepository.findAll();
    }

    @Transactional(readOnly = true)
    public Optional<Role> findRoleByCode(String code) {
        return roleRepository.findByCode(code);
    }

    @Transactional(readOnly = true)
    public List<Permission> findAllPermissions() {
        return permissionRepository.findAll();
    }

    @Transactional(readOnly = true)
    public List<Permission> findPermissionsByModule(String module) {
        return permissionRepository.findByModule(module);
    }

    public Role saveRole(Role role) {
        return roleRepository.save(role);
    }
}
