import type { FormEvent } from "react";
import { Edit3 } from "lucide-react";
import type { RoleDefinition } from "../../../../services/admin/types";

interface EditRoleModalProps {
  show: boolean;
  role: RoleDefinition | null;
  onClose: () => void;
  onSubmit: (e: FormEvent) => void;
  roleName: string;
  setRoleName: (val: string) => void;
  roleDescription: string;
  setRoleDescription: (val: string) => void;
}

export function EditRoleModal({
  show,
  role,
  onClose,
  onSubmit,
  roleName,
  setRoleName,
  roleDescription,
  setRoleDescription,
}: EditRoleModalProps) {
  if (!show || !role) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-md space-y-3.5 rounded-xl bg-white p-5 shadow-xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150"
      >
        <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
          <Edit3 size={16} className="text-blue-600" />
          Sửa thông tin vai trò [{role.code}]
        </h3>
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Tên vai trò *</label>
          <input
            required
            value={roleName}
            onChange={(e) => setRoleName(e.target.value)}
            placeholder="VD: Quản lý Bán hàng"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Mô tả trách nhiệm</label>
          <textarea
            rows={3}
            value={roleDescription}
            onChange={(e) => setRoleDescription(e.target.value)}
            placeholder="Mô tả phạm vi quyền hạn và trách nhiệm..."
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500"
          />
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
            Lưu thay đổi
          </button>
        </div>
      </form>
    </div>
  );
}

