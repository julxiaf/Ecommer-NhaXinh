import AdminSidebar from "../../components/admin/AdminSidebar";
import AdminTopbar from "../../components/admin/AdminTopbar";
import PermissionGate from "../../components/admin/PermissionGate";
import NewOrderAlertToast from "../../components/admin/NewOrderAlertToast";
import DashboardView from "./views/DashboardView";
import CategoryView from "./views/CategoryView";
import ProductView from "./views/ProductView";
import OrderView from "./views/OrderView";
import RolePermissionView from "./views/RolePermissionView";
import DiscountView from "./views/DiscountView";
import ArticleView from "./views/ArticleView";
import ClientContentView from "./views/ClientContentView";
import PolicyAdminView from "./views/PolicyAdminView";
import AdminErrorBoundary from "../../components/admin/AdminErrorBoundary";
import CskhView from "./views/CskhView";
import NotificationView from "./views/NotificationView";
import SettingView from "./views/SettingView";
import AuditLogView from "./views/AuditLogView";
import { useAdminPortal } from "../../hooks/admin/useAdminPortal";
import "./admin.css";

export default function AdminPortal() {
  const {
    activeTab,
    setActiveTab,
    isSidebarCollapsed,
    setIsSidebarCollapsed,
    roles,
    currentRole,
    setCurrentRole,
    categories,
    products,
    orders,
    discounts,
    articles,
    notifications,
    staffList,
    permissions,
    tickets,
    settings,
    auditLogs,
    tabTitles,
    pendingOrdersCount,
    unreadNotifCount,
    openTicketsCount,
    totalProductsCount,
    isMobileSidebarOpen,
    setIsMobileSidebarOpen,
    handleRefreshLogs,
    handleClearLogs,
    handleSaveCategory,
    handleDeleteCategory,
    handleRestoreCategory,
    handleSaveProduct,
    handleDeleteProduct,
    handleRestoreProduct,
    handleRestockProduct,
    handleUpdateOrderStatus,
    handleConfirmOrderPayment,
    handleUpdateOrderShipping,
    handleCancelOrder,
    handleRefreshOrders,
    handleUpdateRolePermissions,
    handleSaveStaff,
    handleUpdateStaffStatus,
    handleCreateRole,
    handleUpdateRole,
    handleDeleteRole,
    handleCreatePermission,
    handleUpdatePermission,
    handleDeletePermission,
    handleSaveDiscount,
    handleDeleteDiscount,
    handleSaveArticle,
    handleDeleteArticle,
    handleCreateNotification,
    handleMarkNotifRead,
    handleMarkAllNotifRead,
    handleReplyTicket,
    handleSaveSettings,
    newOrderAlert,
    handleDismissOrderAlert,
    handleViewNewOrder,
  } = useAdminPortal();

  return (
    <div className={`admin-portal-shell ${isSidebarCollapsed ? "sidebar-collapsed" : ""}`}>
      {/* Mobile Drawer Backdrop */}
      {isMobileSidebarOpen && (
        <div
          className="admin-sidebar-backdrop fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-45 transition-opacity"
          onClick={() => setIsMobileSidebarOpen(false)}
        />
      )}

      <AdminSidebar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
        currentRole={currentRole}
        pendingOrdersCount={pendingOrdersCount}
        unreadNotifCount={unreadNotifCount}
        openTicketsCount={openTicketsCount}
        totalProductsCount={totalProductsCount}
      />

      <div className="admin-portal-main">
        <AdminTopbar
          title={tabTitles[activeTab]}
          isSidebarCollapsed={isSidebarCollapsed}
          onToggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          onToggleMobileSidebar={() => setIsMobileSidebarOpen((prev) => !prev)}
          currentRole={currentRole}
          availableRoles={roles}
          onSelectRole={setCurrentRole}
          unreadCount={unreadNotifCount}
          notifications={notifications}
          onMarkRead={handleMarkNotifRead}
          onMarkAllRead={handleMarkAllNotifRead}
          onOpenNotifications={() => setActiveTab("notifications")}
        />

        <main className="admin-content-area">
          {activeTab === "dashboard" && (
            <PermissionGate
              permission="dashboard.view"
              currentRole={currentRole}
              fallbackMessage="Bạn không có quyền truy cập vào màn hình Tổng quan & Doanh số."
            >
              <DashboardView
                orders={orders}
                products={products}
                discounts={discounts}
                currentRole={currentRole}
                onNavigateTab={setActiveTab}
                onRestockProduct={handleRestockProduct}
              />
            </PermissionGate>
          )}

          {activeTab === "categories" && (
            <PermissionGate
              permission="categories.view"
              currentRole={currentRole}
              fallbackMessage="Bạn không có quyền xem cấu trúc danh mục."
            >
              <CategoryView
                categories={categories}
                currentRole={currentRole}
                onSaveCategory={handleSaveCategory}
                onDeleteCategory={handleDeleteCategory}
                onRestoreCategory={handleRestoreCategory}
              />
            </PermissionGate>
          )}

          {activeTab === "products" && (
            <PermissionGate
              permission="products.view"
              currentRole={currentRole}
              fallbackMessage="Bạn không có quyền truy cập quản lý sản phẩm."
            >
              <ProductView
                products={products}
                categories={categories}
                currentRole={currentRole}
                onSaveProduct={handleSaveProduct}
                onDeleteProduct={handleDeleteProduct}
                onRestoreProduct={handleRestoreProduct}
              />
            </PermissionGate>
          )}

          {activeTab === "orders" && (
            <PermissionGate
              permission="orders.view"
              currentRole={currentRole}
              fallbackMessage="Bạn không có quyền xem danh sách đơn hàng."
            >
              <OrderView
                orders={orders}
                currentRole={currentRole}
                onUpdateStatus={handleUpdateOrderStatus}
                onConfirmPayment={handleConfirmOrderPayment}
                onUpdateShipping={handleUpdateOrderShipping}
                onCancelOrder={handleCancelOrder}
                onRefreshOrders={handleRefreshOrders}
              />
            </PermissionGate>
          )}

          {activeTab === "discounts" && (
            <PermissionGate
              permission="discounts.view"
              currentRole={currentRole}
              fallbackMessage="Bạn không có quyền quản lý mã giảm giá."
            >
              <DiscountView
                discounts={discounts}
                currentRole={currentRole}
                onSaveDiscount={handleSaveDiscount}
                onDeleteDiscount={handleDeleteDiscount}
              />
            </PermissionGate>
          )}

          {activeTab === "crm" && (
            <PermissionGate
              permission="crm.view"
              currentRole={currentRole}
              fallbackMessage="Bạn không có quyền truy cập cổng Chăm sóc Khách hàng."
            >
              <CskhView
                tickets={tickets}
                currentRole={currentRole}
                onReplyTicket={handleReplyTicket}
              />
            </PermissionGate>
          )}

          {activeTab === "articles" && (
            <PermissionGate
              permission="articles.view"
              currentRole={currentRole}
              fallbackMessage="Bạn không có quyền quản trị bài viết & cẩm nang."
            >
              <ArticleView
                articles={articles}
                currentRole={currentRole}
                onSaveArticle={handleSaveArticle}
                onDeleteArticle={handleDeleteArticle}
              />
            </PermissionGate>
          )}

          {activeTab === "client-content" && (
            <PermissionGate
              permission="settings.view"
              currentRole={currentRole}
              fallbackMessage="Bạn không có quyền quản lý giao diện khách hàng."
            >
              <ClientContentView currentRole={currentRole} />
            </PermissionGate>
          )}

          {activeTab === "policies" && (
            <AdminErrorBoundary fallbackTitle="Không thể tải giao diện Quản lý Chính sách">
              <PermissionGate
                permission="policies.view"
                currentRole={currentRole}
                fallbackMessage="Bạn không có quyền thay đổi các chính sách hệ thống."
              >
                <PolicyAdminView currentRole={currentRole} />
              </PermissionGate>
            </AdminErrorBoundary>
          )}

          {activeTab === "notifications" && (
            <PermissionGate
              permission="notifications.view"
              currentRole={currentRole}
              fallbackMessage="Bạn không có quyền phát thông báo toàn hệ thống."
            >
              <NotificationView
                notifications={notifications}
                currentRole={currentRole}
                onCreateNotification={handleCreateNotification}
                onMarkRead={handleMarkNotifRead}
              />
            </PermissionGate>
          )}

          {activeTab === "roles" && (
            <PermissionGate
              permission="roles.view"
              currentRole={currentRole}
              fallbackMessage="Bạn không có quyền truy cập cấu hình phân quyền & tài khoản nhân sự."
            >
              <RolePermissionView
                roles={roles}
                staffList={staffList}
                permissions={permissions}
                auditLogs={auditLogs}
                currentRole={currentRole}
                onUpdateRolePermissions={handleUpdateRolePermissions}
                onSaveStaff={handleSaveStaff}
                onUpdateStaffStatus={handleUpdateStaffStatus}
                onCreateRole={handleCreateRole}
                onUpdateRole={handleUpdateRole}
                onDeleteRole={handleDeleteRole}
                onCreatePermission={handleCreatePermission}
                onUpdatePermission={handleUpdatePermission}
                onDeletePermission={handleDeletePermission}
              />
            </PermissionGate>
          )}

          {activeTab === "logs" && (
            <PermissionGate
              permission="logs.view"
              currentRole={currentRole}
              fallbackMessage="Bạn không có quyền truy cập nhật ký hoạt động hệ thống."
            >
              <AuditLogView
                logs={auditLogs}
                currentRole={currentRole}
                onRefresh={handleRefreshLogs}
                onClearLogs={handleClearLogs}
              />
            </PermissionGate>
          )}

          {activeTab === "settings" && (
            <PermissionGate
              permission="settings.view"
              currentRole={currentRole}
              fallbackMessage="Bạn không có quyền truy cập cấu hình hệ thống."
            >
              <SettingView
                settings={settings}
                currentRole={currentRole}
                onSaveSettings={handleSaveSettings}
              />
            </PermissionGate>
          )}
        </main>
      </div>

      {/* Thông báo hệ thống nổi khi có đơn hàng mới */}
      <NewOrderAlertToast
        alert={newOrderAlert}
        onClose={handleDismissOrderAlert}
        onViewOrder={handleViewNewOrder}
      />
    </div>
  );
}
