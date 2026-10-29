import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import type {
  AdminCategory, AdminProduct, AdminOrder, AdminDiscount,
  AdminArticle, AdminNotification, AdminStaff, AdminTicket,
  AdminSettingsConfig, RoleDefinition, PermissionKey,
  AdminAuditLog, AdminPermissionItem
} from "../../services/admin/types";
import {
  adminApi, INITIAL_ROLES, INITIAL_DISCOUNTS, INITIAL_ARTICLES,
  INITIAL_NOTIFICATIONS, INITIAL_TICKETS, INITIAL_SETTINGS,
} from "../../services/admin/adminService";
import type { AdminProductInput } from "../../services/admin/catalogApi";
import type { AdminViewTab } from "../../components/admin/AdminSidebar";
import type { NewOrderAlertData } from "../../components/admin/NewOrderAlertToast";
import { chatbotService } from "../../services/chatbotService";

/**
 * Phát chuông báo âm thanh dạng Web Audio API (không cần file mp3 ngoài)
 */
function playNotificationSound() {
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    // Tone 1: 587.33 Hz (D5)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(587.33, now);
    gain1.gain.setValueAtTime(0.2, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.35);

    // Tone 2: 880 Hz (A5)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(880, now + 0.12);
    gain2.gain.setValueAtTime(0.25, now + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.12);
    osc2.stop(now + 0.55);
  } catch (err) {
    console.debug("Không thể phát âm thanh thông báo:", err);
  }
}

const PATH_TO_TAB: Record<string, AdminViewTab> = {
  "": "dashboard",
  "dashboard": "dashboard",
  "tong-quan": "dashboard",
  "categories": "categories",
  "danh-muc": "categories",
  "products": "products",
  "san-pham": "products",
  "orders": "orders",
  "don-hang": "orders",
  "discounts": "discounts",
  "giam-gia": "discounts",
  "voucher": "discounts",
  "crm": "crm",
  "cskh": "crm",
  "articles": "articles",
  "bai-viet": "articles",
  "cam-nang": "articles",
  "client-content": "client-content",
  "giao-dien": "client-content",
  "cms": "client-content",
  "policies": "policies",
  "chinh-sach": "policies",
  "notifications": "notifications",
  "thong-bao": "notifications",
  "roles": "roles",
  "phan-quyen": "roles",
  "logs": "logs",
  "nhat-ky": "logs",
  "settings": "settings",
  "cai-dat": "settings",
};

