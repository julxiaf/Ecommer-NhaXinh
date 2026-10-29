import React from "react";
import {
  Key, Plus, ShieldCheck, Trash2, UserPlus, Users, Eye, PlusCircle,
  Edit3, Trash, Sparkles, RefreshCw, Check, CheckCircle2,
  Table, List, Layers, Lock, Shield, Globe, Search
} from "lucide-react";
import type { AdminAuditLog, AdminStaff, PermissionKey, RoleDefinition, AdminPermissionItem } from "../../../services/admin/types";
import { ALL_PERMISSIONS } from "../../../services/admin/adminService";
import PermissionGate from "../../../components/admin/PermissionGate";
import { AdminPagination } from "../../../components/admin/AdminPagination";
import { useAdminRoles, CRUD_MODULE_CONFIGS } from "../../../hooks/admin/useAdminRoles";

const MODULE_TITLES: Record<string, string> = {
  dashboard: "Tổng quan & Bảng điều khiển (dashboard)",
  users: "Tài khoản Quản trị & Nhân viên (users)",
  customers: "Khách hàng & Chăm sóc CSKH (customers)",
  permissions: "Vai trò & Phân quyền (permissions)",
  products: "Sản phẩm nội thất (products)",
  categories: "Danh mục sản phẩm (categories)",
  inventory: "Kho & Tồn kho biến thể (inventory)",
  orders: "Hóa đơn & Đơn hàng (orders)",
  payments: "Thanh toán & Hoàn tiền (payments)",
  coupons: "Khuyến mãi & Mã Voucher (coupons)",
  reviews: "Đánh giá & Bình luận (reviews)",
  policies: "Chính sách website (policies)",
  risk: "Cảnh báo rủi ro đơn hàng (risk)",
  notifications: "Nhật ký Email / Thông báo (notifications)",
  chatbot: "Chatbot AI Quản trị (chatbot)",
  audit: "Nhật ký hệ thống - Audit Logs (audit)",
  catalog: "API Catalog Sản phẩm (catalog REST)",
  order: "API Đơn hàng (order REST)",
  user: "API Người dùng & Phân quyền (user REST)",
  policy: "API Chính sách (policy REST)",
  profile: "API Thông tin cá nhân (profile REST)",
};

interface RolePermissionViewProps {
  roles: RoleDefinition[];
  staffList: AdminStaff[];
  permissions?: AdminPermissionItem[];
  auditLogs?: AdminAuditLog[];
  currentRole: RoleDefinition;
  onUpdateRolePermissions: (roleId: string, permissions: PermissionKey[]) => void;
  onSaveStaff: (staff: Partial<AdminStaff> & { username?: string; password?: string; phone?: string }) => void;
  onUpdateStaffStatus?: (userId: string, status: "active" | "inactive") => void;
  onCreateRole: (role: Omit<RoleDefinition, "id">) => void;
  onUpdateRole?: (roleId: string, data: { name: string; description: string }) => void;
  onDeleteRole: (roleId: string) => void;
  onCreatePermission?: (data: { code: string; name: string; module: string; description: string }) => void;
  onUpdatePermission?: (id: string | number, data: { name: string; module: string; description: string }) => void;
  onDeletePermission?: (id: string | number, force?: boolean) => void;
}

