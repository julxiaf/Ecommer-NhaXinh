import { Link } from "react-router-dom";
import {
  LayoutDashboard, FolderTree, Package, ShoppingCart, Tag,
  MessageSquare, FileText, ShieldCheck, Bell, Users, Settings,
  ChevronLeft, ChevronRight, LogOut, Activity, X, LayoutTemplate
} from "lucide-react";
import type { RoleDefinition, PermissionKey } from "../../services/admin/types";
import { hasPermission } from "./PermissionGate";

export type AdminViewTab =
  | "dashboard"
  | "categories"
  | "products"
  | "orders"
  | "discounts"
  | "crm"
  | "articles"
  | "client-content"
  | "policies"
  | "notifications"
  | "roles"
  | "logs"
  | "settings";

interface AdminSidebarProps {
  activeTab: AdminViewTab;
  onSelectTab: (tab: AdminViewTab) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
  currentRole: RoleDefinition;
  pendingOrdersCount?: number;
  unreadNotifCount?: number;
  openTicketsCount?: number;
  totalProductsCount?: number;
}

interface NavItemConfig {
  id: AdminViewTab;
  label: string;
  icon: typeof LayoutDashboard;
  permission: PermissionKey;
  badge?: number;
  badgeColor?: string;
}

export default function AdminSidebar({
  activeTab,
  onSelectTab,
  isCollapsed,
  onToggleCollapse,
  isMobileOpen = false,
  onCloseMobile,
  currentRole,
  pendingOrdersCount = 0,
  unreadNotifCount = 0,
  openTicketsCount = 0,
  totalProductsCount = 0,
}: AdminSidebarProps) {
  const navItems: NavItemConfig[] = [
    { id: "dashboard", label: "Tổng quan", icon: LayoutDashboard, permission: "dashboard.view" },
    { id: "categories", label: "Cấu trúc danh mục", icon: FolderTree, permission: "categories.view" },
    { id: "products", label: "Quản lý sản phẩm", icon: Package, permission: "products.view", badge: totalProductsCount },
    {
      id: "orders",
      label: "Hóa đơn & Đơn hàng",
      icon: ShoppingCart,
      permission: "orders.view",
      badge: pendingOrdersCount > 0 ? pendingOrdersCount : undefined,
      badgeColor: "#ea580c",
    },
    { id: "discounts", label: "Giảm giá & Voucher", icon: Tag, permission: "discounts.view" },
    {
      id: "crm",
      label: "Chăm sóc khách hàng",
      icon: MessageSquare,
      permission: "crm.view",
      badge: openTicketsCount > 0 ? openTicketsCount : undefined,
      badgeColor: "#0284c7",
    },
    { id: "articles", label: "Bài viết & Cẩm nang", icon: FileText, permission: "articles.view" },
    { id: "client-content", label: "Giao diện & Trang chủ", icon: LayoutTemplate, permission: "settings.view" },
    { id: "policies", label: "Thay đổi chính sách", icon: ShieldCheck, permission: "policies.view" },
    {
      id: "notifications",
      label: "Thông báo",
      icon: Bell,
      permission: "notifications.view",
      badge: unreadNotifCount > 0 ? unreadNotifCount : undefined,
      badgeColor: "#ef4444",
    },
    { id: "roles", label: "Phân quyền quản trị", icon: Users, permission: "roles.view" },
    { id: "logs", label: "Nhật ký hoạt động", icon: Activity, permission: "logs.view" },
    { id: "settings", label: "Cấu hình hệ thống", icon: Settings, permission: "settings.view" },
  ];

  return (
    <aside
      className={`admin-sidebar ${isCollapsed ? "collapsed" : ""} ${isMobileOpen ? "mobile-open" : ""}`}
      style={{
        width: isCollapsed ? "72px" : "260px",
        transition: "width 0.3s cubic-bezier(0.4, 0, 0.2, 1), transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        overflow: "hidden",
      }}
    >
      {/* Brand Header */}
      <div
        className="admin-brand flex items-center justify-between"
        style={{
          padding: isCollapsed ? "16px 8px" : "16px 18px",
        }}
      >
        {!isCollapsed ? (
          <div className="flex items-center gap-2 min-w-0">
            <Link to="/" className="admin-brand-logo truncate">
              NHÀ XINH
            </Link>
            <span className="admin-brand-tag shrink-0">Admin</span>
          </div>
        ) : (
          <div className="mx-auto font-serif text-sm font-bold text-slate-800 tracking-wider">
            NX
          </div>
        )}

        <div className="flex items-center gap-1 shrink-0">
          {/* Nút đóng menu mobile: CHỈ hiển thị trên màn hình điện thoại (<1024px) khi mở drawer */}
          {onCloseMobile && (
            <button
              type="button"
              onClick={onCloseMobile}
              className="admin-mobile-only admin-icon-btn items-center justify-center text-slate-400 hover:text-slate-700"
              title="Đóng menu"
              style={{ width: "32px", height: "32px" }}
            >
              <X size={18} />
            </button>
          )}

          {/* Nút thu gọn/mở rộng: CHỈ hiển thị trên desktop (>=1024px) */}
          <button
            type="button"
            onClick={onToggleCollapse}
            className="admin-desktop-only admin-icon-btn items-center justify-center text-slate-500 hover:text-slate-800"
            title={isCollapsed ? "Mở rộng thanh bên" : "Thu gọn thanh bên"}
            style={{ width: "30px", height: "30px" }}
          >
            {isCollapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
          </button>
        </div>
      </div>

      {/* Nav List */}
      <nav className="admin-nav" style={{ padding: isCollapsed ? "12px 8px" : "14px 10px" }}>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          const hasAccess = hasPermission(currentRole, item.permission);

          if (!hasAccess) {
            return null; // Ẩn tab nếu vai trò không có quyền xem
          }

          return (
            <button
              key={item.id}
              type="button"
              className={`admin-nav-item group ${isActive ? "active" : ""}`}
              onClick={() => {
                onSelectTab(item.id);
                onCloseMobile?.();
              }}
              title={isCollapsed ? item.label : undefined}
              style={{
                justifyContent: isCollapsed ? "center" : "flex-start",
                padding: isCollapsed ? "10px 0" : "9px 12px",
                position: "relative",
              }}
            >
              <Icon
                size={18}
                strokeWidth={isActive ? 2 : 1.75}
                className={`shrink-0 transition-colors ${
                  isActive
                    ? "text-blue-600"
                    : "text-slate-400 group-hover:text-slate-700"
                }`}
              />

              {!isCollapsed && (
                <>
                  <span className="truncate text-[13px] font-medium tracking-tight">
                    {item.label}
                  </span>

                  {item.badge !== undefined && (
                    <span
                      className="admin-nav-badge"
                      style={{
                        background: item.badgeColor
                          ? `${item.badgeColor}15`
                          : isActive
                          ? "#eff6ff"
                          : "#f1f5f9",
                        color: item.badgeColor || (isActive ? "#2563eb" : "#475569"),
                        border: `1px solid ${
                          item.badgeColor ? `${item.badgeColor}35` : "#e2e8f0"
                        }`,
                      }}
                    >
                      {item.badge}
                    </span>
                  )}
                </>
              )}

              {/* Dấu chấm badge khi thanh bên bị thu nhỏ */}
              {isCollapsed && item.badge !== undefined && (
                <span
                  style={{
                    position: "absolute",
                    top: "7px",
                    right: "12px",
                    width: "7px",
                    height: "7px",
                    borderRadius: "50%",
                    background: item.badgeColor || "#2563eb",
                    boxShadow: "0 0 0 2px #ffffff",
                  }}
                />
              )}
            </button>
          );
        })}
      </nav>

      {/* User profile footer */}
      <div
        className="admin-user-profile"
        style={{
          padding: isCollapsed ? "12px 0" : "12px 14px",
          justifyContent: isCollapsed ? "center" : "flex-start",
        }}
      >
        <div className="admin-avatar" title={currentRole.name}>
          {currentRole.name.slice(0, 2).toUpperCase()}
        </div>

        {!isCollapsed && (
          <div className="admin-user-info">
            <div className="admin-user-name">Trần Minh Quân</div>
            <div className="admin-user-role">
              {currentRole.name}
            </div>
          </div>
        )}

        {!isCollapsed && (
          <Link
            to="/"
            title="Quay lại website"
            className="text-slate-400 hover:text-slate-700 hover:bg-slate-100 p-1.5 rounded-lg transition-colors ml-auto shrink-0"
          >
            <LogOut size={16} />
          </Link>
        )}
      </div>
    </aside>
  );
}
