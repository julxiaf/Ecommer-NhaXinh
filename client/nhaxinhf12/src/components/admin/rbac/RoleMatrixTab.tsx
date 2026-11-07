import React, { Fragment, type FormEvent } from "react";
import {
  Key, Plus, ShieldCheck, Trash2, Eye, PlusCircle,
  Edit3, Trash, Sparkles, RefreshCw, Check, CheckCircle2,
  Table, List, Layers, Lock, Shield, Globe, Search
} from "lucide-react";
import type { RoleDefinition, PermissionKey } from "../../../services/admin/types";
import { ALL_PERMISSIONS, type SystemPermissionItem } from "../../../services/admin/adminService";
import PermissionGate from "../PermissionGate";
import { AdminPagination } from "../AdminPagination";
import { CRUD_MODULE_CONFIGS, type CrudModuleConfig } from "../../../hooks/admin/useAdminRoles";
import type { PaginationState } from "../../../hooks/usePagination";
import { MODULE_TITLES } from "./constants";

export interface RoleMatrixTabProps {
  roles: RoleDefinition[];
  selectedRole: RoleDefinition | null;
  setSelectedRoleId: (id: string) => void;
  viewMode: "matrix" | "list";
  setViewMode: (mode: "matrix" | "list") => void;
  currentRole: RoleDefinition;
  canEditPermissions: boolean;
  isSuperAdmin: boolean;
  showRoleForm: boolean;
  setShowRoleForm: React.Dispatch<React.SetStateAction<boolean>>;
  roleName: string;
  setRoleName: (val: string) => void;
  roleCode: string;
  setRoleCode: (val: string) => void;
  roleDescription: string;
  setRoleDescription: (val: string) => void;
  handleCreateRole: (e: FormEvent) => void;
  handleGrantAll: () => void;
  handleGrantReadOnlyAll: () => void;
  handleRevokeAll: () => void;
  onDeleteRole: (roleId: string) => void;
  showToast: (msg: string) => void;
  setEditRoleName: (val: string) => void;
  setEditRoleDescription: (val: string) => void;
  setShowEditRoleModal: (val: boolean) => void;
  moduleSearch: string;
  setModuleSearch: (val: string) => void;
  moduleCategoryFilter: "all" | "admin" | "api";
  setModuleCategoryFilter: (val: "all" | "admin" | "api") => void;
  modulePagination: PaginationState<CrudModuleConfig>;
  displayedModules: CrudModuleConfig[];
  permissionGroups: Record<string, SystemPermissionItem[]>;
  togglePermission: (key: PermissionKey) => void;
  handleToggleModuleAll: (mod: CrudModuleConfig) => void;
}

export function RoleMatrixTab({
  roles,
  selectedRole,
  setSelectedRoleId,
  viewMode,
  setViewMode,
  currentRole,
  canEditPermissions,
  isSuperAdmin,
  showRoleForm,
  setShowRoleForm,
  roleName,
  setRoleName,
  roleCode,
  setRoleCode,
  roleDescription,
  setRoleDescription,
  handleCreateRole,
  handleGrantAll,
  handleGrantReadOnlyAll,
  handleRevokeAll,
  onDeleteRole,
  showToast,
  setEditRoleName,
  setEditRoleDescription,
  setShowEditRoleModal,
  moduleSearch,
  setModuleSearch,
  moduleCategoryFilter,
  setModuleCategoryFilter,
  modulePagination,
  displayedModules,
  permissionGroups,
  togglePermission,
  handleToggleModuleAll,
}: RoleMatrixTabProps) {
  return (
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
        <form
          onSubmit={handleCreateRole}
          className="grid gap-3 rounded-xl border border-blue-200 bg-blue-50/50 p-4 sm:grid-cols-3 animate-in fade-in duration-150"
        >
          <input
            required
            value={roleName}
            onChange={(event) => setRoleName(event.target.value)}
            placeholder="Tên vai trò (VD: Quản lý Bán hàng)"
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500"
          />
          <input
            required
            value={roleCode}
            onChange={(event) => setRoleCode(event.target.value)}
            placeholder="Mã vai trò (VD: SALES_MANAGER)"
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs uppercase font-mono focus:ring-2 focus:ring-blue-500"
          />
          <input
            value={roleDescription}
            onChange={(event) => setRoleDescription(event.target.value)}
            placeholder="Mô tả trách nhiệm vai trò"
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500"
          />
          <div className="flex justify-end gap-2 sm:col-span-3">
            <button
              type="button"
              onClick={() => setShowRoleForm(false)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium hover:bg-slate-50"
            >
              Đóng
            </button>
            <button
              type="submit"
              className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700 shadow-xs"
            >
              Lưu vai trò mới
            </button>
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
                <code className="rounded bg-slate-100 px-2 py-0.5 text-xs font-mono font-bold text-slate-700 border border-slate-200">
                  {selectedRole.code}
                </code>
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

          {/* MODE 1: ENTERPRISE CRUD MATRIX TABLE */}
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
                        <Fragment key={mod.id}>
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
                        </Fragment>
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

          {/* MODE 2: GROUPED LIST VIEW */}
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
  );
}
