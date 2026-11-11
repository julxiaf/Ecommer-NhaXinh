import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Menu, Bell, CheckCheck,
  Package, AlertTriangle, Tag, Info, ExternalLink,
  ShieldCheck, PanelLeftClose, PanelLeftOpen
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
  isSidebarCollapsed,
  onToggleSidebar,
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
  void availableRoles;
  void onSelectRole;
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
    <header className="admin-topbar flex items-center justify-between px-3 sm:px-6 relative border-b border-slate-200/80 bg-white/95 backdrop-blur-md sticky top-0 z-40">
      <div className="admin-topbar-left flex items-center gap-2 sm:gap-3.5 min-w-0">
        {/* Mobile Hamburger Menu Toggle - CHỈ hiển thị trên mobile (<1024px) */}
        <button
          type="button"
          className="admin-mobile-only admin-icon-btn items-center justify-center text-slate-700 hover:bg-slate-100 p-2 rounded-xl transition-colors shrink-0"
          onClick={onToggleMobileSidebar}
          title="Mở menu quản trị"
        >
          <Menu size={20} />
        </button>

        {/* Desktop Sidebar Toggle */}
        {onToggleSidebar && (
          <button
            type="button"
            className="admin-desktop-only items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-slate-100 p-1.5 rounded-lg transition-colors shrink-0"
            onClick={onToggleSidebar}
            title={isSidebarCollapsed ? "Mở rộng thanh bên" : "Thu gọn thanh bên"}
          >
            {isSidebarCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
          </button>
        )}

        {/* Page Title & Breadcrumb */}
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-400">
            <span>Quản trị</span>
            <span>/</span>
            <span className="text-slate-600 font-semibold truncate">{title || "Tổng quan"}</span>
          </div>
          <h1 className="admin-page-title text-sm sm:text-base font-bold text-slate-800 tracking-tight truncate leading-tight">
            {title || "Hệ thống Quản trị"}
          </h1>
        </div>
      </div>

      <div className="admin-topbar-right flex items-center gap-2 sm:gap-3 shrink-0">
        {/* Quick link: Xem website */}
        <Link
          to="/"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-blue-600 hover:border-blue-200 transition-all shadow-xs"
          title="Xem website Nhà Xinh ở tab mới"
        >
          <ExternalLink size={13} className="text-slate-400" />
          <span className="hidden sm:inline">Xem website</span>
        </Link>

        {/* Current Role Badge */}
        {currentRole && (
          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-blue-50/80 border border-blue-200/80 text-blue-700 text-xs font-semibold">
            <ShieldCheck size={14} className="text-blue-600 shrink-0" />
            <span className="truncate max-w-[140px]">{currentRole.name}</span>
          </div>
        )}

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
