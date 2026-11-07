import { Shield, Key, Search } from "lucide-react";
import type { AdminAuditLog } from "../../../services/admin/types";
import { AdminPagination } from "../AdminPagination";
import type { PaginationState } from "../../../hooks/usePagination";

export interface RbacAuditLogsTabProps {
  rbacLogSearch: string;
  setRbacLogSearch: (val: string) => void;
  rbacLogActionFilter: string;
  setRbacLogActionFilter: (val: string) => void;
  rbacLogsCount: number;
  displayedRbacLogs: AdminAuditLog[];
  rbacLogsPagination: PaginationState<AdminAuditLog>;
}

export function RbacAuditLogsTab({
  rbacLogSearch,
  setRbacLogSearch,
  rbacLogActionFilter,
  setRbacLogActionFilter,
  rbacLogsCount,
  displayedRbacLogs,
  rbacLogsPagination,
}: RbacAuditLogsTabProps) {
  return (
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
            <option value="all">Tất cả thao tác Phân quyền ({rbacLogsCount})</option>
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
                    ? (logItem.metadata.addedPermissions as string[])
                    : [];
                  const removedPerms: string[] = Array.isArray(logItem.metadata?.removedPermissions)
                    ? (logItem.metadata.removedPermissions as string[])
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
  );
}
