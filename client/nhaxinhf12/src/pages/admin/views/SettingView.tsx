import { useState } from "react";
import { Settings, Save, Store, Truck, CreditCard, Check } from "lucide-react";
import type { AdminSettingsConfig, RoleDefinition } from "../../../services/admin/types";
import PermissionGate from "../../../components/admin/PermissionGate";
import { vnd } from "../../../util/Constain";


interface SettingViewProps {
  settings: AdminSettingsConfig;
  currentRole: RoleDefinition;
  onSaveSettings: (cfg: AdminSettingsConfig) => void;
}

export default function SettingView({
  settings,
  currentRole,
  onSaveSettings,
}: SettingViewProps) {
  const [form, setForm] = useState<AdminSettingsConfig>({ ...settings });
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveSettings(form);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Settings className="text-blue-600" size={24} />
            Cấu hình Thông tin & Tham số Vận hành
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Quản lý thông tin thương hiệu, cước phí giao hàng và tích hợp cổng thanh toán
          </p>
        </div>

        {savedSuccess && (
          <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
            <Check size={14} /> Đã lưu cấu hình thành công!
          </span>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Thông tin Cửa hàng / Website */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Store size={18} className="text-blue-600" />
            <h3 className="text-sm font-bold text-slate-800">Thông tin Thương hiệu & Showroom</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Tên thương hiệu</label>
              <input
                type="text"
                value={form.siteName}
                onChange={(e) => setForm({ ...form, siteName: e.target.value })}
                className="w-full p-2.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Hotline tư vấn</label>
              <input
                type="text"
                value={form.hotline}
                onChange={(e) => setForm({ ...form, hotline: e.target.value })}
                className="w-full p-2.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Email liên hệ hỗ trợ</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full p-2.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Thời gian làm việc</label>
              <input
                type="text"
                value={form.workingHours || "08:30 - 21:00 (Thứ 2 - Chủ Nhật)"}
                onChange={(e) => setForm({ ...form, workingHours: e.target.value })}
                className="w-full p-2.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block font-semibold text-slate-700 mb-1">Địa chỉ Showroom chính</label>
              <input
                type="text"
                value={form.showroomAddress}
                onChange={(e) => setForm({ ...form, showroomAddress: e.target.value })}
                className="w-full p-2.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Cấu hình Vận chuyển */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Truck size={18} className="text-blue-600" />
            <h3 className="text-sm font-bold text-slate-800">Quy tắc Phí Vận chuyển & Giao hàng</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Ngưỡng miễn phí vận chuyển (Freeship VNĐ)
              </label>
              <input
                type="number"
                step={500000}
                value={form.freeShippingThreshold}
                onChange={(e) => setForm({ ...form, freeShippingThreshold: Number(e.target.value) })}
                className="w-full p-2.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-[11px] text-slate-500 mt-1 block">
                Hiện tại: Miễn phí cho đơn hàng từ {vnd(form.freeShippingThreshold)}
              </span>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Phí vận chuyển tiêu chuẩn toàn quốc (VNĐ)
              </label>
              <input
                type="number"
                step={10000}
                value={form.standardShippingFee}
                onChange={(e) => setForm({ ...form, standardShippingFee: Number(e.target.value) })}
                className="w-full p-2.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-[11px] text-slate-500 mt-1 block">
                Hiện tại: {vnd(form.standardShippingFee)}
              </span>
            </div>
          </div>
        </div>

        {/* Cấu hình Cổng thanh toán */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <CreditCard size={18} className="text-blue-600" />
            <h3 className="text-sm font-bold text-slate-800">Tham số Tích hợp Cổng thanh toán (VietQR / VNPAY)</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Ngân hàng thụ hưởng (VietQR)</label>
              <input
                type="text"
                value={form.vietqrBank}
                onChange={(e) => setForm({ ...form, vietqrBank: e.target.value })}
                className="w-full p-2.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Số tài khoản nhận tiền</label>
              <input
                type="text"
                value={form.vietqrAccount}
                onChange={(e) => setForm({ ...form, vietqrAccount: e.target.value })}
                className="w-full p-2.5 border border-slate-300 rounded-lg text-xs font-mono font-bold focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Tên chủ tài khoản</label>
              <input
                type="text"
                value={form.vietqrOwner}
                onChange={(e) => setForm({ ...form, vietqrOwner: e.target.value })}
                className="w-full p-2.5 border border-slate-300 rounded-lg text-xs font-bold uppercase focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Mã Website VNPAY (TMN Code)</label>
              <input
                type="text"
                value={form.vnpayMerchantId}
                onChange={(e) => setForm({ ...form, vnpayMerchantId: e.target.value })}
                className="w-full p-2.5 border border-slate-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Nút lưu có phân quyền */}
        <PermissionGate permission="settings.edit" currentRole={currentRole}>
          <div className="flex justify-end">
            <button
              type="submit"
              className="px-6 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 flex items-center gap-2 shadow-md transition-all"
            >
              <Save size={16} /> Lưu thay đổi cấu hình hệ thống
            </button>
          </div>
        </PermissionGate>
      </form>
    </div>
  );
}
