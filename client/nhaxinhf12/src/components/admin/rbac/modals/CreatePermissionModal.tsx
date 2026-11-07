import type { FormEvent } from "react";
import { Key } from "lucide-react";

interface CreatePermissionModalProps {
  show: boolean;
  onClose: () => void;
  onSubmit: (e: FormEvent) => void;
  code: string;
  setCode: (val: string) => void;
  name: string;
  setName: (val: string) => void;
  module: string;
  setModule: (val: string) => void;
  description: string;
  setDescription: (val: string) => void;
}

export function CreatePermissionModal({
  show,
  onClose,
  onSubmit,
  code,
  setCode,
  name,
  setName,
  module,
  setModule,
  description,
  setDescription,
}: CreatePermissionModalProps) {
  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
      <form
        onSubmit={onSubmit}
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
            value={code}
            onChange={(e) => setCode(e.target.value)}
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
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="VD: Phê duyệt đơn hàng giá trị cao"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Phân hệ chức năng (Module) *</label>
          <input
            required
            value={module}
            onChange={(e) => setModule(e.target.value)}
            placeholder="VD: products, orders, customers, permissions..."
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Mô tả trách nhiệm & chức năng</label>
          <textarea
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Mô tả phạm vi quyền hạn khi được cấp cho nhân sự..."
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
            Khai báo quyền
          </button>
        </div>
      </form>
    </div>
  );
}