export function useAdminPortal() {
  const location = useLocation();
  const navigate = useNavigate();

  // Đồng bộ tab từ URL pathname hoặc URL query param ?tab=
  const resolveTabFromUrl = useCallback((): AdminViewTab => {
    // 1. Kiểm tra query param ?tab=
    const params = new URLSearchParams(location.search);
    const queryTab = params.get("tab")?.toLowerCase();
    if (queryTab && PATH_TO_TAB[queryTab]) {
      return PATH_TO_TAB[queryTab];
    }

    // 2. Kiểm tra sub-path sau /admin/
    const subPath = location.pathname.replace(/^\/admin\/?/, "").split("/")[0]?.toLowerCase() || "";
    if (PATH_TO_TAB[subPath]) {
      return PATH_TO_TAB[subPath];
    }

    return "dashboard";
  }, [location.pathname, location.search]);

  const [activeTab, setActiveTabState] = useState<AdminViewTab>(resolveTabFromUrl);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Tự động cập nhật activeTab khi URL thay đổi
  useEffect(() => {
    const currentTab = resolveTabFromUrl();
    setActiveTabState((prev) => (prev !== currentTab ? currentTab : prev));
  }, [resolveTabFromUrl]);

  // Chuyển tab và cập nhật URL mượt mà
  const handleSelectTab = useCallback(
    (tab: AdminViewTab) => {
      setActiveTabState(tab);
      setIsMobileSidebarOpen(false); // Tự đóng drawer khi chọn tab trên mobile
      const targetUrl = tab === "dashboard" ? "/admin" : `/admin/${tab}`;
      if (location.pathname !== targetUrl) {
        navigate(targetUrl);
      }
    },
    [location.pathname, navigate]
  );

  const [roles, setRoles] = useState<RoleDefinition[]>([]);
  const [currentRole, setCurrentRole] = useState<RoleDefinition>({
    id: "admin",
    name: "Quản trị viên tối cao",
    code: "ADMIN",
    description: "Toàn quyền hệ thống",
    permissions: [],
    isSystem: true,
  });

  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [discounts, setDiscounts] = useState<AdminDiscount[]>(INITIAL_DISCOUNTS);
  const [articles, setArticles] = useState<AdminArticle[]>(INITIAL_ARTICLES);
  const [notifications, setNotifications] = useState<AdminNotification[]>(INITIAL_NOTIFICATIONS);
  const [staffList, setStaffList] = useState<AdminStaff[]>([]);
  const [tickets, setTickets] = useState<AdminTicket[]>(INITIAL_TICKETS);
  const [settings, setSettings] = useState<AdminSettingsConfig>(INITIAL_SETTINGS);
  const [auditLogs, setAuditLogs] = useState<AdminAuditLog[]>([]);
  const [permissions, setPermissions] = useState<AdminPermissionItem[]>([]);
  const [newOrderAlert, setNewOrderAlert] = useState<NewOrderAlertData | null>(null);
  const [activeChatCount, setActiveChatCount] = useState<number>(0);

  const knownOrderIdsRef = useRef<Set<string>>(new Set());
  const isInitialLoadRef = useRef(true);

  const currentActor = {
    name: "admin",
    email: "admin@nhaxinh.com",
    role: currentRole.name,
  };

  useEffect(() => {
    async function loadData() {
      try {
        const [
          loadedRoles, loadedCats, loadedProds, loadedOrders,
          loadedDiscs, loadedArts, loadedNotifs, loadedStaff,
          loadedTickets, loadedSettings, loadedLogs, loadedPerms
        ] = await Promise.all([
          adminApi.getRoles(),
          adminApi.getCategories(true),
          adminApi.getProducts(true),
          adminApi.getOrders(),
          adminApi.getDiscounts(),
          adminApi.getArticles(),
          adminApi.getNotifications(),
          adminApi.getStaff(),
          adminApi.getTickets(),
          adminApi.getSettings(),
          adminApi.getAuditLogs(),
          adminApi.getPermissions(),
        ]);

        if (loadedRoles && loadedRoles.length > 0) {
          const defaultAdmin = loadedRoles.find((r) => r.code === "ADMIN" || r.code === "SUPER_ADMIN") || loadedRoles[0];
          setRoles(loadedRoles);
          setCurrentRole(defaultAdmin);
        }
        setCategories(loadedCats || []);
        setProducts(loadedProds || []);
        setOrders(loadedOrders || []);
        if (loadedOrders && loadedOrders.length > 0) {
          loadedOrders.forEach((o) => knownOrderIdsRef.current.add(String(o.id)));
        }
        isInitialLoadRef.current = false;

        setDiscounts(loadedDiscs || []);
        setArticles(loadedArts || []);
        setNotifications(loadedNotifs || []);
        setStaffList(loadedStaff || []);
        setTickets(loadedTickets || []);
        setSettings(loadedSettings || INITIAL_SETTINGS);
        setAuditLogs(loadedLogs || []);
        setPermissions(loadedPerms || []);
      } catch (err) {
        console.error("Error loading admin data from API:", err);
      }
    }
    loadData();
  }, []);

  // ── Polling ngầm phát hiện đơn hàng mới & phát thông báo hệ thống ──
  useEffect(() => {
    // Xin quyền Browser Native Notification
    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "default") {
      Notification.requestPermission().catch(() => {});
    }

    const interval = setInterval(async () => {
      try {
        const latestOrders = await adminApi.getOrders();
        if (!latestOrders || latestOrders.length === 0) return;

        if (isInitialLoadRef.current || knownOrderIdsRef.current.size === 0) {
          latestOrders.forEach((o) => knownOrderIdsRef.current.add(String(o.id)));
          isInitialLoadRef.current = false;
          return;
        }

        const newlyArrivedOrders = latestOrders.filter(
          (o) => !knownOrderIdsRef.current.has(String(o.id))
        );

        if (newlyArrivedOrders.length > 0) {
          newlyArrivedOrders.forEach((o) => knownOrderIdsRef.current.add(String(o.id)));
          setOrders(latestOrders);
          playNotificationSound();

          for (const newOrd of newlyArrivedOrders) {
            const customer = newOrd.customerName || "Khách hàng";
            const totalStr = Number(newOrd.total).toLocaleString("vi-VN") + " ₫";
            const itemCount = newOrd.items ? newOrd.items.length : 1;

            const notifTitle = `Đơn hàng mới #${newOrd.orderCode}`;
            const notifMsg = `Khách hàng ${customer} vừa đặt đơn hàng mới trị giá ${totalStr} (${itemCount} sản phẩm).`;

            const createdNotif = await adminApi.createNotification({
              title: notifTitle,
              message: notifMsg,
              type: "order",
              target: "all",
            });

            setNotifications((prev) => [createdNotif, ...prev]);

            if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
              try {
                const bNotif = new Notification("🔔 Đơn hàng mới tại Nhà Xinh!", {
                  body: `${notifTitle}: ${notifMsg}`,
                  icon: "/favicon.ico",
                  tag: `order-${newOrd.id}`,
                });
                bNotif.onclick = () => {
                  window.focus();
                  handleSelectTab("orders");
                };
              } catch (e) {
                console.debug("Lỗi gửi browser notification:", e);
              }
            }

            setNewOrderAlert({
              id: String(newOrd.id),
              orderCode: newOrd.orderCode,
              customerName: customer,
              total: Number(newOrd.total) || 0,
              itemsCount: itemCount,
              createdAt: "Vừa xong",
            });
          }
        }

        // Kiểm tra số lượng hội thoại khách hàng cần CSKH trực tiếp
        try {
          const convs = await chatbotService.getAdminConversations();
          const needsAgent = convs.filter((c) => c.mode === "AGENT" && c.status === "ACTIVE");
          setActiveChatCount(needsAgent.length);
        } catch {
          // ignore
        }
      } catch (err) {
        console.debug("Lỗi kiểm tra đơn hàng mới ngầm:", err);
      }
    }, 10000); // 10s polling

    return () => clearInterval(interval);
  }, [handleSelectTab]);

  const tabTitles: Record<AdminViewTab, string> = {
    dashboard: "Bảng điều khiển & Doanh số",
    categories: "Cấu trúc danh mục phân cấp",
    products: "Quản lý sản phẩm & Biến thể",
    orders: "Quản lý đơn hàng & Tiến độ giao",
    discounts: "Mã giảm giá & Khuyến mãi",
    crm: "Chăm sóc khách hàng & Tickets",
    articles: "Cẩm nang & Bài viết cẩm nang",
    "client-content": "Quản lý Giao diện & Trang chủ (CMS)",
    policies: "Quản lý chính sách mua bán",
    notifications: "Thông báo hệ thống",
    roles: "Phân quyền & Tài khoản nhân viên",
    logs: "Nhật ký hoạt động & Kiểm toán (Audit Logs)",
    settings: "Cấu hình hệ thống & Cổng thanh toán",
  };

  const handleRefreshLogs = async () => {
    const loaded = await adminApi.getAuditLogs();
    setAuditLogs(loaded);
  };

  const handleClearLogs = async () => {
    await adminApi.clearAuditLogs();
    setAuditLogs([]);
  };

  const handleSaveCategory = async (cat: Partial<AdminCategory>) => {
    await adminApi.saveCategory(cat, currentActor);
    setCategories(await adminApi.getCategories(true));
    handleRefreshLogs();
  };

  const handleDeleteCategory = async (id: string) => {
    await adminApi.softDeleteCategory(id, currentActor);
    setCategories(await adminApi.getCategories(true));
    handleRefreshLogs();
  };

  const handleRestoreCategory = async (id: string) => {
    await adminApi.restoreCategory(id, currentActor);
    setCategories(await adminApi.getCategories(true));
    handleRefreshLogs();
  };

  const handleSaveProduct = async (prod: AdminProductInput) => {
    await adminApi.saveProduct(prod, currentActor);
    setProducts(await adminApi.getProducts(true));
    handleRefreshLogs();
  };

  const handleDeleteProduct = async (id: number) => {
    await adminApi.softDeleteProduct(id, currentActor);
    setProducts(await adminApi.getProducts(true));
    handleRefreshLogs();
  };

  const handleRestoreProduct = async (id: number) => {
    await adminApi.restoreProduct(id, currentActor);
    setProducts(await adminApi.getProducts(true));
    handleRefreshLogs();
  };

  const handleRestockProduct = async (id: number, amount: number) => {
    await adminApi.restockProduct(id, amount, currentActor);
    setProducts(await adminApi.getProducts(true));
    handleRefreshLogs();
  };

  const handleUpdateOrderStatus = async (
    orderId: string,
    newStatus: AdminOrder["status"],
    note?: string
  ) => {
    await adminApi.updateOrderStatus(orderId, newStatus, currentActor.name, note, currentActor);
    setOrders(await adminApi.getOrders());
    handleRefreshLogs();
  };

  const handleConfirmOrderPayment = async (
    orderId: string,
    paymentStatus = "paid",
    paymentMethod?: string,
    note?: string
  ) => {
    await adminApi.confirmOrderPayment(orderId, currentActor, paymentStatus, paymentMethod, note);
    setOrders(await adminApi.getOrders());
    handleRefreshLogs();
  };

  const handleUpdateOrderShipping = async (
    orderId: string,
    data: { recipientName: string; recipientPhone: string; shippingAddress: string; customerNote?: string }
  ) => {
    await adminApi.updateOrderShipping(orderId, data, currentActor);
    setOrders(await adminApi.getOrders());
    handleRefreshLogs();
  };

  const handleCancelOrder = async (orderId: string, reason: string) => {
    await adminApi.cancelOrder(orderId, reason, currentActor);
    setOrders(await adminApi.getOrders());
    handleRefreshLogs();
  };

  const handleRefreshOrders = async () => {
    setOrders(await adminApi.getOrders());
  };

  const handleUpdateRolePermissions = async (
    roleId: string,
    permissions: PermissionKey[]
  ) => {
    await adminApi.updateRolePermissions(roleId, permissions, currentActor);
    const updatedRoles = await adminApi.getRoles();
    setRoles(updatedRoles);
    if (currentRole.id === roleId) {
      setCurrentRole(updatedRoles.find((r) => r.id === roleId) || currentRole);
    }
    handleRefreshLogs();
  };

  const handleSaveStaff = async (staff: Partial<AdminStaff> & { username?: string; password?: string; phone?: string }) => {
    await adminApi.saveStaff(staff, currentActor);
    setStaffList(await adminApi.getStaff());
    handleRefreshLogs();
  };

  const handleUpdateStaffStatus = async (userId: string, status: "active" | "inactive") => {
    await adminApi.updateStaffStatus(userId, status, undefined, currentActor);
    setStaffList(await adminApi.getStaff());
    handleRefreshLogs();
  };

  const handleCreateRole = async (role: Omit<RoleDefinition, "id">) => {
    await adminApi.saveRole(role, currentActor);
    setRoles(await adminApi.getRoles());
    handleRefreshLogs();
  };

  const handleUpdateRole = async (roleId: string, data: { name: string; description: string }) => {
    await adminApi.updateRole(roleId, data, currentActor);
    const updatedRoles = await adminApi.getRoles();
    setRoles(updatedRoles);
    if (currentRole.id === roleId) {
      setCurrentRole(updatedRoles.find((r) => r.id === roleId) || currentRole);
    }
    handleRefreshLogs();
  };

  const handleDeleteRole = async (roleId: string) => {
    await adminApi.deleteRole(roleId, currentActor);
    const updatedRoles = await adminApi.getRoles();
    setRoles(updatedRoles);
    if (currentRole.id === roleId) setCurrentRole(updatedRoles[0] || INITIAL_ROLES[0]);
    handleRefreshLogs();
  };

  const handleCreatePermission = async (data: { code: string; name: string; module: string; description: string }) => {
    await adminApi.savePermission(data, currentActor);
    setPermissions(await adminApi.getPermissions());
    handleRefreshLogs();
  };

  const handleUpdatePermission = async (id: string | number, data: { name: string; module: string; description: string }) => {
    await adminApi.updatePermission(id, data, currentActor);
    setPermissions(await adminApi.getPermissions());
    handleRefreshLogs();
  };

  const handleDeletePermission = async (id: string | number, force = true) => {
    await adminApi.deletePermission(id, force, currentActor);
    setPermissions(await adminApi.getPermissions());
    setRoles(await adminApi.getRoles());
    handleRefreshLogs();
  };

  const handleSaveDiscount = async (disc: Partial<AdminDiscount>) => {
    await adminApi.saveDiscount(disc);
    setDiscounts(await adminApi.getDiscounts());
  };

  const handleDeleteDiscount = async (id: string) => {
    await adminApi.deleteDiscount(id);
    setDiscounts(await adminApi.getDiscounts());
  };

  const handleSaveArticle = async (art: Partial<AdminArticle>) => {
    await adminApi.saveArticle(art);
    setArticles(await adminApi.getArticles());
  };

  const handleDeleteArticle = async (id: string) => {
    await adminApi.deleteArticle(id);
    setArticles(await adminApi.getArticles());
  };

  const handleCreateNotification = async (notif: Partial<AdminNotification>) => {
    await adminApi.createNotification(notif);
    setNotifications(await adminApi.getNotifications());
  };

  const handleMarkNotifRead = async (id: string) => {
    await adminApi.markNotificationRead(id);
    setNotifications(await adminApi.getNotifications());
  };

  const handleMarkAllNotifRead = async () => {
    await adminApi.markAllNotificationsRead();
    setNotifications(await adminApi.getNotifications());
  };

  const handleReplyTicket = async (id: string, replyText: string) => {
    await adminApi.replyTicket(id, replyText);
    setTickets(await adminApi.getTickets());
  };

  const handleSaveSettings = async (cfg: AdminSettingsConfig) => {
    await adminApi.saveSettings(cfg, currentActor);
    setSettings(cfg);
  };

  const pendingOrdersCount = useMemo(
    () => orders.filter((o) => o.status === "pending").length,
    [orders]
  );
  const unreadNotifCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications]
  );
  const openTicketsCount = useMemo(
    () => tickets.filter((t) => t.status === "open").length + activeChatCount,
    [tickets, activeChatCount]
  );
  const totalProductsCount = useMemo(
    () => products.filter((p) => !p.isDeleted).length,
    [products]
  );

  return {
    activeTab,
    setActiveTab: handleSelectTab,
    isSidebarCollapsed,
    setIsSidebarCollapsed,
    isMobileSidebarOpen,
    setIsMobileSidebarOpen,
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
    handleDismissOrderAlert: () => setNewOrderAlert(null),
    handleViewNewOrder: () => {
      handleSelectTab("orders");
      setNewOrderAlert(null);
    },
  };
}

