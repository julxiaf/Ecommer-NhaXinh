import { Search, UserPlus, ShieldCheck, Key, Lock } from "lucide-react";
import type { AdminStaff, RoleDefinition } from "../../../services/admin/types";
import PermissionGate from "../PermissionGate";
import { AdminPagination } from "../AdminPagination";
import type { PaginationState } from "../../../hooks/usePagination";

export interface StaffManagementTabProps {
  staffSearch: string;
  setStaffSearch: (val: string) => void;
  staffRoleFilter: string;
  setStaffRoleFilter: (val: string) => void;
  staffStatusFilter: "all" | "active" | "inactive";
  setStaffStatusFilter: (val: "all" | "active" | "inactive") => void;
  roles: RoleDefinition[];
  currentRole: RoleDefinition;
  onOpenStaffModal: () => void;
  displayedStaff: AdminStaff[];
  onSelectStaffForRole: (staff: AdminStaff) => void;
  onUpdateStaffStatus?: (userId: string, status: "active" | "inactive") => void;
  showToast: (msg: string) => void;
  staffPagination: PaginationState<AdminStaff>;
}

export function StaffManagementTab({
  staffSearch,
  setStaffSearch,
  staffRoleFilter,
  setStaffRoleFilter,
  staffStatusFilter,
  setStaffStatusFilter,
  roles,
  currentRole,
  onOpenStaffModal,
  displayedStaff,
  onSelectStaffForRole,
  onUpdateStaffStatus,
  showToast,
  staffPagination,
}: StaffManagementTabProps) {
  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div>
          <h3 className="text-sm font-bold text-slate-900">Quản lý tài khoản người dùng & nhân sự</h3>
          <p className="mt-1 text-xs text-slate-500">
            Danh sách toàn bộ tài khoản người dùng và nhân sự được đồng bộ trực tiếp từ cơ sở dữ liệu hệ thống.
          </p>
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
            {roles.map((r) => (
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
            <button
              type="button"
              onClick={onOpenStaffModal}
              className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-blue-700 shadow-sm transition-all"
            >
              <UserPlus size={14} /> Thêm tài khoản
            </button>
          </PermissionGate>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-[11px] uppercase text-slate-500 font-semibold border-b border-slate-200">
              <tr>
                <th className="p-3.5">Tài khoản</th>
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
                    Không tìm thấy tài khoản người dùng hoặc nhân sự nào phù hợp.
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
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          staff.status === "active"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-rose-50 text-rose-700 border-rose-200"
                        }`}
                      >
                        {staff.status === "active" ? "Đang hoạt động" : "Tạm khóa"}
                      </span>
                    </td>
                    <td className="p-3.5 text-slate-500 text-[11px]">{staff.lastLogin || "Chưa có"}</td>
                    <td className="p-3.5 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <PermissionGate permission="roles.manage" currentRole={currentRole}>
                          <button
                            type="button"
                            onClick={() => onSelectStaffForRole(staff)}
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
  );
}
