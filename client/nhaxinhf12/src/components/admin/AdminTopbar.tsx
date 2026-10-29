import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Menu, Bell, ArrowUpRight, Shield, CheckCheck,
  Package, AlertTriangle, Tag, Info, ExternalLink
} from "lucide-react";
import type { RoleDefinition, AdminNotification } from "../../services/admin/types";

interface AdminTopbarProps {
  title?: string;
  isSidebarCollapsed?: boolean;
  onToggleSidebar?: () => void;
  onToggleMobileSidebar?: () => void;
  currentRole: RoleDefinition;
  availableRoles: RoleDefinition[];
  onSelectRole: (role: RoleDefinition) => void;
  unreadCount?: number;
  notifications?: AdminNotification[];
  onMarkRead?: (id: string) => void;
  onMarkAllRead?: () => void;
  onOpenNotifications: () => void;
}

export default function AdminTopbar({
  title,
  onToggleMobileSidebar,
  currentRole,
  availableRoles,
  onSelectRole,
  unreadCount = 0,
  notifications = [],
  onMarkRead,
  onMarkAllRead,
  onOpenNotifications,
}: AdminTopbarProps) {
  void title;
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const notifDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notifDropdownRef.current && !notifDropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    if (isDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isDropdownOpen]);

  const getNotifIcon = (type: AdminNotification["type"]) => {
    switch (type) {
      case "order":
        return (
          <span className="w-7 h-7 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
            <Package size={14} />
          </span>
        );
      case "inventory":
        return (
          <span className="w-7 h-7 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
            <AlertTriangle size={14} />
          </span>
        );
      case "promotion":
        return (
          <span className="w-7 h-7 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center shrink-0">
            <Tag size={14} />
          </span>
        );
      case "system":
      default:
        return (
          <span className="w-7 h-7 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
            <Info size={14} />
          </span>
        );
    }
  };

  return (
    <header className="admin-topbar flex items-center justify-between px-3 sm:px-6 relative">
      <div className="admin-topbar-left flex items-center gap-2 sm:gap-3 min-w-0">
        {/* Mobile Hamburger Menu Toggle - CHỈ hiển thị trên mobile (<1024px) */}
        <button
          type="button"
          className="admin-mobile-only admin-icon-btn items-center justify-center text-slate-700 hover:bg-slate-100 p-2 rounded-xl transition-colors shrink-0"
          onClick={onToggleMobileSidebar}
          title="Mở menu quản trị"
        >
          <Menu size={20} />
        </button>
      </div>

      <div className="admin-topbar-right flex items-center gap-2 sm:gap-3 shrink-0">
        {/* Role Switcher - Dùng để kiểm thử phân quyền ngay tại chỗ */}
        <div
          className="flex items-center gap-1.5 sm:gap-2 px-2.5 py-1.5 bg-blue-50/80 border border-blue-200 rounded-xl text-xs"
        >
          <Shield size={14} className="text-blue-600 shrink-0" />
          <span className="text-blue-900 font-semibold hidden md:inline">Vai trò thử nghiệm:</span>

          <select
            value={currentRole.id}
            onChange={(e) => {
              const selected = availableRoles.find((r) => r.id === e.target.value);
              if (selected) onSelectRole(selected);
            }}
            className="bg-transparent border-none text-blue-600 font-bold text-xs cursor-pointer outline-none max-w-[110px] sm:max-w-none truncate"
          >
            {availableRoles.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name} ({r.permissions.length} quyền)
              </option>
            ))}
          </select>
        </div>

        {/* View store button */}
        <Link
          to="/"
          className="admin-btn admin-btn-secondary admin-btn-sm inline-flex items-center gap-1 px-2.5 py-1.5 border border-slate-200 rounded-xl text-xs font-semibold hover:bg-slate-50 transition-all text-slate-700"
          target="_blank"
        >
          <span className="hidden sm:inline">Xem website</span>
          <ArrowUpRight size={14} />
        </Link>

        {/* Notification bell & Dropdown */}
        <div className="relative" ref={notifDropdownRef}>
          <button
            type="button"
            className={`admin-icon-btn relative p-2 rounded-xl transition-all ${
              isDropdownOpen
                ? "bg-blue-50 text-blue-600"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
            onClick={() => setIsDropdownOpen((prev) => !prev)}
            title="Thông báo hệ thống"
            aria-expanded={isDropdownOpen}
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className="absolute top-0 right-0 w-4 h-4 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>

          {/* Floating Dropdown Panel */}
          {isDropdownOpen && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 z-[99999] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              {/* Dropdown Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50/90">
                <div className="flex items-center gap-2">
                  <Bell size={16} className="text-blue-600" />
                  <h3 className="font-bold text-slate-800 text-xs">Thông báo hệ thống</h3>
                  {unreadCount > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700">
                      {unreadCount} mới
                    </span>
                  )}
                </div>
                {unreadCount > 0 && onMarkAllRead && (
                  <button
                    type="button"
                    onClick={() => {
                      onMarkAllRead();
                    }}
                    className="text-[11px] text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1 transition-colors"
                    title="Đánh dấu tất cả là đã đọc"
                  >
                    <CheckCheck size={13} /> Đã đọc tất cả
                  </button>
                )}
              </div>

              {/* Notification Items List */}
              <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 overscroll-contain">
                {notifications && notifications.length > 0 ? (
                  notifications.slice(0, 8).map((notif) => (
                    <div
                      key={notif.id}
                      onClick={() => {
                        if (!notif.read && onMarkRead) onMarkRead(notif.id);
                      }}
                      className={`p-3 text-left hover:bg-slate-50 transition-colors cursor-pointer flex gap-3 ${
                        !notif.read ? "bg-blue-50/30" : ""
                      }`}
                    >
                      <div className="shrink-0 mt-0.5">
                        {getNotifIcon(notif.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-1">
                          <p className={`text-xs font-semibold truncate ${!notif.read ? "text-slate-900" : "text-slate-700"}`}>
                            {notif.title}
                          </p>
                          {!notif.read && (
                            <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0 mt-1" title="Chưa đọc" />
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5 leading-relaxed">
                          {notif.message}
                        </p>
                        <span className="text-[10px] text-slate-400 mt-1 block">
                          {notif.createdAt}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-8 text-center text-slate-400 text-xs">
                    <Bell size={24} className="mx-auto mb-2 opacity-40 text-slate-400" />
                    Không có thông báo hệ thống nào
                  </div>
                )}
              </div>

              {/* Dropdown Footer */}
              <div className="p-2 border-t border-slate-100 bg-slate-50/50">
                <button
                  type="button"
                  onClick={() => {
                    setIsDropdownOpen(false);
                    onOpenNotifications();
                  }}
                  className="w-full py-2 text-center text-xs font-semibold text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-xl transition-all flex items-center justify-center gap-1.5"
                >
                  <span>Xem tất cả thông báo hệ thống</span>
                  <ExternalLink size={13} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
