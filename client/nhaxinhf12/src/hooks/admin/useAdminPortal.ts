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
import type { AuthSession } from "../../services/userService";

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
  "collections": "collections",
  "bo-suu-tap": "collections",
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

export function useAdminPortal(session?: AuthSession | null) {
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

  const normalizedSessionRoles = useMemo(
    () =>
      (session?.roles || []).map((r) =>
        String(r).replace(/^ROLE_/i, "").trim().toUpperCase()
      ),
    [session?.roles]
  );

  const [roles, setRoles] = useState<RoleDefinition[]>([]);
  const [currentRole, setCurrentRole] = useState<RoleDefinition>(() => {
    const primaryRoleCode =
      normalizedSessionRoles.find((r) => r === "SUPER_ADMIN" || r === "ADMIN") ||
      normalizedSessionRoles.find((r) => r !== "CUSTOMER") ||
      "ADMIN";
    const isTopAdmin = primaryRoleCode === "ADMIN" || primaryRoleCode === "SUPER_ADMIN";
    return {
      id: primaryRoleCode.toLowerCase(),
      name: isTopAdmin ? "Quản trị viên tối cao" : `Nhân sự (${primaryRoleCode})`,
      code: primaryRoleCode,
      description: isTopAdmin ? "Toàn quyền hệ thống" : "Quyền vận hành theo phân công",
      permissions: (session?.permissions || []) as PermissionKey[],
      isSystem: true,
    };
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
  const knownOrderPaymentMapRef = useRef<Map<string, string>>(new Map());
  const isInitialLoadRef = useRef(true);

  const currentActor = {
    name: session?.fullName || session?.username || "admin",
    email: session?.email || "admin@nhaxinh.com",
    role: currentRole.name,
  };

  // 1. Tải dữ liệu khung cơ sở (Core Shell) cho Admin Portal (Chỉ gọi 1 lần khi mount)
  useEffect(() => {
    async function loadCoreData() {
      try {
        const [loadedRoles, loadedPerms, loadedNotifs] = await Promise.all([
          adminApi.getRoles(),
          adminApi.getPermissions(),
          adminApi.getNotifications(),
        ]);

        if (loadedRoles && loadedRoles.length > 0) {
          const matchedRole =
            loadedRoles.find((r) =>
              normalizedSessionRoles.includes(String(r.code).toUpperCase())
            ) ||
            loadedRoles.find((r) => r.code === "ADMIN" || r.code === "SUPER_ADMIN") ||
            loadedRoles[0];
          setRoles(loadedRoles);
          setCurrentRole(matchedRole);
        }
        setPermissions(loadedPerms || []);
        setNotifications(loadedNotifs || []);
      } catch (err) {
        console.error("Error loading core admin data from API:", err);
      }
    }
    loadCoreData();
  }, [normalizedSessionRoles]);

  // 2. Tải dữ liệu theo nhu cầu (Lazy / On-Demand Loading) tối ưu hóa theo tab hiện hành
  useEffect(() => {
    async function loadTabData() {
      try {
        switch (activeTab) {
          case "dashboard": {
            const [loadedOrders, loadedProds, loadedCats, loadedLogs] = await Promise.all([
              adminApi.getOrders(),
              adminApi.getProducts(true),
              adminApi.getCategories(true),
              adminApi.getAuditLogs(),
            ]);
            setOrders(loadedOrders || []);
            if (loadedOrders && loadedOrders.length > 0) {
              loadedOrders.forEach((o) => {
                knownOrderIdsRef.current.add(String(o.id));
                knownOrderPaymentMapRef.current.set(String(o.id), o.paymentStatus || "unpaid");
              });
            }
            isInitialLoadRef.current = false;
            setProducts(loadedProds || []);
            setCategories(loadedCats || []);
            setAuditLogs(loadedLogs || []);
            break;
          }
          case "orders": {
            const [loadedOrders, loadedProds] = await Promise.all([
              adminApi.getOrders(),
              adminApi.getProducts(true),
            ]);
            setOrders(loadedOrders || []);
            if (loadedOrders && loadedOrders.length > 0) {
              loadedOrders.forEach((o) => {
                knownOrderIdsRef.current.add(String(o.id));
                knownOrderPaymentMapRef.current.set(String(o.id), o.paymentStatus || "unpaid");
              });
            }
            isInitialLoadRef.current = false;
            setProducts(loadedProds || []);
            break;
          }
          case "products":
          case "categories":
          case "collections": {
            const [loadedProds, loadedCats] = await Promise.all([
              adminApi.getProducts(true),
              adminApi.getCategories(true),
            ]);
            setProducts(loadedProds || []);
            setCategories(loadedCats || []);
            break;
          }
          case "roles": {
            const [loadedStaff, loadedRoles, loadedPerms] = await Promise.all([
              adminApi.getStaff(),
              adminApi.getRoles(),
              adminApi.getPermissions(),
            ]);
            setStaffList(loadedStaff || []);
            if (loadedRoles && loadedRoles.length > 0) setRoles(loadedRoles);
            setPermissions(loadedPerms || []);
            break;
          }
          case "discounts": {
            const loadedDiscs = await adminApi.getDiscounts();
            setDiscounts(loadedDiscs || []);
            break;
          }
          case "articles": {
            const loadedArts = await adminApi.getArticles();
            setArticles(loadedArts || []);
            break;
          }
          case "crm": {
            const loadedTickets = await adminApi.getTickets();
            setTickets(loadedTickets || []);
            break;
          }
          case "logs": {
            const loadedLogs = await adminApi.getAuditLogs();
            setAuditLogs(loadedLogs || []);
            break;
          }
          case "settings": {
            const loadedSettings = await adminApi.getSettings();
            setSettings(loadedSettings || INITIAL_SETTINGS);
            break;
          }
          default:
            break;
        }
      } catch (err) {
        console.error(`Error loading data for tab ${activeTab}:`, err);
      }
    }
    loadTabData();
  }, [activeTab]);

  // ── Polling ngầm phát hiện đơn hàng mới & phát thông báo hệ thống (Throttled & Tab Visibility Aware) ──
  useEffect(() => {
    // Xin quyền Browser Native Notification
    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "default") {
      Notification.requestPermission().catch(() => {});
    }

    const pollBackgroundTasks = async () => {
      // Tối ưu: Dừng polling khi tab browser đang bị ẩn/thu nhỏ để tiết kiệm băng thông và CPU máy chủ
      if (typeof document !== "undefined" && document.hidden) {
        return;
      }

      try {
        const latestOrders = await adminApi.getOrders(true);
        if (!latestOrders || latestOrders.length === 0) return;

        if (isInitialLoadRef.current || knownOrderIdsRef.current.size === 0) {
          latestOrders.forEach((o) => {
            knownOrderIdsRef.current.add(String(o.id));
            knownOrderPaymentMapRef.current.set(String(o.id), o.paymentStatus || "unpaid");
          });
          isInitialLoadRef.current = false;
          return;
        }

        const newlyArrivedOrders = latestOrders.filter(
          (o) => !knownOrderIdsRef.current.has(String(o.id))
        );

        // Phát hiện các đơn đã tồn tại vừa chuyển sang đã thanh toán (VNPAY/VietQR/Khách thanh toán)
        const newlyPaidOrders = latestOrders.filter((o) => {
          const prevPayment = knownOrderPaymentMapRef.current.get(String(o.id));
          return (
            knownOrderIdsRef.current.has(String(o.id)) &&
            prevPayment &&
            prevPayment !== "paid" &&
            o.paymentStatus === "paid"
          );
        });

        latestOrders.forEach((o) => {
          knownOrderPaymentMapRef.current.set(String(o.id), o.paymentStatus || "unpaid");
        });

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
              alertType: "customer_order",
            });
          }
        }

        if (newlyPaidOrders.length > 0) {
          setOrders(latestOrders);
          playNotificationSound();

          for (const paidOrd of newlyPaidOrders) {
            const customer = paidOrd.customerName || "Khách hàng";
            const totalStr = Number(paidOrd.total).toLocaleString("vi-VN") + " ₫";
            const itemCount = paidOrd.items ? paidOrd.items.length : 1;

            const notifTitle = `Thanh toán thành công #${paidOrd.orderCode}`;
            const notifMsg = `Đơn hàng #${paidOrd.orderCode} của ${customer} đã thanh toán thành công ${totalStr} qua ${paidOrd.paymentMethod || "Online"}.`;

            const createdNotif = await adminApi.createNotification({
              title: notifTitle,
              message: notifMsg,
              type: "order",
              target: "all",
            });

            setNotifications((prev) => [createdNotif, ...prev]);

            setNewOrderAlert({
              id: String(paidOrd.id),
              orderCode: paidOrd.orderCode,
              customerName: customer,
              total: Number(paidOrd.total) || 0,
              itemsCount: itemCount,
              createdAt: "Vừa xong",
              alertType: "payment_confirmed",
              paymentMethod: paidOrd.paymentMethod || "VNPAY / Chuyển khoản",
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
    };

    // Chu kỳ polling 30 giây (giảm 67% tần suất gọi so với 10s trước đây)
    const interval = setInterval(pollBackgroundTasks, 30000);

    // Kích hoạt cập nhật ngay khi người dùng chuyển lại tab Nhà Xinh
    const handleVisibilityChange = () => {
      if (typeof document !== "undefined" && !document.hidden) {
        void pollBackgroundTasks();
      }
    };

    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", handleVisibilityChange);
    }

    return () => {
      clearInterval(interval);
      if (typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", handleVisibilityChange);
      }
    };
  }, [handleSelectTab]);

  const tabTitles: Record<AdminViewTab, string> = {
    dashboard: "Bảng điều khiển & Doanh số",
    categories: "Cấu trúc danh mục phân cấp",
    collections: "Quản lý Bộ sưu tập thiết kế",
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
    const loaded = await adminApi.getAuditLogs(true);
    setAuditLogs(loaded);
  };

  const handleClearLogs = async () => {
    await adminApi.clearAuditLogs();
    setAuditLogs([]);
  };

  const handleSaveCategory = async (cat: Partial<AdminCategory>, imageFile?: File | null) => {
    await adminApi.saveCategory(cat, imageFile, currentActor);
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
    const isEdit = Boolean(prod.id);
    await adminApi.saveProduct(prod, currentActor);
    setProducts(await adminApi.getProducts(true));
    handleRefreshLogs();
    try {
      await adminApi.createNotification({
        title: isEdit ? "Cập nhật sản phẩm" : "Thêm mới sản phẩm",
        message: `${currentActor.name} vừa ${isEdit ? "cập nhật" : "thêm mới"} sản phẩm "${prod.name}"`,
        type: "system",
        target: "all",
      });
      setNotifications(await adminApi.getNotifications());
      playNotificationSound();
    } catch {
      // Bỏ qua lỗi phát chuông nếu trình duyệt chặn
    }
  };

  const handleDeleteProduct = async (id: number) => {
    const target = products.find((p) => p.id === id);
    await adminApi.softDeleteProduct(id, currentActor);
    setProducts(await adminApi.getProducts(true));
    handleRefreshLogs();
    try {
      await adminApi.createNotification({
        title: "Xóa sản phẩm vào thùng rác",
        message: `${currentActor.name} vừa xóa sản phẩm "${target?.name || id}" vào thùng rác`,
        type: "system",
        target: "all",
      });
      setNotifications(await adminApi.getNotifications());
      playNotificationSound();
    } catch {
      // Bỏ qua lỗi phát chuông
    }
  };

  const handleRestoreProduct = async (id: number) => {
    const target = products.find((p) => p.id === id);
    await adminApi.restoreProduct(id, currentActor);
    setProducts(await adminApi.getProducts(true));
    handleRefreshLogs();
    try {
      await adminApi.createNotification({
        title: "Khôi phục sản phẩm",
        message: `${currentActor.name} vừa khôi phục sản phẩm "${target?.name || id}" từ thùng rác`,
        type: "system",
        target: "all",
      });
      setNotifications(await adminApi.getNotifications());
      playNotificationSound();
    } catch {
      // Bỏ qua lỗi phát chuông
    }
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
  ): Promise<AdminOrder> => {
    const updated = await adminApi.updateOrderStatus(orderId, newStatus, currentActor.name, note, currentActor);
    setOrders((prev) =>
      prev.map((o) => (String(o.id) === String(orderId) ? { ...o, ...updated, isDeleted: o.isDeleted } : o))
    );
    void handleRefreshLogs();
    return updated;
  };

  const handleConfirmOrderPayment = async (
    orderId: string,
    paymentStatus = "paid",
    paymentMethod?: string,
    note?: string
  ): Promise<AdminOrder> => {
    const target = orders.find((o) => String(o.id) === String(orderId));
    const updated = await adminApi.confirmOrderPayment(orderId, currentActor, paymentStatus, paymentMethod, note);
    knownOrderPaymentMapRef.current.set(String(orderId), paymentStatus);
    setOrders((prev) =>
      prev.map((o) => (String(o.id) === String(orderId) ? { ...o, ...updated, isDeleted: o.isDeleted } : o))
    );
    void handleRefreshLogs();

    if (paymentStatus === "paid") {
      const resolvedOrd = updated || target;
      const code = resolvedOrd?.orderCode || orderId;
      const customer = resolvedOrd?.customerName || "Khách hàng";
      const totalNum = Number(resolvedOrd?.total) || 0;
      const methodStr = paymentMethod || resolvedOrd?.paymentMethod || "Chuyển khoản / VNPAY";

      void (async () => {
        try {
          playNotificationSound();
          const createdNotif = await adminApi.createNotification({
            title: `Đã xác nhận thanh toán #${code}`,
            message: `${currentActor.name} xác nhận thanh toán đơn #${code} (${customer} • ${totalNum.toLocaleString("vi-VN")} ₫) qua ${methodStr}.`,
            type: "order",
            target: "all",
          });
          setNotifications((prev) => [createdNotif, ...prev]);

          setNewOrderAlert({
            id: String(orderId),
            orderCode: String(code),
            customerName: customer,
            total: totalNum,
            itemsCount: resolvedOrd?.items?.length || 1,
            createdAt: "Vừa xong",
            alertType: "payment_confirmed",
            actorName: currentActor.name,
            paymentMethod: methodStr,
          });
        } catch {
          // ignore sound/notif error
        }
      })();
    }

    return updated;
  };

  const handleUpdateOrderShipping = async (
    orderId: string,
    data: { recipientName: string; recipientPhone: string; shippingAddress: string; customerNote?: string }
  ): Promise<AdminOrder> => {
    const updated = await adminApi.updateOrderShipping(orderId, data, currentActor);
    setOrders((prev) =>
      prev.map((o) => (String(o.id) === String(orderId) ? { ...o, ...updated, isDeleted: o.isDeleted } : o))
    );
    void handleRefreshLogs();
    return updated;
  };

  const handleCancelOrder = async (orderId: string, reason: string): Promise<AdminOrder> => {
    const updated = await adminApi.cancelOrder(orderId, reason, currentActor);
    setOrders((prev) =>
      prev.map((o) => (String(o.id) === String(orderId) ? { ...o, ...updated, isDeleted: o.isDeleted } : o))
    );
    void handleRefreshLogs();
    return updated;
  };

  const handleDeleteOrder = async (orderId: string) => {
    await adminApi.deleteOrder(orderId, currentActor);
    setOrders((prev) =>
      prev.map((o) => (String(o.id) === String(orderId) ? { ...o, isDeleted: true } : o))
    );
    void handleRefreshLogs();
  };

  const handleRestoreOrder = async (orderId: string) => {
    await adminApi.restoreOrder(orderId, currentActor);
    setOrders((prev) =>
      prev.map((o) => (String(o.id) === String(orderId) ? { ...o, isDeleted: false } : o))
    );
    void handleRefreshLogs();
  };

  const handleRefreshOrders = async () => {
    setOrders(await adminApi.getOrders(true));
  };

  const handleCreateOrder = async (orderData: Omit<AdminOrder, "id" | "statusHistory">) => {
    const created = await adminApi.createOrder(orderData, currentActor);
    knownOrderIdsRef.current.add(String(created.id));
    knownOrderPaymentMapRef.current.set(String(created.id), created.paymentStatus || "unpaid");
    setOrders((prev) => [created, ...prev]);
    handleRefreshLogs();

    try {
      playNotificationSound();
      const customer = created.customerName || "Khách hàng";
      const totalNum = Number(created.total) || 0;
      const itemCount = created.items ? created.items.length : 1;

      const createdNotif = await adminApi.createNotification({
        title: `NV tạo đơn mới #${created.orderCode}`,
        message: `${currentActor.name} vừa tạo đơn hàng #${created.orderCode} cho khách ${customer} (${totalNum.toLocaleString("vi-VN")} ₫ • ${itemCount} SP).`,
        type: "order",
        target: "all",
      });
      setNotifications((prev) => [createdNotif, ...prev]);

      setNewOrderAlert({
        id: String(created.id),
        orderCode: created.orderCode,
        customerName: customer,
        total: totalNum,
        itemsCount: itemCount,
        createdAt: "Vừa xong",
        alertType: "staff_order",
        actorName: currentActor.name,
        paymentMethod: created.paymentMethod,
      });
    } catch {
      // ignore sound/notif error
    }

    return created;
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

  const handleRestoreArticle = async (id: string) => {
    await adminApi.restoreArticle(id);
    setArticles(await adminApi.getArticles());
  };

  const handleToggleArticleStatus = async (id: string, status?: "published" | "hidden") => {
    await adminApi.toggleArticleStatus(id, status);
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
    handleDeleteOrder,
    handleRestoreOrder,
    handleRefreshOrders,
    handleCreateOrder,
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
    handleToggleArticleStatus,
    handleDeleteArticle,
    handleRestoreArticle,
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

