import { Bell, Plus, Search } from "lucide-react";
import type { AdminNotification, RoleDefinition } from "../../../services/admin/types";
import PermissionGate from "../../../components/admin/PermissionGate";
import { AdminPagination } from "../../../components/admin/AdminPagination";
import { useAdminNotifications, type NotificationReadFilter } from "../../../hooks/admin/useAdminNotifications";

interface NotificationViewProps {
  notifications: AdminNotification[];
  currentRole: RoleDefinition;
  onCreateNotification: (notif: Partial<AdminNotification>) => void;
  onMarkRead: (id: string) => void;
}

export default function NotificationView({
  notifications,
  currentRole,
  onCreateNotification,
  onMarkRead,
}: NotificationViewProps) {
  const {
    search,
    setSearch,
    typeFilter,
    setTypeFilter,
    readFilter,
    setReadFilter,
    pagination,
    showModal,
    setShowModal,
    title,
    setTitle,
    message,
    setMessage,
    type,
    setType,
    handleSend,
  } = useAdminNotifications({ notifications, onCreateNotification });

  const { paginatedItems: displayedNotifications } = pagination;

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Bell className="text-blue-600" size={24} />
            Quản lý Thông báo Hệ thống (Broadcast)
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Gửi thông báo chương trình khuyến mãi, bảo trì hệ thống hoặc cập nhật chính sách
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative w-full sm:w-52">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm tiêu đề, nội dung..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
            />
          </div>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-700"
          >
            <option value="all">Mọi phân loại</option>
            <option value="system">Hệ thống</option>
            <option value="promo">Khuyến mãi</option>
            <option value="order">Đơn hàng</option>
          </select>

          <select
            value={readFilter}
            onChange={(e) => setReadFilter(e.target.value as NotificationReadFilter)}
            className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-700"
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="unread">Chưa đọc ({notifications.filter((n) => !n.read).length})</option>
            <option value="read">Đã đọc ({notifications.filter((n) => n.read).length})</option>
          </select>

          <PermissionGate permission="notifications.create" currentRole={currentRole}>
            <button
              onClick={() => setShowModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 flex items-center gap-1.5 shadow-sm transition-all"
            >
              <Plus size={15} /> Phát thông báo mới
            </button>
          </PermissionGate>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="divide-y divide-slate-100">
          {displayedNotifications.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-400">
              Không tìm thấy thông báo nào phù hợp với bộ lọc.
            </div>
          ) : (
            displayedNotifications.map((n) => (
              <div key={n.id} className="p-4 flex items-start justify-between gap-4 hover:bg-slate-50 transition-colors">
                <div className="flex items-start gap-3">
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
                      n.type === "promotion"
                        ? "bg-pink-100 text-pink-700"
                        : n.type === "order"
                        ? "bg-blue-100 text-blue-700"
                        : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    <Bell size={16} />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-xs flex items-center gap-2">
                      {n.title}
                      {!n.read && (
                        <span className="w-2 h-2 rounded-full bg-blue-600 inline-block"></span>
                      )}
                    </h4>
                    <p className="text-xs text-slate-600 mt-1">{n.message}</p>
                    <span className="text-[11px] text-slate-400 mt-1 block">{n.createdAt}</span>
                  </div>
                </div>

                {!n.read && (
                  <button
                    onClick={() => onMarkRead(n.id)}
                    className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 whitespace-nowrap px-2.5 py-1 rounded bg-blue-50"
                  >
                    Đánh dấu đã đọc
                  </button>
                )}
              </div>
            ))
          )}
        </div>
        <AdminPagination pagination={pagination} itemLabel="thông báo" />
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xl max-w-md w-full overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/50">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Bell size={18} className="text-blue-600" />
                Gửi thông báo toàn hệ thống
              </h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold p-1 rounded-md"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSend}>
              <div className="p-5 space-y-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1.5">Tiêu đề thông báo</label>
                  <input
                    type="text"
                    required
                    placeholder="VD: Nhà Xinh ra mắt Bộ Sưu Tập 2026..."
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1.5">Loại thông báo</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as AdminNotification["type"])}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
                  >
                    <option value="system">Hệ thống & Vận hành</option>
                    <option value="promo">Chương trình khuyến mãi</option>
                    <option value="order">Cập nhật đơn hàng</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1.5">Nội dung chi tiết</label>
                  <textarea
                    rows={4}
                    required
                    placeholder="Nhập nội dung thông báo gửi đến toàn thể khách hàng..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-slate-100 bg-slate-50/70">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-all"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 shadow-xs transition-all"
                >
                  Phát thông báo ngay
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
