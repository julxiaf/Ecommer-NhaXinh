import { Key, Plus, Edit3, Trash2, Search } from "lucide-react";
import type { AdminPermissionItem, PermissionKey, RoleDefinition } from "../../../services/admin/types";
import PermissionGate from "../PermissionGate";
import { AdminPagination } from "../AdminPagination";
import type { PaginationState } from "../../../hooks/usePagination";

export interface PermissionCatalogTabProps {
  allPermissionsList: AdminPermissionItem[];
  permSearch: string;
  setPermSearch: (val: string) => void;
  permModuleFilter: string;
  setPermModuleFilter: (val: string) => void;
  currentRole: RoleDefinition;
  onOpenCreatePermModal: () => void;
  displayedPermissions: AdminPermissionItem[];
  roles: RoleDefinition[];
  handleOpenEditPerm: (perm: AdminPermissionItem) => void;
  handleDeletePerm: (perm: AdminPermissionItem) => void;
  permPagination: PaginationState<AdminPermissionItem>;
}

export function PermissionCatalogTab({
  allPermissionsList,
  permSearch,
  setPermSearch,
  permModuleFilter,
  setPermModuleFilter,
  currentRole,
  onOpenCreatePermModal,
  displayedPermissions,
  roles,
  handleOpenEditPerm,
  handleDeletePerm,
  permPagination,
}: PermissionCatalogTabProps) {
  const uniqueModules = Array.from(new Set(allPermissionsList.map((p) => p.module))).sort();

  return (
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
            {uniqueModules.map((mod) => (
              <option key={mod} value={mod}>
                Phân hệ: {mod} ({allPermissionsList.filter((p) => p.module === mod).length})
              </option>
            ))}
          </select>

          <PermissionGate permission="roles.manage" currentRole={currentRole}>
            <button
              type="button"
              onClick={onOpenCreatePermModal}
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
  );
}
