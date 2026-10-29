import { useState, useMemo, useEffect } from "react";
import type {
  AdminStaff,
  PermissionKey,
  RoleDefinition,
  AdminAuditLog,
  AdminPermissionItem,
} from "../../services/admin/types";
import {
  ALL_PERMISSIONS,
  type SystemPermissionItem,
} from "../../services/admin/adminService";
import { hasPermission } from "../../components/admin/PermissionGate";
import { usePagination } from "../usePagination";

export interface CrudModuleConfig {
  id: string;
  name: string;
  description: string;
  category: "admin" | "api";
  view?: PermissionKey;
  create?: PermissionKey;
  edit?: PermissionKey;
  delete?: PermissionKey;
  manage?: PermissionKey;
}

export const CRUD_MODULE_CONFIGS: CrudModuleConfig[] = [
  // ── 1. Phân hệ Quản trị (Admin Portal Modules - 29 quyền) ──
  {
    id: "dashboard",
    name: "Tổng quan & Thống kê",
    description: "Xem trang tổng quan quản trị & KPI vận hành",
    category: "admin",
    view: "dashboard.view",
  },
  {
    id: "users",
    name: "Tài khoản & Nhân sự",
    description: "Quản lý tài khoản nhân viên và người dùng hệ thống",
    category: "admin",
    view: "users.view",
    create: "users.create",
    edit: "users.update",
    delete: "users.disable",
  },
  {
    id: "customers",
    name: "Khách hàng & CSKH",
    description: "Xem hồ sơ khách hàng & hỗ trợ chăm sóc khách hàng",
    category: "admin",
    view: "customers.view",
    manage: "customers.care",
  },
  {
    id: "roles",
    name: "Vai trò & Phân quyền",
    description: "Xem và cấu hình vai trò, ma trận phân quyền hệ thống",
    category: "admin",
    view: "roles.view",
    manage: "roles.manage",
  },
  {
    id: "products",
    name: "Sản phẩm Nội thất",
    description: "Xem, tạo mới, cập nhật và xóa sản phẩm",
    category: "admin",
    view: "products.view",
    create: "products.create",
    edit: "products.update",
    delete: "products.delete",
  },
  {
    id: "categories",
    name: "Danh mục & Bộ sưu tập",
    description: "Quản lý cây danh mục và bộ sưu tập sản phẩm",
    category: "admin",
    manage: "categories.manage",
  },
  {
    id: "inventory",
    name: "Kho & Tồn kho",
    description: "Xem tồn kho và điều chỉnh số lượng nhập/xuất kho",
    category: "admin",
    view: "inventory.view",
    manage: "inventory.manage",
  },
  {
    id: "orders",
    name: "Hóa đơn & Đơn hàng",
    description: "Xem danh sách, cập nhật trạng thái và hủy đơn hàng",
    category: "admin",
    view: "orders.view",
    edit: "orders.update",
    delete: "orders.cancel",
  },
  {
    id: "payments",
    name: "Giao dịch Thanh toán",
    description: "Xem giao dịch thanh toán và xử lý hoàn tiền",
    category: "admin",
    view: "payments.view",
    manage: "payments.refund",
  },
  {
    id: "coupons",
    name: "Mã giảm giá (Coupons)",
    description: "Tạo và quản lý chương trình khuyến mãi, mã giảm giá",
    category: "admin",
    manage: "coupons.manage",
  },
  {
    id: "reviews",
    name: "Đánh giá Sản phẩm",
    description: "Kiểm duyệt, ẩn/hiện đánh giá và bình luận của khách hàng",
    category: "admin",
    manage: "reviews.moderate",
  },
  {
    id: "policies",
    name: "Chính sách Hệ thống",
    description: "Quản lý nội dung chính sách bán hàng, bảo hành, đổi trả",
    category: "admin",
    manage: "policies.manage",
  },
  {
    id: "risk_alerts",
    name: "Cảnh báo Rủi ro",
    description: "Theo dõi và xử lý cảnh báo gian lận / rủi ro đơn hàng",
    category: "admin",
    view: "risk_alerts.view",
    manage: "risk_alerts.resolve",
  },
  {
    id: "email_logs",
    name: "Nhật ký Email & Thông báo",
    description: "Xem lịch sử gửi email thông báo hệ thống",
    category: "admin",
    view: "email_logs.view",
  },
  {
    id: "chatbot",
    name: "Trợ lý AI Chatbot",
    description: "Sử dụng công cụ Chatbot hỗ trợ tra cứu vận hành",
    category: "admin",
    manage: "chatbot.use",
  },
  {
    id: "audit_logs",
    name: "Nhật ký Hệ thống (Audit)",
    description: "Truy vết lịch sử thao tác và bảo mật hệ thống",
    category: "admin",
    view: "audit_logs.view",
  },

  // ── 2. Phạm vi Quyền API Cốt lõi (Core Backend API Scopes - 13 quyền) ──
  {
    id: "api_catalog",
    name: "API Catalog (Sản phẩm & Danh mục)",
    description: "Quyền truy cập trực tiếp REST API danh mục & sản phẩm",
    category: "api",
    view: "catalog:read",
    create: "catalog:create",
    edit: "catalog:update",
    delete: "catalog:delete",
  },
  {
    id: "api_order",
    name: "API Order (Đơn hàng)",
    description: "Quyền thao tác REST API đơn hàng và vận chuyển",
    category: "api",
    view: "order:read",
    edit: "order:update",
    delete: "order:cancel",
  },
  {
    id: "api_user",
    name: "API User & RBAC (Người dùng)",
    description: "Quyền truy vấn và quản trị người dùng/vai trò qua API",
    category: "api",
    view: "user:read",
    manage: "user:manage",
  },
  {
    id: "api_policy",
    name: "API Policy (Chính sách)",
    description: "Quyền đọc và ghi dữ liệu chính sách hệ thống qua API",
    category: "api",
    view: "policy:read",
    edit: "policy:write",
  },
  {
    id: "api_profile",
    name: "API Profile (Hồ sơ cá nhân)",
    description: "Quyền đọc và cập nhật thông tin hồ sơ tài khoản",
    category: "api",
    view: "profile:read",
    edit: "profile:write",
  },
];

