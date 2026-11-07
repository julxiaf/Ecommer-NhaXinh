import { ShieldCheck, Layers, Key, Users, Shield, CheckCircle2 } from "lucide-react";
import type {
  AdminAuditLog,
  AdminStaff,
  PermissionKey,
  RoleDefinition,
  AdminPermissionItem,
} from "../../../services/admin/types";
import { useAdminRoles } from "../../../hooks/admin/useAdminRoles";
import {
  RoleMatrixTab,
  StaffManagementTab,
  PermissionCatalogTab,
  RbacAuditLogsTab,
  CreateStaffModal,
  ChangeStaffRoleModal,
  EditRoleModal,
  CreatePermissionModal,
  EditPermissionModal,
} from "../../../components/admin/rbac";

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

/**
 * RolePermissionView - Giao diện Quản trị Vai trò & Phân quyền RBAC (Đã được refactor module hóa)
 */
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
      {/* Toast Notification Banner */}
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

      {/* Top Header & Tab Navigation */}
      <section className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-bold text-slate-900">
            <ShieldCheck className="text-blue-600" size={24} />
            Quản trị Vai trò & Ma trận Phân quyền CRUD
          </h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("permissions")}
            className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold transition-all ${
              activeTab === "permissions"
                ? "bg-blue-600 text-white shadow-sm"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            <Layers size={14} /> Vai trò & Ma trận ({roles.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("catalog")}
            className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold transition-all ${
              activeTab === "catalog"
                ? "bg-blue-600 text-white shadow-sm"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            <Key size={14} /> Danh mục Quyền hạn ({allPermissionsList.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("staff")}
            className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold transition-all ${
              activeTab === "staff"
                ? "bg-blue-600 text-white shadow-sm"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            <Users size={14} /> Quản lý tài khoản ({staffList.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("logs")}
            className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold transition-all ${
              activeTab === "logs"
                ? "bg-blue-600 text-white shadow-sm"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            <Shield size={14} /> Nhật ký Phân quyền ({rbacLogs.length})
          </button>
        </div>
      </section>

      {/* Tab 1: Vai trò & Ma trận CRUD */}
      {activeTab === "permissions" && (
        <RoleMatrixTab
          roles={roles}
          selectedRole={selectedRole}
          setSelectedRoleId={setSelectedRoleId}
          viewMode={viewMode}
          setViewMode={setViewMode}
          currentRole={currentRole}
          canEditPermissions={canEditPermissions}
          isSuperAdmin={isSuperAdmin}
          showRoleForm={showRoleForm}
          setShowRoleForm={setShowRoleForm}
          roleName={roleName}
          setRoleName={setRoleName}
          roleCode={roleCode}
          setRoleCode={setRoleCode}
          roleDescription={roleDescription}
          setRoleDescription={setRoleDescription}
          handleCreateRole={handleCreateRole}
          handleGrantAll={handleGrantAll}
          handleGrantReadOnlyAll={handleGrantReadOnlyAll}
          handleRevokeAll={handleRevokeAll}
          onDeleteRole={onDeleteRole}
          showToast={showToast}
          setEditRoleName={setEditRoleName}
          setEditRoleDescription={setEditRoleDescription}
          setShowEditRoleModal={setShowEditRoleModal}
          moduleSearch={moduleSearch}
          setModuleSearch={setModuleSearch}
          moduleCategoryFilter={moduleCategoryFilter}
          setModuleCategoryFilter={setModuleCategoryFilter}
          modulePagination={modulePagination}
          displayedModules={displayedModules}
          permissionGroups={permissionGroups}
          togglePermission={togglePermission}
          handleToggleModuleAll={handleToggleModuleAll}
        />
      )}

      {/* Tab 2: Quản lý Tài khoản & Nhân sự */}
      {activeTab === "staff" && (
        <StaffManagementTab
          staffSearch={staffSearch}
          setStaffSearch={setStaffSearch}
          staffRoleFilter={staffRoleFilter}
          setStaffRoleFilter={setStaffRoleFilter}
          staffStatusFilter={staffStatusFilter}
          setStaffStatusFilter={setStaffStatusFilter}
          roles={roles}
          currentRole={currentRole}
          onOpenStaffModal={() => setShowStaffModal(true)}
          displayedStaff={displayedStaff}
          onSelectStaffForRole={(staff) => {
            setSelectedStaffForRole(staff);
            setNewRoleCodeForStaff(staff.roleCode);
            setShowChangeRoleModal(true);
          }}
          onUpdateStaffStatus={onUpdateStaffStatus}
          showToast={showToast}
          staffPagination={staffPagination}
        />
      )}

      {/* Tab 3: Danh mục Quyền hạn Hệ thống */}
      {activeTab === "catalog" && (
        <PermissionCatalogTab
          allPermissionsList={allPermissionsList}
          permSearch={permSearch}
          setPermSearch={setPermSearch}
          permModuleFilter={permModuleFilter}
          setPermModuleFilter={setPermModuleFilter}
          currentRole={currentRole}
          onOpenCreatePermModal={() => setShowCreatePermModal(true)}
          displayedPermissions={displayedPermissions}
          roles={roles}
          handleOpenEditPerm={handleOpenEditPerm}
          handleDeletePerm={handleDeletePerm}
          permPagination={permPagination}
        />
      )}

      {/* Tab 4: Nhật ký Kiểm toán Phân quyền */}
      {activeTab === "logs" && (
        <RbacAuditLogsTab
          rbacLogSearch={rbacLogSearch}
          setRbacLogSearch={setRbacLogSearch}
          rbacLogActionFilter={rbacLogActionFilter}
          setRbacLogActionFilter={setRbacLogActionFilter}
          rbacLogsCount={rbacLogs.length}
          displayedRbacLogs={displayedRbacLogs}
          rbacLogsPagination={rbacLogsPagination}
        />
      )}

      {/* Modal 1: Tạo nhân sự nội bộ */}
      <CreateStaffModal
        show={showStaffModal}
        onClose={() => setShowStaffModal(false)}
        onSubmit={handleCreateStaff}
        roles={roles}
        staffUsername={staffUsername}
        setStaffUsername={setStaffUsername}
        staffPassword={staffPassword}
        setStaffPassword={setStaffPassword}
        staffName={staffName}
        setStaffName={setStaffName}
        staffEmail={staffEmail}
        setStaffEmail={setStaffEmail}
        staffPhone={staffPhone}
        setStaffPhone={setStaffPhone}
        staffRoleCode={staffRoleCode}
        setStaffRoleCode={setStaffRoleCode}
      />

      {/* Modal 2: Đổi vai trò nhân sự */}
      <ChangeStaffRoleModal
        show={showChangeRoleModal && Boolean(selectedStaffForRole)}
        staff={selectedStaffForRole}
        onClose={() => {
          setShowChangeRoleModal(false);
          setSelectedStaffForRole(null);
        }}
        onSubmit={handleChangeStaffRoleSubmit}
        roles={roles}
        newRoleCode={newRoleCodeForStaff}
        setNewRoleCode={setNewRoleCodeForStaff}
      />

      {/* Modal 3: Sửa thông tin vai trò */}
      <EditRoleModal
        show={showEditRoleModal && Boolean(selectedRole)}
        role={selectedRole}
        onClose={() => setShowEditRoleModal(false)}
        onSubmit={handleUpdateRoleSubmit}
        roleName={editRoleName}
        setRoleName={setEditRoleName}
        roleDescription={editRoleDescription}
        setRoleDescription={setEditRoleDescription}
      />

      {/* Modal 4: Khai báo mã quyền hạn mới */}
      <CreatePermissionModal
        show={showCreatePermModal}
        onClose={() => setShowCreatePermModal(false)}
        onSubmit={handleCreatePermSubmit}
        code={newPermCode}
        setCode={setNewPermCode}
        name={newPermName}
        setName={setNewPermName}
        module={newPermModule}
        setModule={setNewPermModule}
        description={newPermDescription}
        setDescription={setNewPermDescription}
      />

      {/* Modal 5: Cập nhật thông tin quyền hạn */}
      <EditPermissionModal
        show={showEditPermModal && Boolean(editingPerm)}
        permission={editingPerm}
        onClose={() => setShowEditPermModal(false)}
        onSubmit={handleEditPermSubmit}
        name={editPermName}
        setName={setEditPermName}
        module={editPermModule}
        setModule={setEditPermModule}
        description={editPermDescription}
        setDescription={setEditPermDescription}
      />
    </div>
  );
}
