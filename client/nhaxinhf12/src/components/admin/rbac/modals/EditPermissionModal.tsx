import type { FormEvent } from "react";
import { Edit3 } from "lucide-react";
import type { AdminPermissionItem } from "../../../../services/admin/types";

interface EditPermissionModalProps {
  show: boolean;
  permission: AdminPermissionItem | null;
  onClose: () => void;
  onSubmit: (e: FormEvent) => void;
  name: string;
  setName: (val: string) => void;
  module: string;
  setModule: (val: string) => void;
  description: string;
  setDescription: (val: string) => void;
}

export function EditPermissionModal({
  show,
  permission,
  onClose,
  onSubmit,
  name,
  setName,
  module,
  setModule,
  description,
  setDescription,
}: EditPermissionModalProps) {
  if (!show || !permission) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
      <form
        onSubmit={onSubmit}
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
            value={permission.code}
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
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="VD: Xem chi tiết đơn hàng"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Phân hệ (Module) *</label>
          <input
            required
            value={module}
            onChange={(e) => setModule(e.target.value)}
            placeholder="VD: orders"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Mô tả trách nhiệm</label>
          <textarea
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Mô tả mục đích sử dụng..."
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
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
  );
}

