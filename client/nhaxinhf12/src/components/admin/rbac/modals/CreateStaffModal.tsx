import type { FormEvent } from "react";
import { UserPlus } from "lucide-react";
import type { RoleDefinition } from "../../../../services/admin/types";

interface CreateStaffModalProps {
  show: boolean;
  onClose: () => void;
  onSubmit: (e: FormEvent) => void;
  roles: RoleDefinition[];
  staffUsername: string;
  setStaffUsername: (val: string) => void;
  staffPassword: string;
  setStaffPassword: (val: string) => void;
  staffName: string;
  setStaffName: (val: string) => void;
  staffEmail: string;
  setStaffEmail: (val: string) => void;
  staffPhone: string;
  setStaffPhone: (val: string) => void;
  staffRoleCode: string;
  setStaffRoleCode: (val: string) => void;
}

export function CreateStaffModal({
  show,
  onClose,
  onSubmit,
  roles,
  staffUsername,
  setStaffUsername,
  staffPassword,
  setStaffPassword,
  staffName,
  setStaffName,
  staffEmail,
  setStaffEmail,
  staffPhone,
  setStaffPhone,
  staffRoleCode,
  setStaffRoleCode,
}: CreateStaffModalProps) {
  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-md space-y-3.5 rounded-xl bg-white p-5 shadow-xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150"
      >
        <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
          <UserPlus size={16} className="text-blue-600" />
          Thêm tài khoản nhân sự nội bộ
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Tên đăng nhập *</label>
            <input
              required
              value={staffUsername}
              onChange={(e) => setStaffUsername(e.target.value)}
              placeholder="an.nguyen"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500 font-mono"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Mật khẩu ban đầu</label>
            <input
              type="password"
              value={staffPassword}
              onChange={(e) => setStaffPassword(e.target.value)}
              placeholder="Nhaxinh@2026 (mặc định)"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Họ và tên *</label>
          <input
            required
            value={staffName}
            onChange={(e) => setStaffName(e.target.value)}
            placeholder="Nguyễn Văn An"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Email nội bộ *</label>
            <input
              required
              type="email"
              value={staffEmail}
              onChange={(e) => setStaffEmail(e.target.value)}
              placeholder="an.nguyen@nhaxinh.com"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Số điện thoại</label>
            <input
              value={staffPhone}
              onChange={(e) => setStaffPhone(e.target.value)}
              placeholder="0901234567"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Phân bổ Vai trò (Role) *</label>
          <select
            value={staffRoleCode}
            onChange={(e) => setStaffRoleCode(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500"
          >
            {roles.map((role) => (
              <option key={role.id} value={role.code}>
                {role.name} ({role.code}) - {role.permissions.length} quyền
              </option>
            ))}
          </select>
        </div>
        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium hover:bg-slate-50"
          >
            Hủy
          </button>
          <button
            type="submit"
            className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700 shadow-xs"
          >
            Tạo tài khoản
          </button>
        </div>
      </form>
    </div>
  );
}