interface UseAdminRolesProps {
  roles: RoleDefinition[];
  staffList: AdminStaff[];
  permissions?: AdminPermissionItem[];
  auditLogs?: AdminAuditLog[];
  currentRole: RoleDefinition;
  onUpdateRolePermissions: (roleId: string, permissions: PermissionKey[]) => void | Promise<void>;
  onSaveStaff: (
    staff: Partial<AdminStaff> & { username?: string; password?: string; phone?: string }
  ) => void | Promise<void>;
  onUpdateStaffStatus?: (userId: string, status: "active" | "inactive") => void | Promise<void>;
  onCreateRole: (role: Omit<RoleDefinition, "id">) => void | Promise<void>;
  onUpdateRole?: (roleId: string, data: { name: string; description: string }) => void | Promise<void>;
  onCreatePermission?: (data: { code: string; name: string; module: string; description: string }) => void | Promise<void>;
  onUpdatePermission?: (id: string | number, data: { name: string; module: string; description: string }) => void | Promise<void>;
  onDeletePermission?: (id: string | number, force?: boolean) => void | Promise<void>;
}

export function useAdminRoles({
  roles,
  staffList,
  permissions = [],
  auditLogs = [],
  currentRole,
  onUpdateRolePermissions,
  onSaveStaff,
  onCreateRole,
  onUpdateRole,
  onCreatePermission,
  onUpdatePermission,
  onDeletePermission,
}: UseAdminRolesProps) {
  const [activeTab, setActiveTab] = useState<"permissions" | "catalog" | "staff" | "logs">("permissions");
  const [viewMode, setViewMode] = useState<"matrix" | "list">("matrix");
  const [selectedRoleId, setSelectedRoleId] = useState(roles[0]?.id || "");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 4000);
  };

  // Search & Filter states for Role Permissions Matrix
  const [moduleSearch, setModuleSearch] = useState("");
  const [moduleCategoryFilter, setModuleCategoryFilter] = useState<"all" | "admin" | "api">("all");

  // Search & Filter states for Permissions Catalog (UC-RBAC-05 đến UC-RBAC-08)
  const [permSearch, setPermSearch] = useState("");
  const [permModuleFilter, setPermModuleFilter] = useState<string>("all");
  const [showCreatePermModal, setShowCreatePermModal] = useState(false);
  const [showEditPermModal, setShowEditPermModal] = useState(false);
  const [editingPerm, setEditingPerm] = useState<AdminPermissionItem | null>(null);

  // Form states cho Thêm quyền hạn mới (UC-RBAC-06)
  const [newPermCode, setNewPermCode] = useState("");
  const [newPermName, setNewPermName] = useState("");
  const [newPermModule, setNewPermModule] = useState("products");
  const [newPermDescription, setNewPermDescription] = useState("");

  // Form states cho Cập nhật quyền hạn (UC-RBAC-07)
  const [editPermName, setEditPermName] = useState("");
  const [editPermModule, setEditPermModule] = useState("products");
  const [editPermDescription, setEditPermDescription] = useState("");

  // Search & Filter states for Staff
  const [staffSearch, setStaffSearch] = useState("");
  const [staffRoleFilter, setStaffRoleFilter] = useState<string>("all");
  const [staffStatusFilter, setStaffStatusFilter] = useState<"all" | "active" | "inactive">("all");

  // Search & Filter states for RBAC Audit Logs
  const [rbacLogSearch, setRbacLogSearch] = useState("");
  const [rbacLogActionFilter, setRbacLogActionFilter] = useState<string>("all");

  const [showStaffModal, setShowStaffModal] = useState(false);
  const [showRoleForm, setShowRoleForm] = useState(false);

  // State cho Modal Sửa thông tin vai trò
  const [showEditRoleModal, setShowEditRoleModal] = useState(false);
  const [editRoleName, setEditRoleName] = useState("");
  const [editRoleDescription, setEditRoleDescription] = useState("");

  // State cho Modal Tạo nhân sự nội bộ
  const [staffName, setStaffName] = useState("");
  const [staffUsername, setStaffUsername] = useState("");
  const [staffEmail, setStaffEmail] = useState("");
  const [staffPhone, setStaffPhone] = useState("");
  const [staffPassword, setStaffPassword] = useState("");
  const [staffRoleCode, setStaffRoleCode] = useState(roles[0]?.code || "STAFF");

  // State cho Modal Đổi vai trò nhân sự
  const [showChangeRoleModal, setShowChangeRoleModal] = useState(false);
  const [selectedStaffForRole, setSelectedStaffForRole] = useState<AdminStaff | null>(null);
  const [newRoleCodeForStaff, setNewRoleCodeForStaff] = useState("");

  const [roleName, setRoleName] = useState("");
  const [roleCode, setRoleCode] = useState("");
  const [roleDescription, setRoleDescription] = useState("");

  useEffect(() => {
    if (roles.length > 0 && !roles.some((r) => r.id === selectedRoleId)) {
      setSelectedRoleId(roles[0].id);
    }
  }, [roles, selectedRoleId]);

  const selectedRole = roles.find((role) => role.id === selectedRoleId) || roles[0];
  const internalRoles = useMemo(() => roles.filter((r) => r.code !== "CUSTOMER"), [roles]);
  const canEditPermissions = hasPermission(currentRole, "roles.edit");
  const isSuperAdmin = selectedRole?.code === "SUPER_ADMIN" || selectedRole?.code === "ADMIN";

  const filteredModules = useMemo(() => {
    const q = moduleSearch.toLowerCase().trim();
    return CRUD_MODULE_CONFIGS.filter((mod) => {
      if (moduleCategoryFilter !== "all" && mod.category !== moduleCategoryFilter) return false;
      if (q) {
        const matchName = mod.name.toLowerCase().includes(q);
        const matchDesc = mod.description.toLowerCase().includes(q);
        const matchId = mod.id.toLowerCase().includes(q);
        const matchPerm = [mod.view, mod.create, mod.edit, mod.delete, mod.manage]
          .filter(Boolean)
          .some((k) => k!.toLowerCase().includes(q));
        if (!matchName && !matchDesc && !matchId && !matchPerm) return false;
      }
      return true;
    });
  }, [moduleSearch, moduleCategoryFilter]);

  const modulePagination = usePagination(filteredModules, 10, [moduleSearch, moduleCategoryFilter, viewMode]);

  const permissionGroups = useMemo(() => {
    const q = moduleSearch.toLowerCase().trim();
    return ALL_PERMISSIONS.reduce<Record<string, SystemPermissionItem[]>>((groups, permission) => {
      if (q) {
        const match =
          permission.name.toLowerCase().includes(q) ||
          permission.description.toLowerCase().includes(q) ||
          permission.key.toLowerCase().includes(q) ||
          permission.module.toLowerCase().includes(q);
        if (!match) return groups;
      }
      groups[permission.module] = [...(groups[permission.module] || []), permission];
      return groups;
    }, {});
  }, [moduleSearch]);

  const filteredStaff = useMemo(() => {
    const q = staffSearch.toLowerCase().trim();
    return staffList.filter((s) => {
      if (staffRoleFilter !== "all" && s.roleCode !== staffRoleFilter) return false;
      if (staffStatusFilter !== "all" && s.status !== staffStatusFilter) return false;
      if (q) {
        const matchName = s.name.toLowerCase().includes(q);
        const matchEmail = s.email.toLowerCase().includes(q);
        const matchUsername = (s.username || "").toLowerCase().includes(q);
        const matchPhone = (s.phone || "").toLowerCase().includes(q);
        if (!matchName && !matchEmail && !matchUsername && !matchPhone) return false;
      }
      return true;
    });
  }, [staffList, staffSearch, staffRoleFilter, staffStatusFilter]);

  const staffPagination = usePagination(filteredStaff, 10, [staffSearch, staffRoleFilter, staffStatusFilter]);

  // ── Danh mục Quyền hạn (Permissions Catalog - UC-RBAC-05 đến UC-RBAC-08) ──
  const allPermissionsList = useMemo<AdminPermissionItem[]>(() => {
    if (permissions && permissions.length > 0) return permissions;
    return ALL_PERMISSIONS.map((p) => ({
      id: String(p.id),
      code: p.key,
      name: p.name,
      module: p.module,
      description: p.description,
      status: "active",
      roleCount: roles.filter((r) => r.permissions.includes(p.key)).length,
      roles: roles.filter((r) => r.permissions.includes(p.key)).map((r) => r.code),
    }));
  }, [permissions, roles]);

  const filteredPermissions = useMemo(() => {
    const q = permSearch.toLowerCase().trim();
    return allPermissionsList.filter((p) => {
      if (permModuleFilter !== "all" && p.module !== permModuleFilter) return false;
      if (q) {
        const matchCode = p.code.toLowerCase().includes(q);
        const matchName = p.name.toLowerCase().includes(q);
        const matchMod = p.module.toLowerCase().includes(q);
        const matchDesc = p.description?.toLowerCase().includes(q);
        if (!matchCode && !matchName && !matchMod && !matchDesc) return false;
      }
      return true;
    });
  }, [allPermissionsList, permSearch, permModuleFilter]);

  const permPagination = usePagination(filteredPermissions, 10, [permSearch, permModuleFilter]);

  const handleOpenEditPerm = (perm: AdminPermissionItem) => {
    setEditingPerm(perm);
    setEditPermName(perm.name);
    setEditPermModule(perm.module);
    setEditPermDescription(perm.description || "");
    setShowEditPermModal(true);
  };

  const handleCreatePermSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPermCode || !newPermName || !newPermModule) return;
    const normalizedCode = newPermCode.trim().toLowerCase();
    if (allPermissionsList.some((p) => p.code.toLowerCase() === normalizedCode)) {
      showToast(`Mã quyền [${normalizedCode}] đã tồn tại trong danh mục. Vui lòng nhập mã khác!`);
      return;
    }
    await onCreatePermission?.({
      code: normalizedCode,
      name: newPermName.trim(),
      module: newPermModule.trim(),
      description: newPermDescription.trim(),
    });
    setShowCreatePermModal(false);
    setNewPermCode("");
    setNewPermName("");
    setNewPermModule("products");
    setNewPermDescription("");
    showToast(`Đã khai báo mã quyền hạn mới [${normalizedCode}] và ghi vào Nhật ký.`);
  };

  const handleEditPermSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPerm) return;
    await onUpdatePermission?.(editingPerm.id, {
      name: editPermName.trim(),
      module: editPermModule.trim(),
      description: editPermDescription.trim(),
    });
    setShowEditPermModal(false);
    showToast(`Đã cập nhật quyền hạn [${editingPerm.code}] và ghi vào Nhật ký.`);
  };

  const handleDeletePerm = async (perm: AdminPermissionItem) => {
    const rolesUsing = roles.filter((r) => r.permissions.includes(perm.code as PermissionKey));
    if (rolesUsing.length > 0) {
      if (
        !confirm(
          `CẢNH BÁO: Quyền [${perm.code}] đang được sử dụng bởi ${rolesUsing.length} vai trò (${rolesUsing.map((r) => r.name).join(", ")}).\n\nNếu tiếp tục, hệ thống sẽ tự động gỡ quyền này khỏi các vai trò liên quan và ghi log. Bạn có chắc chắn muốn xóa?`
        )
      ) {
        return;
      }
    } else {
      if (!confirm(`Bạn có chắc chắn muốn xóa mã quyền hạn [${perm.code}] - "${perm.name}"?`)) {
        return;
      }
    }
    await onDeletePermission?.(perm.id, true);
    showToast(`Đã xóa mã quyền hạn [${perm.code}] và ghi vào Nhật ký.`);
  };

  // Lọc Nhật ký Phân quyền (RBAC Audit Logs)
  const rbacLogs = useMemo(() => {
    const q = rbacLogSearch.toLowerCase().trim();
    return auditLogs.filter((log) => {
      const isRbac =
        log.module === "Phân quyền" ||
        String(log.action).includes("ROLE") ||
        String(log.action).includes("PERMISSION") ||
        String(log.action).includes("USER") ||
        String(log.action).includes("STAFF") ||
        String(log.action).includes("ASSIGN");
      if (!isRbac) return false;
      if (rbacLogActionFilter !== "all" && log.action !== rbacLogActionFilter) return false;
      if (q) {
        const matchTarget = log.target.toLowerCase().includes(q);
        const matchDesc = log.description.toLowerCase().includes(q);
        const matchActor = log.actor.name.toLowerCase().includes(q);
        if (!matchTarget && !matchDesc && !matchActor) return false;
      }
      return true;
    });
  }, [auditLogs, rbacLogSearch, rbacLogActionFilter]);

  const rbacLogsPagination = usePagination(rbacLogs, 10, [rbacLogSearch, rbacLogActionFilter]);

  const togglePermission = async (permission: PermissionKey) => {
    if (!selectedRole || !canEditPermissions || isSuperAdmin) return;
    const has = selectedRole.permissions.includes(permission);
    const next = has
      ? selectedRole.permissions.filter((item) => item !== permission)
      : [...selectedRole.permissions, permission];
    await onUpdateRolePermissions(selectedRole.id, next);
    showToast(
      `Đã ${has ? "thu hồi" : "cấp"} quyền [${permission}] cho vai trò "${selectedRole.name}" và ghi vào Nhật ký Phân quyền.`
    );
  };

  const handleToggleModuleAll = async (mod: CrudModuleConfig) => {
    if (!selectedRole || !canEditPermissions || isSuperAdmin) return;
    const moduleKeys: PermissionKey[] = [
      mod.view,
      mod.create,
      mod.edit,
      mod.delete,
      mod.manage,
    ].filter(Boolean) as PermissionKey[];

    const hasAll = moduleKeys.every((k) => selectedRole.permissions.includes(k));
    let next: PermissionKey[];
    if (hasAll) {
      next = selectedRole.permissions.filter((p) => !moduleKeys.includes(p));
    } else {
      const set = new Set([...selectedRole.permissions, ...moduleKeys]);
      next = Array.from(set);
    }
    await onUpdateRolePermissions(selectedRole.id, next);
    showToast(
      `Đã ${hasAll ? "thu hồi" : "cấp đủ"} quyền phân hệ "${mod.name}" cho vai trò "${selectedRole.name}" và ghi Nhật ký.`
    );
  };

  const handleGrantAll = async () => {
    if (!selectedRole || !canEditPermissions || isSuperAdmin) return;
    const allKeys = ALL_PERMISSIONS.map((p) => p.key);
    await onUpdateRolePermissions(selectedRole.id, allKeys);
    showToast(`Đã cấp toàn bộ ${allKeys.length} quyền cho vai trò "${selectedRole.name}" và ghi Nhật ký.`);
  };

  const handleGrantReadOnlyAll = async () => {
    if (!selectedRole || !canEditPermissions || isSuperAdmin) return;
    const viewKeys = CRUD_MODULE_CONFIGS.map((m) => m.view).filter(Boolean) as PermissionKey[];
    const set = new Set([...selectedRole.permissions, ...viewKeys]);
    await onUpdateRolePermissions(selectedRole.id, Array.from(set));
    showToast(`Đã cấp quyền Chỉ đọc (${viewKeys.length} phân hệ) cho vai trò "${selectedRole.name}" và ghi Nhật ký.`);
  };

  const handleRevokeAll = async () => {
    if (!selectedRole || !canEditPermissions || isSuperAdmin) return;
    if (confirm(`Thu hồi toàn bộ quyền của vai trò "${selectedRole.name}"?`)) {
      await onUpdateRolePermissions(selectedRole.id, []);
      showToast(`Đã thu hồi toàn bộ quyền của vai trò "${selectedRole.name}" và ghi Nhật ký.`);
    }
  };

  const handleCreateStaff = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!hasPermission(currentRole, "roles.create") && !hasPermission(currentRole, "users.create")) return;
    const selectedStaffRole = roles.find((role) => role.code === staffRoleCode) || roles[0];
    await onSaveStaff({
      name: staffName,
      username: staffUsername || staffEmail.split("@")[0],
      email: staffEmail,
      phone: staffPhone,
      password: staffPassword || "Nhaxinh@2026",
      roleCode: selectedStaffRole?.code || "STAFF",
      roleName: selectedStaffRole?.name || "Nhân viên",
      status: "active",
    });
    setStaffName("");
    setStaffUsername("");
    setStaffEmail("");
    setStaffPhone("");
    setStaffPassword("");
    setShowStaffModal(false);
    showToast(
      `Đã thêm nhân sự "${staffName}" [${selectedStaffRole?.code || "STAFF"}] và ghi vào Nhật ký Phân quyền.`
    );
  };

  const handleUpdateRoleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedRole || !onUpdateRole) return;
    await onUpdateRole(selectedRole.id, {
      name: editRoleName.trim(),
      description: editRoleDescription.trim(),
    });
    setShowEditRoleModal(false);
    showToast(`Đã cập nhật thông tin vai trò [${selectedRole.code}] và ghi vào Nhật ký Phân quyền.`);
  };

  const handleChangeStaffRoleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedStaffForRole || !newRoleCodeForStaff) return;
    const targetRole = roles.find((r) => r.code === newRoleCodeForStaff);
    await onSaveStaff({
      id: selectedStaffForRole.id,
      name: selectedStaffForRole.name,
      email: selectedStaffForRole.email,
      roleCode: newRoleCodeForStaff,
      roleName: targetRole?.name || newRoleCodeForStaff,
    });
    showToast(
      `Đã đổi vai trò nhân sự "${selectedStaffForRole.name}" sang [${newRoleCodeForStaff}] và ghi vào Nhật ký Phân quyền.`
    );
    setShowChangeRoleModal(false);
    setSelectedStaffForRole(null);
  };

  const handleCreateRole = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!hasPermission(currentRole, "roles.create")) return;
    const normalizedCode = roleCode.trim().toUpperCase().replace(/\s+/g, "_");
    await onCreateRole({
      name: roleName.trim(),
      code: normalizedCode,
      description: roleDescription.trim() || "Vai trò nghiệp vụ tùy chỉnh.",
      permissions: ["dashboard.view", "orders.view", "products.view", "categories.manage"],
    });
    setRoleName("");
    setRoleCode("");
    setRoleDescription("");
    setShowRoleForm(false);
    showToast(`Đã khởi tạo vai trò mới "${roleName.trim()}" [${normalizedCode}] và ghi vào Nhật ký Phân quyền.`);
  };

  return {
    activeTab,
    setActiveTab,
    viewMode,
    setViewMode,
    selectedRoleId,
    setSelectedRoleId,
    selectedRole,
    internalRoles,
    canEditPermissions,
    isSuperAdmin,
    toastMessage,
    showToast,
    moduleSearch,
    setModuleSearch,
    moduleCategoryFilter,
    setModuleCategoryFilter,
    modulePagination,
    permissionGroups,
    staffSearch,
    setStaffSearch,
    staffRoleFilter,
    setStaffRoleFilter,
    staffStatusFilter,
    setStaffStatusFilter,
    staffPagination,
    rbacLogSearch,
    setRbacLogSearch,
    rbacLogActionFilter,
    setRbacLogActionFilter,
    rbacLogs,
    rbacLogsPagination,
    showStaffModal,
    setShowStaffModal,
    showRoleForm,
    setShowRoleForm,
    showEditRoleModal,
    setShowEditRoleModal,
    editRoleName,
    setEditRoleName,
    editRoleDescription,
    setEditRoleDescription,
    staffName,
    setStaffName,
    staffUsername,
    setStaffUsername,
    staffEmail,
    setStaffEmail,
    staffPhone,
    setStaffPhone,
    staffPassword,
    setStaffPassword,
    staffRoleCode,
    setStaffRoleCode,
    showChangeRoleModal,
    setShowChangeRoleModal,
    selectedStaffForRole,
    setSelectedStaffForRole,
    newRoleCodeForStaff,
    setNewRoleCodeForStaff,
    roleName,
    setRoleName,
    roleCode,
    setRoleCode,
    roleDescription,
    setRoleDescription,
    allPermissionsList,
    filteredPermissions,
    permPagination,
    permSearch,
    setPermSearch,
    permModuleFilter,
    setPermModuleFilter,
    showCreatePermModal,
    setShowCreatePermModal,
    showEditPermModal,
    setShowEditPermModal,
    editingPerm,
    newPermCode,
    setNewPermCode,
    newPermName,
    setNewPermName,
    newPermModule,
    setNewPermModule,
    newPermDescription,
    setNewPermDescription,
    editPermName,
    setEditPermName,
    editPermModule,
    setEditPermModule,
    editPermDescription,
    setEditPermDescription,
    handleOpenEditPerm,
    handleCreatePermSubmit,
    handleEditPermSubmit,
    handleDeletePerm,
    togglePermission,
    handleToggleModuleAll,
    handleGrantAll,
    handleGrantReadOnlyAll,
    handleRevokeAll,
    handleCreateStaff,
    handleUpdateRoleSubmit,
    handleChangeStaffRoleSubmit,
    handleCreateRole,
  };
}
