import type { FormEvent } from "react";
import { Key } from "lucide-react";
import type { AdminStaff, RoleDefinition } from "../../../../services/admin/types";

interface ChangeStaffRoleModalProps {
  show: boolean;
  staff: AdminStaff | null;
  onClose: () => void;
  onSubmit: (e: FormEvent) => void;
  roles: RoleDefinition[];
  newRoleCode: string;
  setNewRoleCode: (val: string) => void;
}

export function ChangeStaffRoleModal({
  show,
  staff,
  onClose,
  onSubmit,
  roles,
  newRoleCode,
  setNewRoleCode,
}: ChangeStaffRoleModalProps) {
  if (!show || !staff) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm space-y-3.5 rounded-xl bg-white p-5 shadow-xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150"
      >
        <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
          <Key size={16} className="text-blue-600" />
          Đổi vai trò nhân sự
        </h3>
        <p className="text-xs text-slate-500">
          Phân công lại quyền hạn cho nhân sự <strong className="text-slate-800">{staff.name}</strong> ({staff.email})
        </p>
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Chọn vai trò mới *</label>
          <select
            value={newRoleCode}
            onChange={(e) => setNewRoleCode(e.target.value)}
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
            Cập nhật vai trò
          </button>
        </div>
      </form>
    </div>
  );
}