export default function RolePermissionView({
  roles,
  staffList,
  permissions = [],
  auditLogs = [],
  currentRole,
  onUpdateRolePermissions,
  onSaveStaff,
  onUpdateStaffStatus,
  onCreateRole,
  onUpdateRole,
  onDeleteRole,
  onCreatePermission,
  onUpdatePermission,
  onDeletePermission,
}: RolePermissionViewProps) {
  const {
    activeTab,
    setActiveTab,
    viewMode,
    setViewMode,
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
  } = useAdminRoles({
    roles,
    staffList,
    permissions,
    auditLogs,
    currentRole,
    onUpdateRolePermissions,
    onSaveStaff,
    onCreateRole,
    onUpdateRole,
    onCreatePermission,
    onUpdatePermission,
    onDeletePermission,
  });

  const { paginatedItems: displayedModules } = modulePagination;
  const { paginatedItems: displayedPermissions } = permPagination;
  const { paginatedItems: displayedStaff } = staffPagination;
  const { paginatedItems: displayedRbacLogs } = rbacLogsPagination;

  return (
    <div className="space-y-6">
      {toastMessage && (
        <div className="admin-toast-banner flex items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-800 animate-in fade-in duration-150">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
            <span>{toastMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setActiveTab("logs")}
            className="underline text-emerald-700 hover:text-emerald-900 font-bold shrink-0"
          >
            Xem Nhật ký Phân quyền →
          </button>
        </div>
      )}

      <section className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-bold text-slate-900">
            <ShieldCheck className="text-blue-600" size={24} />
            Quản trị Vai trò & Ma trận Phân quyền CRUD
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Kiểm soát quyền truy cập chi tiết: Xem (Read), Thêm (Create), Sửa (Update), Xóa (Delete), Quản trị (Manage) và tự động ghi Nhật ký Kiểm toán (Audit Log).
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("permissions")}
            className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold transition-all ${
              activeTab === "permissions" ? "bg-blue-600 text-white shadow-sm" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            <Layers size={14} /> Vai trò & Ma trận ({roles.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("catalog")}
            className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold transition-all ${
              activeTab === "catalog" ? "bg-blue-600 text-white shadow-sm" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            <Key size={14} /> Danh mục Quyền hạn ({allPermissionsList.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("staff")}
            className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold transition-all ${
              activeTab === "staff" ? "bg-blue-600 text-white shadow-sm" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            <Users size={14} /> Tài khoản & Nhân sự ({staffList.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("logs")}
            className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold transition-all ${
              activeTab === "logs" ? "bg-blue-600 text-white shadow-sm" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            <Shield size={14} /> Nhật ký Phân quyền ({rbacLogs.length})
          </button>
        </div>
      </section>

      {activeTab === "permissions" && (
        <div className="space-y-4">
          {/* Role selector & Create role bar */}
          <section className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2 overflow-x-auto">
              <span className="text-xs font-bold uppercase text-slate-500 mr-1 flex items-center gap-1">
                <Layers size={13} /> Vai trò:
              </span>
              {roles.map((role) => {
                const isSelected = selectedRole?.id === role.id;
                return (
                  <button
                    key={role.id}
                    type="button"
                    onClick={() => setSelectedRoleId(role.id)}
                    className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all ${
                      isSelected
                        ? "border-blue-600 bg-blue-50 text-blue-700 ring-1 ring-blue-600 shadow-xs"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <span>{role.name}</span>
                    <span className="rounded-full bg-slate-100 px-1.5 py-0.2 font-mono text-[10px] text-slate-500">
                      {role.permissions.length}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              {/* Toggle view mode: Matrix vs List */}
              <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-xs">
                <button
                  type="button"
                  onClick={() => setViewMode("matrix")}
                  className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-semibold transition-all ${
                    viewMode === "matrix" ? "bg-white text-blue-700 shadow-xs" : "text-slate-600 hover:text-slate-900"
                  }`}
                  title="Hiển thị theo Ma trận CRUD trực quan"
                >
                  <Table size={13} /> Ma trận CRUD
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("list")}
                  className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-semibold transition-all ${
                    viewMode === "list" ? "bg-white text-blue-700 shadow-xs" : "text-slate-600 hover:text-slate-900"
                  }`}
                  title="Hiển thị danh sách nhóm quyền"
                >
                  <List size={13} /> Danh sách
                </button>
              </div>

              <PermissionGate permission="roles.create" currentRole={currentRole}>
                <button
                  type="button"
                  onClick={() => setShowRoleForm((open) => !open)}
                  className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-blue-700 shadow-sm transition-all"
                >
                  <Plus size={14} /> Tạo vai trò
                </button>
              </PermissionGate>
            </div>
          </section>

          {showRoleForm && (
            <form onSubmit={handleCreateRole} className="grid gap-3 rounded-xl border border-blue-200 bg-blue-50/50 p-4 sm:grid-cols-3 animate-in fade-in duration-150">
              <input required value={roleName} onChange={(event) => setRoleName(event.target.value)} placeholder="Tên vai trò (VD: Quản lý Bán hàng)" className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500" />
              <input required value={roleCode} onChange={(event) => setRoleCode(event.target.value)} placeholder="Mã vai trò (VD: SALES_MANAGER)" className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs uppercase font-mono focus:ring-2 focus:ring-blue-500" />
              <input value={roleDescription} onChange={(event) => setRoleDescription(event.target.value)} placeholder="Mô tả trách nhiệm vai trò" className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500" />
              <div className="flex justify-end gap-2 sm:col-span-3">
                <button type="button" onClick={() => setShowRoleForm(false)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium hover:bg-slate-50">Đóng</button>
                <button type="submit" className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700 shadow-xs">Lưu vai trò mới</button>
              </div>
            </form>
          )}

          {selectedRole && (
            <section className="space-y-4">
              {/* Selected Role Header & Bulk Actions Toolbar */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-slate-900 text-sm">{selectedRole.name}</h3>
                    <code className="rounded bg-slate-100 px-2 py-0.5 text-xs font-mono font-bold text-slate-700 border border-slate-200">{selectedRole.code}</code>
                    {selectedRole.isSystem && (
                      <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-bold text-amber-800 flex items-center gap-1">
                        <Lock size={11} /> Vai trò hệ thống
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-slate-500">{selectedRole.description}</p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs text-slate-500 mr-2">
                    Đã cấp: <strong className="text-blue-700 font-bold">{selectedRole.permissions.length}</strong> / {ALL_PERMISSIONS.length} quyền
                  </span>

                  {canEditPermissions && !isSuperAdmin && (
                    <>
                      <button
                        type="button"
                        onClick={handleGrantAll}
                        className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-[11px] font-semibold text-blue-700 hover:bg-blue-100 transition-all"
                        title="Cấp toàn bộ quyền CRUD"
                      >
                        <Sparkles size={12} /> Cấp toàn bộ CRUD
                      </button>
                      <button
                        type="button"
                        onClick={handleGrantReadOnlyAll}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-100 transition-all"
                        title="Chỉ cấp quyền xem tất cả phân hệ"
                      >
                        <Eye size={12} /> Chỉ đọc (Read-only)
                      </button>
                      <button
                        type="button"
                        onClick={handleRevokeAll}
                        className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-[11px] font-semibold text-rose-700 hover:bg-rose-100 transition-all"
                        title="Thu hồi toàn bộ quyền"
                      >
                        <RefreshCw size={12} /> Thu hồi hết
                      </button>
                    </>
                  )}

                  {canEditPermissions && !selectedRole.isSystem && selectedRole.code !== "SUPER_ADMIN" && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditRoleName(selectedRole.name);
                        setEditRoleDescription(selectedRole.description || "");
                        setShowEditRoleModal(true);
                      }}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 transition-all ml-1"
                      title="Sửa tên và mô tả vai trò"
                    >
                      <Edit3 size={13} className="text-blue-600" /> Sửa vai trò
                    </button>
                  )}

                  <PermissionGate permission="roles.delete" currentRole={currentRole}>
                    {!selectedRole.isSystem && selectedRole.code !== "SUPER_ADMIN" && (
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`Bạn có chắc chắn muốn xóa vai trò "${selectedRole.name}"? Hành động này sẽ được ghi nhận vào Nhật ký Phân quyền.`)) {
                            onDeleteRole(selectedRole.id);
                            showToast(`Đã xóa vai trò "${selectedRole.name}" [${selectedRole.code}] và ghi vào Nhật ký Phân quyền.`);
                          }
                        }}
                        className="inline-flex items-center gap-1 rounded-lg border border-rose-200 px-2.5 py-1.5 text-[11px] font-semibold text-rose-700 hover:bg-rose-50 transition-all ml-1"
                      >
                        <Trash2 size={13} /> Xóa vai trò
                      </button>
                    )}
                  </PermissionGate>
                </div>
              </div>

              {/* Filter bar for Permissions */}
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm">
                <div className="relative flex-1 min-w-55">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Tìm phân hệ hoặc mã quyền (VD: products, orders.cancel, catalog:read)..."
                    value={moduleSearch}
                    onChange={(e) => setModuleSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                {viewMode === "matrix" && (
                  <select
                    value={moduleCategoryFilter}
                    onChange={(e) => setModuleCategoryFilter(e.target.value as "all" | "admin" | "api")}
                    className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-700"
                  >
                    <option value="all">Tất cả nhóm phân hệ ({CRUD_MODULE_CONFIGS.length})</option>
                    <option value="admin">Giao diện Quản trị (Admin Modules)</option>
                    <option value="api">Quyền API Cốt lõi (REST Scopes)</option>
                  </select>
                )}
              </div>

              {/* ══════════════════════════════════════════════════════════ */}
              {/* MODE 1: ENTERPRISE CRUD MATRIX TABLE (42 PERMISSIONS)       */}
              {/* ══════════════════════════════════════════════════════════ */}
              {viewMode === "matrix" && (
                <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                  <div className="border-b border-slate-200 bg-slate-50/80 px-4 py-3 flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                        <Key size={14} className="text-blue-600" />
                        BẢNG MA TRẬN PHÂN QUYỀN CRUD ({ALL_PERMISSIONS.length} QUYỀN TRÊN {CRUD_MODULE_CONFIGS.length} PHÂN HỆ)
                      </h4>
                      <p className="mt-0.5 text-[11px] text-slate-500">
                        Hộp kiểm đại diện cho 42 quyền chuẩn từ hệ thống; bấm trực tiếp vào ô để cấp hoặc thu hồi quyền cho vai trò "{selectedRole.name}".
                      </p>
                    </div>

                    {isSuperAdmin && (
                      <span className="text-xs bg-amber-50 text-amber-900 border border-amber-200 px-3 py-1 rounded-md font-medium">
                        Super Admin luôn giữ toàn quyền hệ thống.
                      </span>
                    )}
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-100/70 border-b border-slate-200 text-slate-600 uppercase text-[11px] font-bold">
                          <th className="py-3 px-4 w-72">PHÂN HỆ NGHIỆP VỤ</th>
                          <th className="py-3 px-2 text-center w-28">
                            <div className="flex items-center justify-center gap-1 text-slate-700">
                              <Eye size={13} className="text-sky-600" />
                              <span>XEM (READ)</span>
                            </div>
                          </th>
                          <th className="py-3 px-2 text-center w-28">
                            <div className="flex items-center justify-center gap-1 text-slate-700">
                              <PlusCircle size={13} className="text-emerald-600" />
                              <span>THÊM (CREATE)</span>
                            </div>
                          </th>
                          <th className="py-3 px-2 text-center w-28">
                            <div className="flex items-center justify-center gap-1 text-slate-700">
                              <Edit3 size={13} className="text-amber-600" />
                              <span>SỬA (UPDATE)</span>
                            </div>
                          </th>
                          <th className="py-3 px-2 text-center w-28">
                            <div className="flex items-center justify-center gap-1 text-slate-700">
                              <Trash size={13} className="text-rose-600" />
                              <span>XÓA / HỦY (DEL)</span>
                            </div>
                          </th>
                          <th className="py-3 px-2 text-center w-32">
                            <div className="flex items-center justify-center gap-1 text-slate-700">
                              <ShieldCheck size={13} className="text-purple-600" />
                              <span>QUẢN TRỊ (MANAGE)</span>
                            </div>
                          </th>
                          <th className="py-3 px-3 text-center w-32 bg-slate-100/90">
                            <span>TOÀN PHÂN HỆ</span>
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {displayedModules.map((mod, idx) => {
                          const isFirstAdmin = mod.category === "admin" && (idx === 0 || displayedModules[idx - 1]?.category !== "admin");
                          const isFirstApi = mod.category === "api" && (idx === 0 || displayedModules[idx - 1]?.category !== "api");

                          const moduleKeys: PermissionKey[] = [
                            mod.view,
                            mod.create,
                            mod.edit,
                            mod.delete,
                            mod.manage,
                          ].filter(Boolean) as PermissionKey[];

                          const grantedCount = moduleKeys.filter((k) =>
                            selectedRole?.permissions.includes(k)
                          ).length;
                          const hasAll = moduleKeys.length > 0 && grantedCount === moduleKeys.length;
                          const hasSome = grantedCount > 0 && !hasAll;

                          const renderCell = (
                            permKey: PermissionKey | undefined,
                            actionLabel: string,
                            colorScheme: { active: string; text: string }
                          ) => {
                            if (!permKey) {
                              return (
                                <td className="py-2 px-2 text-center text-slate-300 select-none">
                                  <span title="Không áp dụng cho phân hệ này">—</span>
                                </td>
                              );
                            }

                            const isChecked = selectedRole?.permissions.includes(permKey);
                            const pDetail = ALL_PERMISSIONS.find((p) => p.key === permKey);

                            return (
                              <td
                                className={`py-2 px-2 text-center transition-colors ${
                                  isChecked ? colorScheme.active : "hover:bg-slate-50"
                                }`}
                              >
                                <label className="inline-flex flex-col items-center justify-center cursor-pointer group">
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    disabled={!canEditPermissions || isSuperAdmin}
                                    onChange={() => togglePermission(permKey)}
                                    className="sr-only"
                                  />
                                  <div
                                    className={`w-5 h-5 rounded flex items-center justify-center border transition-all ${
                                      isChecked
                                        ? `${colorScheme.text} border-transparent shadow-xs scale-105`
                                        : "border-slate-300 bg-white group-hover:border-slate-400"
                                    } ${isSuperAdmin ? "opacity-90 cursor-not-allowed" : ""}`}
                                    title={`${pDetail ? `#${pDetail.id} ` : ""}${actionLabel}: ${permKey} - ${pDetail?.name || ""}`}
                                  >
                                    {isChecked && <Check size={13} className="text-white stroke-[2.5]" />}
                                  </div>
                                  <span className="text-[9px] font-mono text-slate-400 mt-0.5 block truncate max-w-21.25" title={permKey}>
                                    {permKey}
                                  </span>
                                </label>
                              </td>
                            );
                          };

                          return (
                            <React.Fragment key={mod.id}>
                              {isFirstAdmin && (
                                <tr className="bg-slate-100/90 text-slate-700 font-bold text-[11px] uppercase tracking-wider border-y border-slate-200">
                                  <td colSpan={7} className="py-2 px-4 flex items-center gap-2">
                                    <Shield size={14} className="text-blue-600" />
                                    <span>PHÂN HỆ GIAO DIỆN QUẢN TRỊ (ADMIN PORTAL MODULES - 29 QUYỀN)</span>
                                    <span className="text-[10px] text-slate-500 font-normal normal-case">
                                      (Quy chuẩn dot-notation: module.action)
                                    </span>
                                  </td>
                                </tr>
                              )}

                              {isFirstApi && (
                                <tr className="bg-slate-100/90 text-slate-700 font-bold text-[11px] uppercase tracking-wider border-y border-slate-200">
                                  <td colSpan={7} className="py-2 px-4 flex items-center gap-2">
                                    <Globe size={14} className="text-blue-600" />
                                    <span>PHẠM VI QUYỀN API CỐT LÕI (CORE BACKEND API SCOPES - 13 QUYỀN)</span>
                                    <span className="text-[10px] text-slate-500 font-normal normal-case">
                                      (Quy chuẩn colon-notation: resource:action bảo vệ các REST Endpoint)
                                    </span>
                                  </td>
                                </tr>
                              )}

                              <tr
                                className={`transition-colors ${
                                  idx % 2 === 0 ? "bg-white" : "bg-slate-50/30"
                                } hover:bg-blue-50/30`}
                              >
                                {/* Module info */}
                                <td className="py-2.5 px-4">
                                  <div className="font-bold text-slate-900 text-xs flex items-center gap-2">
                                    <span>{mod.name}</span>
                                    <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-1.5 py-0.2 rounded">
                                      {mod.id}
                                    </span>
                                  </div>
                                  <div className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                                    {mod.description}
                                  </div>
                                </td>

                                {/* Read */}
                                {renderCell(mod.view, "Quyền Xem (Read)", {
                                  active: "bg-sky-50/70",
                                  text: "bg-sky-600",
                                })}

                                {/* Create */}
                                {renderCell(mod.create, "Quyền Thêm (Create)", {
                                  active: "bg-emerald-50/70",
                                  text: "bg-emerald-600",
                                })}

                                {/* Update */}
                                {renderCell(mod.edit, "Quyền Sửa (Update)", {
                                  active: "bg-amber-50/70",
                                  text: "bg-amber-600",
                                })}

                                {/* Delete / Cancel / Disable */}
                                {renderCell(mod.delete, "Quyền Xóa / Hủy / Khóa (Delete)", {
                                  active: "bg-rose-50/70",
                                  text: "bg-rose-600",
                                })}

                                {/* Manage / Specific */}
                                {renderCell(mod.manage, "Quyền Quản trị / Nghiệp vụ đặc thù (Manage)", {
                                  active: "bg-purple-50/70",
                                  text: "bg-purple-600",
                                })}

                                {/* Full CRUD Toggle for Module */}
                                <td className="py-2 px-3 text-center bg-slate-50/50">
                                  <button
                                    type="button"
                                    disabled={!canEditPermissions || isSuperAdmin}
                                    onClick={() => handleToggleModuleAll(mod)}
                                    className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all border inline-flex items-center gap-1 ${
                                      hasAll
                                        ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                                        : hasSome
                                        ? "bg-blue-50 text-blue-700 border-blue-300"
                                        : "bg-white text-slate-600 border-slate-300 hover:bg-slate-100"
                                    } ${isSuperAdmin ? "opacity-90 cursor-not-allowed" : ""}`}
                                    title={hasAll ? "Nhấn để hủy toàn bộ quyền phân hệ này" : "Nhấn để cấp toàn bộ quyền phân hệ này"}
                                  >
                                    {hasAll ? (
                                      <>
                                        <CheckCircle2 size={12} /> Đủ quyền
                                      </>
                                    ) : hasSome ? (
                                      <>
                                        <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                                        {grantedCount}/{moduleKeys.length}
                                      </>
                                    ) : (
                                      <>
                                        <Plus size={12} /> Bật hết
                                      </>
                                    )}
                                  </button>
                                </td>
                              </tr>
                            </React.Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div className="p-3 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-[11px] text-slate-500">
                    <div className="flex items-center gap-4">
                      <span className="font-semibold text-slate-700">Chú thích trạng thái:</span>
                      <span className="flex items-center gap-1">
                        <span className="w-3.5 h-3.5 rounded bg-blue-600 inline-flex items-center justify-center text-white text-[10px]">✓</span> Đã cấp quyền
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-3.5 h-3.5 rounded border border-slate-300 bg-white inline-block" /> Chưa cấp quyền
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="text-slate-400 font-bold">—</span> Phân hệ không hỗ trợ quyền này
                      </span>
                    </div>
                    <span className="italic text-slate-400">
                      * Mọi thay đổi phân quyền sẽ được hệ thống lưu trực tiếp vào cơ sở dữ liệu và ghi nhận vào Nhật ký hoạt động (Audit Log).
                    </span>
                  </div>
                  <AdminPagination pagination={modulePagination} itemLabel="phân hệ" />
                </div>
              )}

              {/* ══════════════════════════════════════════════════════════ */}
              {/* MODE 2: GROUPED LIST VIEW (42 PERMISSIONS)                 */}
              {/* ══════════════════════════════════════════════════════════ */}
              {viewMode === "list" && (
                <div className="space-y-4">
                  {Object.entries(permissionGroups).map(([groupKey, permissions]) => {
                    const grantedInGroup = permissions.filter((p) => selectedRole.permissions.includes(p.key)).length;
                    return (
                      <section key={groupKey} className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                        <h4 className="border-b border-slate-100 bg-slate-50 px-4 py-3 text-xs font-bold text-slate-800 flex items-center justify-between">
                          <span className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-blue-600 inline-block" />
                            {MODULE_TITLES[groupKey] || `Phân hệ: ${groupKey}`}
                          </span>
                          <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded">
                            Đã cấp: {grantedInGroup} / {permissions.length} quyền
                          </span>
                        </h4>
                        <div className="grid gap-2 p-4 md:grid-cols-2">
                          {permissions.map((permission) => {
                            const checked = selectedRole.permissions.includes(permission.key);
                            return (
                              <label
                                key={permission.key}
                                className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors ${
                                  checked ? "border-blue-200 bg-blue-50/60" : "border-slate-200 hover:bg-slate-50"
                                } ${isSuperAdmin ? "cursor-not-allowed opacity-75" : ""}`}
                              >
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  disabled={!canEditPermissions || isSuperAdmin}
                                  onChange={() => togglePermission(permission.key)}
                                  className="mt-0.5 accent-blue-600"
                                />
                                <div className="flex-1">
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-slate-800">{permission.name}</span>
                                    <span className="font-mono text-[10px] text-slate-400 bg-slate-100 px-1 rounded">
                                      #{permission.id}
                                    </span>
                                  </div>
                                  <span className="mt-0.5 block text-[11px] leading-relaxed text-slate-500">{permission.description}</span>
                                  <code className="mt-1 block text-[10px] text-blue-600 font-mono font-semibold">{permission.key}</code>
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      </section>
                    );
                  })}
                </div>
              )}
            </section>
          )}
        </div>
      )}

      {/* Staff Tab */}
      {activeTab === "staff" && (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Tài khoản nhân sự nội bộ</h3>
              <p className="mt-1 text-xs text-slate-500">Mỗi tài khoản nhận quyền thực thi chính xác theo ma trận CRUD của vai trò được phân công.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="relative w-full sm:w-56">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Tìm tên, username, email, SĐT..."
                  value={staffSearch}
                  onChange={(e) => setStaffSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <select
                value={staffRoleFilter}
                onChange={(e) => setStaffRoleFilter(e.target.value)}
                className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-700"
              >
                <option value="all">Tất cả vai trò</option>
                {internalRoles.map((r) => (
                  <option key={r.id} value={r.code}>
                    {r.name}
                  </option>
                ))}
              </select>

              <select
                value={staffStatusFilter}
                onChange={(e) => setStaffStatusFilter(e.target.value as "all" | "active" | "inactive")}
                className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-700"
              >
                <option value="all">Mọi trạng thái</option>
                <option value="active">Đang hoạt động</option>
                <option value="inactive">Tạm khóa</option>
              </select>

              <PermissionGate permission="roles.create" currentRole={currentRole}>
                <button type="button" onClick={() => setShowStaffModal(true)} className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-blue-700 shadow-sm transition-all">
                  <UserPlus size={14} /> Thêm nhân viên
                </button>
              </PermissionGate>
            </div>
          </div>
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-[11px] uppercase text-slate-500 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="p-3.5">Nhân viên</th>
                    <th className="p-3.5">Tên đăng nhập</th>
                    <th className="p-3.5">Email / SĐT</th>
                    <th className="p-3.5">Vai trò đảm nhận</th>
                    <th className="p-3.5">Trạng thái</th>
                    <th className="p-3.5">Đăng nhập gần nhất</th>
                    <th className="p-3.5 text-center">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {displayedStaff.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-slate-400">
                        Không tìm thấy tài khoản nhân sự nội bộ nào phù hợp.
                      </td>
                    </tr>
                  ) : (
                    displayedStaff.map((staff) => (
                    <tr key={staff.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="p-3.5 font-semibold text-slate-800 flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-xs">
                          {staff.name.charAt(0)}
                        </div>
                        <div>
                          <div>{staff.name}</div>
                          <div className="text-[10px] text-slate-400 font-mono">ID: {staff.id}</div>
                        </div>
                      </td>
                      <td className="p-3.5 font-mono text-slate-700 font-semibold">
                        {staff.username || staff.email.split("@")[0]}
                      </td>
                      <td className="p-3.5 text-slate-600">
                        <div className="font-mono text-[11px]">{staff.email}</div>
                        {staff.phone && <div className="text-[10px] text-slate-400">{staff.phone}</div>}
                      </td>
                      <td className="p-3.5">
                        <span className="font-semibold text-xs bg-slate-100 text-slate-800 border border-slate-200 px-2 py-0.5 rounded inline-flex items-center gap-1">
                          <ShieldCheck size={12} className="text-blue-600" />
                          {staff.roleName}
                        </span>
                      </td>
                      <td className="p-3.5">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          staff.status === "active"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-rose-50 text-rose-700 border-rose-200"
                        }`}>
                          {staff.status === "active" ? "Đang hoạt động" : "Tạm khóa"}
                        </span>
                      </td>
                      <td className="p-3.5 text-slate-500 text-[11px]">{staff.lastLogin || "Chưa có"}</td>
                      <td className="p-3.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <PermissionGate permission="roles.manage" currentRole={currentRole}>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedStaffForRole(staff);
                                setNewRoleCodeForStaff(staff.roleCode);
                                setShowChangeRoleModal(true);
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-md border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 transition-all"
                              title="Phân công lại vai trò cho nhân sự"
                            >
                              <Key size={12} /> Đổi vai trò
                            </button>
                          </PermissionGate>
                          <PermissionGate permission="users.disable" currentRole={currentRole}>
                            <button
                              type="button"
                              onClick={() => {
                                const nextStatus = staff.status === "active" ? "inactive" : "active";
                                const actionText = nextStatus === "active" ? "mở khóa" : "tạm khóa";
                                if (confirm(`Bạn có chắc chắn muốn ${actionText} tài khoản của ${staff.name}?`)) {
                                  onUpdateStaffStatus?.(staff.id, nextStatus);
                                  showToast(`Đã ${actionText} tài khoản nhân sự ${staff.name} và ghi vào Nhật ký Phân quyền.`);
                                }
                              }}
                              className={`inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-md border transition-all ${
                                staff.status === "active"
                                  ? "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"
                                  : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                              }`}
                              title={staff.status === "active" ? "Khóa tài khoản" : "Mở khóa tài khoản"}
                            >
                              {staff.status === "active" ? <Lock size={12} /> : <ShieldCheck size={12} />}
                              {staff.status === "active" ? "Khóa" : "Mở"}
                            </button>
                          </PermissionGate>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
                </tbody>
              </table>
            </div>
            <AdminPagination pagination={staffPagination} itemLabel="nhân viên" />
          </div>
        </section>
      )}

      {/* ══════════════════════════════════════════════════════════ */}
      {/* TAB 2: DANH MỤC QUYỀN HẠN (UC-RBAC-05 ĐẾN UC-RBAC-08)       */}
      {/* ══════════════════════════════════════════════════════════ */}
      {activeTab === "catalog" && (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Key size={16} className="text-blue-600" />
                Quản lý Danh mục Quyền hạn Hệ thống (UC-RBAC-05 đến UC-RBAC-08)
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                Khai báo, tra cứu, chỉnh sửa và ngừng hoạt động các mã quyền hạn. Mọi thao tác đều được hệ thống tự động ghi nhật ký kiểm toán.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="relative w-full sm:w-64">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Tìm mã quyền, tên quyền, phân hệ..."
                  value={permSearch}
                  onChange={(e) => setPermSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <select
                value={permModuleFilter}
                onChange={(e) => setPermModuleFilter(e.target.value)}
                className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-700"
              >
                <option value="all">Tất cả phân hệ ({allPermissionsList.length})</option>
                {Array.from(new Set(allPermissionsList.map((p) => p.module))).sort().map((mod) => (
                  <option key={mod} value={mod}>
                    Phân hệ: {mod} ({allPermissionsList.filter((p) => p.module === mod).length})
                  </option>
                ))}
              </select>

              <PermissionGate permission="roles.manage" currentRole={currentRole}>
                <button
                  type="button"
                  onClick={() => setShowCreatePermModal(true)}
                  className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 shadow-sm transition-all"
                >
                  <Plus size={14} /> Khai báo quyền mới
                </button>
              </PermissionGate>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-[11px] uppercase text-slate-500 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="p-3.5 w-56">Mã quyền hạn</th>
                    <th className="p-3.5 w-60">Tên quyền</th>
                    <th className="p-3.5 w-40">Phân hệ (Module)</th>
                    <th className="p-3.5">Mô tả chức năng</th>
                    <th className="p-3.5 w-36 text-center">Vai trò áp dụng</th>
                    <th className="p-3.5 w-28 text-center">Trạng thái</th>
                    <th className="p-3.5 w-28 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {displayedPermissions.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-10 text-slate-400">
                        Chưa tìm thấy quyền hạn nào phù hợp điều kiện lọc.
                      </td>
                    </tr>
                  ) : (
                    displayedPermissions.map((perm) => {
                      const rolesUsingCount = roles.filter((r) =>
                        r.permissions.includes(perm.code as PermissionKey)
                      ).length;
                      return (
                        <tr key={String(perm.id)} className="hover:bg-slate-50/70 transition-colors">
                          <td className="p-3.5 font-mono font-bold text-slate-900">
                            <span className="bg-slate-100 text-slate-800 px-2 py-0.5 rounded border border-slate-200 inline-block">
                              {perm.code}
                            </span>
                          </td>
                          <td className="p-3.5 font-semibold text-slate-900">
                            {perm.name}
                          </td>
                          <td className="p-3.5">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-medium bg-blue-50 text-blue-700 border border-blue-200/60">
                              {perm.module}
                            </span>
                          </td>
                          <td className="p-3.5 text-slate-500 leading-relaxed">
                            {perm.description || "—"}
                          </td>
                          <td className="p-3.5 text-center">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-bold ${
                                rolesUsingCount > 0
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  : "bg-slate-100 text-slate-500"
                              }`}
                              title={`Có ${rolesUsingCount} vai trò đang được cấp quyền này`}
                            >
                              {rolesUsingCount} vai trò
                            </span>
                          </td>
                          <td className="p-3.5 text-center">
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                              Hoạt động
                            </span>
                          </td>
                          <td className="p-3.5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleOpenEditPerm(perm)}
                                className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title="Sửa tên và mô tả quyền (UC-RBAC-07)"
                              >
                                <Edit3 size={14} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeletePerm(perm)}
                                className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                title="Xóa mã quyền (UC-RBAC-08)"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            <AdminPagination pagination={permPagination} itemLabel="quyền hạn" />
          </div>
        </section>
      )}

      {/* ══════════════════════════════════════════════════════════ */}
      {/* TAB 3: NHẬT KÝ PHÂN QUYỀN (RBAC AUDIT LOGS)               */}
      {/* ══════════════════════════════════════════════════════════ */}
      {activeTab === "logs" && (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Shield size={16} className="text-blue-600" />
                Nhật ký Kiểm toán Phân quyền & Nhân sự (RBAC Audit Trail)
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                Mọi thao tác cấp/thu hồi quyền, khởi tạo/sửa/xóa vai trò, thêm nhân sự và khóa/mở tài khoản đều được ghi vết tự động.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="relative w-full sm:w-64">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Tìm vai trò, nhân sự, mã quyền..."
                  value={rbacLogSearch}
                  onChange={(e) => setRbacLogSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <select
                value={rbacLogActionFilter}
                onChange={(e) => setRbacLogActionFilter(e.target.value)}
                className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-700"
              >
                <option value="all">Tất cả thao tác Phân quyền ({rbacLogs.length})</option>
                <option value="PERMISSION_GRANTED">Cập nhật ma trận quyền (PERMISSION_GRANTED)</option>
                <option value="ROLE_PERMISSIONS_UPDATE">Đồng bộ quyền API (ROLE_PERMISSIONS_UPDATE)</option>
                <option value="ROLE_CREATED">Tạo vai trò mới (ROLE_CREATED)</option>
                <option value="ROLE_UPDATED">Cập nhật vai trò (ROLE_UPDATED)</option>
                <option value="ROLE_DELETED">Xóa vai trò (ROLE_DELETED)</option>
                <option value="STAFF_INVITED">Thêm nhân sự mới (STAFF_INVITED)</option>
                <option value="ASSIGN_ROLES">Đổi vai trò nhân sự (ASSIGN_ROLES)</option>
                <option value="USER_STATUS_UPDATE">Khóa / Mở khóa tài khoản (USER_STATUS_UPDATE)</option>
              </select>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-[11px] uppercase text-slate-500 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="p-3.5 w-40">Thời gian</th>
                    <th className="p-3.5 w-48">Người thực hiện</th>
                    <th className="p-3.5 w-44">Loại hành động</th>
                    <th className="p-3.5 w-52">Đối tượng tác động</th>
                    <th className="p-3.5">Chi tiết thay đổi & Quyền hạn</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {displayedRbacLogs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-10 text-slate-400">
                        Chưa có bản ghi nhật ký phân quyền nào khớp bộ lọc.
                      </td>
                    </tr>
                  ) : (
                    displayedRbacLogs.map((logItem) => {
                      const addedPerms: string[] = Array.isArray(logItem.metadata?.addedPermissions)
                        ? logItem.metadata.addedPermissions
                        : [];
                      const removedPerms: string[] = Array.isArray(logItem.metadata?.removedPermissions)
                        ? logItem.metadata.removedPermissions
                        : [];
                      return (
                        <tr key={logItem.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="p-3.5 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                            <div>{logItem.timestamp}</div>
                            <div className="text-[10px] text-slate-400">IP: {logItem.ipAddress || "127.0.0.1"}</div>
                          </td>
                          <td className="p-3.5">
                            <div className="font-semibold text-slate-800">{logItem.actor.name}</div>
                            <div className="text-[10px] text-slate-500">{logItem.actor.role}</div>
                          </td>
                          <td className="p-3.5">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-bold border ${
                                logItem.severity === "danger"
                                  ? "bg-rose-50 text-rose-700 border-rose-200"
                                  : logItem.severity === "warning"
                                  ? "bg-amber-50 text-amber-800 border-amber-200"
                                  : "bg-emerald-50 text-emerald-700 border-emerald-200"
                              }`}
                            >
                              <Key size={11} />
                              {logItem.action}
                            </span>
                          </td>
                          <td className="p-3.5 font-semibold text-slate-800">{logItem.target}</td>
                          <td className="p-3.5 text-slate-600">
                            <div>{logItem.description}</div>
                            {(addedPerms.length > 0 || removedPerms.length > 0) && (
                              <div className="mt-1.5 flex flex-wrap gap-1">
                                {addedPerms.slice(0, 6).map((p) => (
                                  <span
                                    key={`add-${p}`}
                                    className="px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  >
                                    +{p}
                                  </span>
                                ))}
                                {addedPerms.length > 6 && (
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-emerald-50 text-emerald-700">
                                    +{addedPerms.length - 6} quyền khác
                                  </span>
                                )}
                                {removedPerms.slice(0, 6).map((p) => (
                                  <span
                                    key={`rem-${p}`}
                                    className="px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-rose-50 text-rose-700 border border-rose-200"
                                  >
                                    -{p}
                                  </span>
                                ))}
                                {removedPerms.length > 6 && (
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-rose-50 text-rose-700">
                                    -{removedPerms.length - 6} quyền khác
                                  </span>
                                )}
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            <AdminPagination pagination={rbacLogsPagination} itemLabel="nhật ký phân quyền" />
          </div>
        </section>
      )}

      {/* Modal Tạo Nhân sự nội bộ */}
      {showStaffModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <form onSubmit={handleCreateStaff} className="w-full max-w-md space-y-3.5 rounded-xl bg-white p-5 shadow-xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <UserPlus size={16} className="text-blue-600" />
              Thêm tài khoản nhân sự nội bộ
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Tên đăng nhập *</label>
                <input required value={staffUsername} onChange={(e) => setStaffUsername(e.target.value)} placeholder="an.nguyen" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500 font-mono" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Mật khẩu ban đầu</label>
                <input type="password" value={staffPassword} onChange={(e) => setStaffPassword(e.target.value)} placeholder="Nhaxinh@2026 (mặc định)" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Họ và tên *</label>
              <input required value={staffName} onChange={(e) => setStaffName(e.target.value)} placeholder="Nguyễn Văn An" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Email nội bộ *</label>
                <input required type="email" value={staffEmail} onChange={(e) => setStaffEmail(e.target.value)} placeholder="an.nguyen@nhaxinh.com" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Số điện thoại</label>
                <input value={staffPhone} onChange={(e) => setStaffPhone(e.target.value)} placeholder="0901234567" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Phân bổ Vai trò (Role) *</label>
              <select value={staffRoleCode} onChange={(e) => setStaffRoleCode(e.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500">
                {internalRoles.map((role) => (
                  <option key={role.id} value={role.code}>
                    {role.name} ({role.code}) - {role.permissions.length} quyền
                  </option>
                ))}
              </select>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button type="button" onClick={() => setShowStaffModal(false)} className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium hover:bg-slate-50">Hủy</button>
              <button type="submit" className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700 shadow-xs">Tạo tài khoản</button>
            </div>
          </form>
        </div>
      )}

      {/* Modal Đổi vai trò cho nhân sự */}
      {showChangeRoleModal && selectedStaffForRole && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <form onSubmit={handleChangeStaffRoleSubmit} className="w-full max-w-sm space-y-3.5 rounded-xl bg-white p-5 shadow-xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Key size={16} className="text-blue-600" />
              Đổi vai trò nhân sự
            </h3>
            <p className="text-xs text-slate-500">
              Phân công lại quyền hạn cho nhân sự <strong className="text-slate-800">{selectedStaffForRole.name}</strong> ({selectedStaffForRole.email})
            </p>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Chọn vai trò mới *</label>
              <select
                value={newRoleCodeForStaff}
                onChange={(e) => setNewRoleCodeForStaff(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500"
              >
                {internalRoles.map((role) => (
                  <option key={role.id} value={role.code}>
                    {role.name} ({role.code}) - {role.permissions.length} quyền
                  </option>
                ))}
              </select>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setShowChangeRoleModal(false);
                  setSelectedStaffForRole(null);
                }}
                className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium hover:bg-slate-50"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700 shadow-xs"
              >
                Cập nhật vai trò
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal Sửa thông tin vai trò */}
      {showEditRoleModal && selectedRole && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <form onSubmit={handleUpdateRoleSubmit} className="w-full max-w-md space-y-3.5 rounded-xl bg-white p-5 shadow-xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Edit3 size={16} className="text-blue-600" />
              Sửa thông tin vai trò [{selectedRole.code}]
            </h3>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Tên vai trò *</label>
              <input
                required
                value={editRoleName}
                onChange={(e) => setEditRoleName(e.target.value)}
                placeholder="VD: Quản lý Bán hàng"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Mô tả trách nhiệm</label>
              <textarea
                rows={3}
                value={editRoleDescription}
                onChange={(e) => setEditRoleDescription(e.target.value)}
                placeholder="Mô tả phạm vi quyền hạn và trách nhiệm..."
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowEditRoleModal(false)}
                className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium hover:bg-slate-50"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700 shadow-xs"
              >
                Lưu thay đổi
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal Khai báo Quyền hạn mới (UC-RBAC-06) */}
      {showCreatePermModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <form
            onSubmit={handleCreatePermSubmit}
            className="w-full max-w-md space-y-3.5 rounded-xl bg-white p-5 shadow-xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150"
          >
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Key size={16} className="text-blue-600" />
              Khai báo mã quyền hạn mới (UC-RBAC-06)
            </h3>
            <p className="text-xs text-slate-500">
              Định nghĩa một quyền bảo mật mới có thể gán cho các vai trò trong hệ thống.
            </p>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Mã quyền hạn (Permission Code) *
              </label>
              <input
                required
                value={newPermCode}
                onChange={(e) => setNewPermCode(e.target.value)}
                placeholder="VD: products.export, orders.approve..."
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500 font-mono"
              />
              <span className="text-[10.5px] text-slate-400 mt-1 block">
                Quy ước: module.action (ví dụ: orders.cancel, catalog:read)
              </span>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Tên quyền hiển thị *</label>
              <input
                required
                value={newPermName}
                onChange={(e) => setNewPermName(e.target.value)}
                placeholder="VD: Phê duyệt đơn hàng giá trị cao"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Phân hệ chức năng (Module) *</label>
              <input
                required
                value={newPermModule}
                onChange={(e) => setNewPermModule(e.target.value)}
                placeholder="VD: products, orders, customers, permissions..."
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Mô tả trách nhiệm & chức năng</label>
              <textarea
                rows={2}
                value={newPermDescription}
                onChange={(e) => setNewPermDescription(e.target.value)}
                placeholder="Mô tả phạm vi quyền hạn khi được cấp cho nhân sự..."
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowCreatePermModal(false)}
                className="rounded-lg border border-slate-300 px-3.5 py-2 text-xs font-medium hover:bg-slate-50 text-slate-700"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 shadow-xs"
              >
                Khai báo quyền
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal Chỉnh sửa Quyền hạn (UC-RBAC-07) */}
      {showEditPermModal && editingPerm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <form
            onSubmit={handleEditPermSubmit}
            className="w-full max-w-md space-y-3.5 rounded-xl bg-white p-5 shadow-xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150"
          >
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Edit3 size={16} className="text-blue-600" />
              Cập nhật thông tin quyền hạn (UC-RBAC-07)
            </h3>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Mã quyền hạn (Bất biến)
              </label>
              <input
                disabled
                value={editingPerm.code}
                className="w-full rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-xs font-mono text-slate-600 cursor-not-allowed"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                Mã quyền bất biến để đảm bảo an toàn bảo mật và đồng bộ cấu hình backend.
              </span>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Tên quyền *</label>
              <input
                required
                value={editPermName}
                onChange={(e) => setEditPermName(e.target.value)}
                placeholder="VD: Xem chi tiết đơn hàng"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Phân hệ (Module) *</label>
              <input
                required
                value={editPermModule}
                onChange={(e) => setEditPermModule(e.target.value)}
                placeholder="VD: orders"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Mô tả trách nhiệm</label>
              <textarea
                rows={2}
                value={editPermDescription}
                onChange={(e) => setEditPermDescription(e.target.value)}
                placeholder="Mô tả mục đích sử dụng..."
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowEditPermModal(false)}
                className="rounded-lg border border-slate-300 px-3.5 py-2 text-xs font-medium hover:bg-slate-50 text-slate-700"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 shadow-xs"
              >
                Lưu thay đổi
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
