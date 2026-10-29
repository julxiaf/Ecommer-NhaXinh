// ══════════════════════════════════════════════════════════
// ADMIN VIEW: QUẢN LÝ GIAO DIỆN & TRANG CHỦ (CMS CLIENT)
// Cho phép Admin tùy biến Menu, Banner Hero và Pandora Suggestion
// ══════════════════════════════════════════════════════════

import { useState } from "react";
import {
  Menu,
  Image,
  Sparkles,
  Plus,
  Edit2,
  Trash2,
  ArrowUp,
  ArrowDown,
  RotateCcw,
  Save,
  CheckCircle2,
  ExternalLink,
  Eye,
  EyeOff,
  Sliders,
  Info
} from "lucide-react";
import {
  clientCmsService,
  type ClientMenuItem,
  type HeroBannerItem,
  type PandoraSuggestionConfig
} from "../../../services/clientCmsService";
import type { RoleDefinition } from "../../../services/admin/types";

interface ClientContentViewProps {
  currentRole?: RoleDefinition;
}

type CmsTab = "menu" | "banners" | "pandora";

export default function ClientContentView({ currentRole: _currentRole }: ClientContentViewProps) {
  const [activeTab, setActiveTab] = useState<CmsTab>("menu");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // ── States dữ liệu CMS ──
  const [menuItems, setMenuItems] = useState<ClientMenuItem[]>(() => clientCmsService.getMenuItems());
  const [banners, setBanners] = useState<HeroBannerItem[]>(() => clientCmsService.getHeroBanners());
  const [pandoraConfig, setPandoraConfig] = useState<PandoraSuggestionConfig>(() => clientCmsService.getPandoraConfig());

  // ── State Modals & Form ──
  // 1. Menu Modal
  const [menuModalOpen, setMenuModalOpen] = useState(false);
  const [editingMenuItem, setEditingMenuItem] = useState<ClientMenuItem | null>(null);
  const [menuForm, setMenuForm] = useState<Partial<ClientMenuItem>>({
    label: "",
    to: "",
    kind: "link",
    badge: "",
    isVisible: true,
  });

  // 2. Banner Modal
  const [bannerModalOpen, setBannerModalOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState<HeroBannerItem | null>(null);
  const [bannerForm, setBannerForm] = useState<Partial<HeroBannerItem>>({
    title: "",
    subtitle: "",
    description: "",
    backgroundImage: "",
    isActive: true,
    actions: [{ label: "Khám phá ngay", url: "/products", isPrimary: true }],
  });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // ══════════════════════════════════════════════════════════
  // XỬ LÝ MENU ITEMS
  // ══════════════════════════════════════════════════════════
  const handleOpenAddMenu = () => {
    setEditingMenuItem(null);
    setMenuForm({
      label: "",
      to: "/products",
      kind: "link",
      badge: "",
      isVisible: true,
    });
    setMenuModalOpen(true);
  };

  const handleOpenEditMenu = (item: ClientMenuItem) => {
    setEditingMenuItem(item);
    setMenuForm({ ...item });
    setMenuModalOpen(true);
  };

  const handleSaveMenuModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!menuForm.label || !menuForm.to) {
      alert("Vui lòng nhập tên hiển thị và đường dẫn URL.");
      return;
    }

    let updated: ClientMenuItem[];
    if (editingMenuItem) {
      updated = menuItems.map((m) =>
        m.id === editingMenuItem.id
          ? { ...m, ...menuForm, label: menuForm.label!, to: menuForm.to!, kind: menuForm.kind || "link" }
          : m
      );
    } else {
      const newItem: ClientMenuItem = {
        id: `nav-custom-${Date.now()}`,
        label: menuForm.label!,
        to: menuForm.to!,
        kind: menuForm.kind || "link",
        badge: menuForm.badge || undefined,
        isVisible: menuForm.isVisible ?? true,
        order: menuItems.length + 1,
      };
      updated = [...menuItems, newItem];
    }

    setMenuItems(updated);
    clientCmsService.saveMenuItems(updated);
    setMenuModalOpen(false);
    showToast("Đã lưu thay đổi mục Menu thành công!");
  };

  const handleDeleteMenu = (id: string) => {
    if (window.confirm("Bạn có chắc chắn muốn xóa mục menu này?")) {
      const updated = menuItems.filter((m) => m.id !== id);
      setMenuItems(updated);
      clientCmsService.saveMenuItems(updated);
      showToast("Đã xóa mục menu.");
    }
  };

  const handleMoveMenu = (index: number, direction: "up" | "down") => {
    const newItems = [...menuItems];
    const targetIdx = direction === "up" ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= newItems.length) return;

    const temp = newItems[index];
    newItems[index] = newItems[targetIdx];
    newItems[targetIdx] = temp;

    // Cập nhật lại order
    newItems.forEach((item, idx) => {
      item.order = idx + 1;
    });

    setMenuItems(newItems);
    clientCmsService.saveMenuItems(newItems);
    showToast("Đã cập nhật thứ tự Menu.");
  };

  const handleToggleMenuVisible = (id: string) => {
    const updated = menuItems.map((m) =>
      m.id === id ? { ...m, isVisible: !m.isVisible } : m
    );
    setMenuItems(updated);
    clientCmsService.saveMenuItems(updated);
    showToast("Đã cập nhật trạng thái hiển thị Menu.");
  };

  const handleResetMenuDefault = () => {
    if (window.confirm("Khôi phục danh sách Menu về thiết lập mặc định của Nhà Xinh?")) {
      const reset = clientCmsService.resetMenuItems();
      setMenuItems(reset);
      showToast("Đã khôi phục Menu về mặc định.");
    }
  };

  // ══════════════════════════════════════════════════════════
  // XỬ LÝ HERO BANNERS
  // ══════════════════════════════════════════════════════════
  const handleOpenAddBanner = () => {
    setEditingBanner(null);
    setBannerForm({
      title: "Bộ Sưu Tập Mới",
      subtitle: "XU HƯỚNG 2024",
      description: "Đường nét tinh tế mang cảm hứng phong cách sống đương đại.",
      backgroundImage: "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1200&q=80",
      isActive: true,
      actions: [{ label: "Khám phá ngay", url: "/bo-suu-tap", isPrimary: true }],
    });
    setBannerModalOpen(true);
  };

  const handleOpenEditBanner = (banner: HeroBannerItem) => {
    setEditingBanner(banner);
    setBannerForm({ ...banner, actions: [...banner.actions] });
    setBannerModalOpen(true);
  };

  const handleSaveBannerModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bannerForm.title || !bannerForm.backgroundImage) {
      alert("Vui lòng nhập tiêu đề và link ảnh nền banner.");
      return;
    }

    let updated: HeroBannerItem[];
    if (editingBanner) {
      updated = banners.map((b) =>
        b.id === editingBanner.id
          ? {
              ...b,
              ...bannerForm,
              title: bannerForm.title!,
              subtitle: bannerForm.subtitle || "",
              description: bannerForm.description || "",
              backgroundImage: bannerForm.backgroundImage!,
              actions: bannerForm.actions || [{ label: "Xem chi tiết", url: "/products" }],
              isActive: bannerForm.isActive ?? true,
            }
          : b
      );
    } else {
      const newBanner: HeroBannerItem = {
        id: `banner-${Date.now()}`,
        title: bannerForm.title!,
        subtitle: bannerForm.subtitle || "",
        description: bannerForm.description || "",
        backgroundImage: bannerForm.backgroundImage!,
        actions: bannerForm.actions || [{ label: "Xem chi tiết", url: "/products" }],
        isActive: bannerForm.isActive ?? true,
        order: banners.length + 1,
      };
      updated = [...banners, newBanner];
    }

    setBanners(updated);
    clientCmsService.saveHeroBanners(updated);
    setBannerModalOpen(false);
    showToast("Đã lưu slide Hero Banner thành công!");
  };

  const handleDeleteBanner = (id: string) => {
    if (banners.length <= 1) {
      alert("Hệ thống cần tối thiểu 1 banner đang hoạt động.");
      return;
    }
    if (window.confirm("Bạn có chắc chắn muốn xóa slide banner này?")) {
      const updated = banners.filter((b) => b.id !== id);
      setBanners(updated);
      clientCmsService.saveHeroBanners(updated);
      showToast("Đã xóa slide banner.");
    }
  };

  const handleMoveBanner = (index: number, direction: "up" | "down") => {
    const newBanners = [...banners];
    const targetIdx = direction === "up" ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= newBanners.length) return;

    const temp = newBanners[index];
    newBanners[index] = newBanners[targetIdx];
    newBanners[targetIdx] = temp;

    newBanners.forEach((b, idx) => {
      b.order = idx + 1;
    });

    setBanners(newBanners);
    clientCmsService.saveHeroBanners(newBanners);
    showToast("Đã cập nhật thứ tự slide Banner.");
  };

  const handleToggleBannerActive = (id: string) => {
    const updated = banners.map((b) =>
      b.id === id ? { ...b, isActive: !b.isActive } : b
    );
    setBanners(updated);
    clientCmsService.saveHeroBanners(updated);
    showToast("Đã cập nhật trạng thái hiển thị Banner.");
  };

  const handleResetBannersDefault = () => {
    if (window.confirm("Khôi phục toàn bộ Banner Hero về mặc định?")) {
      const reset = clientCmsService.resetHeroBanners();
      setBanners(reset);
      showToast("Đã khôi phục Banner Hero về mặc định.");
    }
  };

  // ══════════════════════════════════════════════════════════
  // XỬ LÝ PANDORA SUGGESTION
  // ══════════════════════════════════════════════════════════
  const handleSavePandoraGeneral = (e: React.FormEvent) => {
    e.preventDefault();
    clientCmsService.savePandoraConfig(pandoraConfig);
    showToast("Đã lưu cấu hình chung Pandora Suggestion!");
  };

  const handleResetPandoraDefault = () => {
    if (window.confirm("Khôi phục cấu hình Pandora Suggestion về mặc định ban đầu?")) {
      const reset = clientCmsService.resetPandoraConfig();
      setPandoraConfig(reset);
      showToast("Đã khôi phục Pandora Suggestion về mặc định.");
    }
  };

  return (
    <div className="admin-cms-view p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* ── TOAST ALERT ── */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-100 flex items-center gap-2 bg-emerald-700 text-white px-5 py-3 rounded-xl shadow-xl animate-in slide-in-from-top-3">
          <CheckCircle2 size={18} />
          <span className="text-sm font-medium">{toastMessage}</span>
        </div>
      )}

      {/* ── HEADER PHÂN HỆ CMS ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 pb-5">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2.5">
            <Sliders className="text-[#B86B49]" size={26} />
            <span>Quản lý Giao diện & Trang chủ (CMS)</span>
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Tùy biến thanh Menu điều hướng, trình chiếu Hero Banner và phân hệ Gợi ý Pandora trên giao diện khách hàng.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <a
            href="/"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <ExternalLink size={14} />
            <span>Xem trang Client</span>
          </a>
        </div>
      </div>

      {/* ── TABS NAVIGATION ── */}
      <div className="flex border-b border-gray-200 space-x-2 sm:space-x-4">
        <button
          type="button"
          onClick={() => setActiveTab("menu")}
          className={`pb-3 px-3 sm:px-4 text-xs sm:text-sm font-semibold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
            activeTab === "menu"
              ? "border-[#B86B49] text-[#B86B49]"
              : "border-transparent text-gray-500 hover:text-gray-900"
          }`}
        >
          <Menu size={16} />
          <span>Thanh Menu Điều Hướng</span>
          <span className="ml-1.5 px-2 py-0.5 rounded-full text-[11px] bg-gray-100 text-gray-600 font-bold">
            {menuItems.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("banners")}
          className={`pb-3 px-3 sm:px-4 text-xs sm:text-sm font-semibold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
            activeTab === "banners"
              ? "border-[#B86B49] text-[#B86B49]"
              : "border-transparent text-gray-500 hover:text-gray-900"
          }`}
        >
          <Image size={16} />
          <span>Hero Banner Trang Chủ</span>
          <span className="ml-1.5 px-2 py-0.5 rounded-full text-[11px] bg-gray-100 text-gray-600 font-bold">
            {banners.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("pandora")}
          className={`pb-3 px-3 sm:px-4 text-xs sm:text-sm font-semibold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
            activeTab === "pandora"
              ? "border-[#B86B49] text-[#B86B49]"
              : "border-transparent text-gray-500 hover:text-gray-900"
          }`}
        >
          <Sparkles size={16} />
          <span>Gợi Ý Pandora Suggestion</span>
          {pandoraConfig.isEnabled ? (
            <span className="ml-1.5 px-2 py-0.5 rounded-full text-[11px] bg-emerald-100 text-emerald-700 font-bold">
              Bật
            </span>
          ) : (
            <span className="ml-1.5 px-2 py-0.5 rounded-full text-[11px] bg-gray-100 text-gray-500 font-bold">
              Tắt
            </span>
          )}
        </button>
      </div>

      {/* ══════════════════════════════════════════════════════════
          TAB 1: THANH MENU ĐIỀU HƯỚNG
          ══════════════════════════════════════════════════════════ */}
      {activeTab === "menu" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-stone-50 p-4 rounded-xl border border-stone-200">
            <div className="flex items-center gap-2 text-xs text-stone-600">
              <Info size={16} className="text-[#B86B49] shrink-0" />
              <span>
                Thanh menu được đồng bộ tức thì lên Header của khách hàng. Bạn có thể kéo đổi thứ tự hoặc bật/tắt hiển thị từng mục.
              </span>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={handleResetMenuDefault}
                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-stone-700 bg-white hover:bg-stone-100 border border-stone-300 rounded-lg transition-colors cursor-pointer"
              >
                <RotateCcw size={14} />
                <span>Khôi phục mặc định</span>
              </button>

              <button
                type="button"
                onClick={handleOpenAddMenu}
                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#B86B49] hover:bg-[#9E5738] rounded-lg transition-colors shadow-sm cursor-pointer"
              >
                <Plus size={15} />
                <span>Thêm mục Menu mới</span>
              </button>
            </div>
          </div>

          {/* Bảng danh sách Menu */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 font-bold uppercase text-[11px] tracking-wider">
                  <tr>
                    <th className="py-3 px-4 w-16 text-center">STT</th>
                    <th className="py-3 px-4">Tên mục Menu</th>
                    <th className="py-3 px-4">Đường dẫn liên kết</th>
                    <th className="py-3 px-4">Kiểu hiển thị</th>
                    <th className="py-3 px-4">Huy hiệu (Badge)</th>
                    <th className="py-3 px-4 text-center">Hiển thị</th>
                    <th className="py-3 px-4 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {menuItems.map((item, index) => (
                    <tr key={item.id} className="hover:bg-stone-50/70 transition-colors">
                      <td className="py-3.5 px-4 text-center font-bold text-gray-500">
                        {index + 1}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-gray-900">
                        {item.label}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-xs text-blue-600">
                        {item.to}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-block px-2.5 py-1 rounded-md text-[11px] font-bold ${
                          item.kind === "link"
                            ? "bg-gray-100 text-gray-700"
                            : item.kind === "products"
                            ? "bg-amber-100 text-amber-800"
                            : item.kind === "rooms"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-purple-100 text-purple-800"
                        }`}>
                          {item.kind === "link" && "Liên kết thường"}
                          {item.kind === "products" && "MegaMenu Sản Phẩm"}
                          {item.kind === "rooms" && "MegaMenu Không Gian Phòng"}
                          {item.kind === "brands" && "MegaMenu Thương Hiệu"}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        {item.badge ? (
                          <span className="px-2 py-0.5 rounded-full bg-[#d26e4b] text-white text-[10px] font-bold">
                            {item.badge}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-xs">—</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleMenuVisible(item.id)}
                          className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                            item.isVisible
                              ? "text-emerald-600 hover:bg-emerald-50"
                              : "text-gray-400 hover:bg-gray-100"
                          }`}
                          title={item.isVisible ? "Đang bật (Bấm để ẩn)" : "Đang ẩn (Bấm để hiện)"}
                        >
                          {item.isVisible ? <Eye size={18} /> : <EyeOff size={18} />}
                        </button>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => handleMoveMenu(index, "up")}
                            disabled={index === 0}
                            className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-20 cursor-pointer"
                            title="Di chuyển lên"
                          >
                            <ArrowUp size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMoveMenu(index, "down")}
                            disabled={index === menuItems.length - 1}
                            className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-20 cursor-pointer"
                            title="Di chuyển xuống"
                          >
                            <ArrowDown size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenEditMenu(item)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md cursor-pointer ml-1"
                            title="Chỉnh sửa"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteMenu(item.id)}
                            className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-md cursor-pointer"
                            title="Xóa"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          TAB 2: HERO BANNER TRANG CHỦ
          ══════════════════════════════════════════════════════════ */}
      {activeTab === "banners" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-stone-50 p-4 rounded-xl border border-stone-200">
            <div className="flex items-center gap-2 text-xs text-stone-600">
              <Info size={16} className="text-[#B86B49] shrink-0" />
              <span>
                Các slide banner đầu trang chủ. Hỗ trợ hình ảnh chất lượng cao, tiêu đề lớn, phụ đề và các nút kêu gọi hành động (CTA).
              </span>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={handleResetBannersDefault}
                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-stone-700 bg-white hover:bg-stone-100 border border-stone-300 rounded-lg transition-colors cursor-pointer"
              >
                <RotateCcw size={14} />
                <span>Khôi phục mặc định</span>
              </button>

              <button
                type="button"
                onClick={handleOpenAddBanner}
                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#B86B49] hover:bg-[#9E5738] rounded-lg transition-colors shadow-sm cursor-pointer"
              >
                <Plus size={15} />
                <span>Thêm Slide Banner</span>
              </button>
            </div>
          </div>

          {/* Danh sách Hero Banners */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {banners.map((banner, index) => (
              <div
                key={banner.id}
                className={`bg-white rounded-xl border overflow-hidden shadow-xs flex flex-col transition-all ${
                  banner.isActive ? "border-gray-200" : "border-gray-200 opacity-60 bg-gray-50"
                }`}
              >
                {/* Banner Thumbnail Preview */}
                <div className="relative h-44 bg-stone-900 overflow-hidden">
                  <img
                    src={banner.backgroundImage}
                    alt={banner.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent p-4 flex flex-col justify-end text-white">
                    <span className="text-[10px] font-bold tracking-widest uppercase text-amber-400">
                      {banner.subtitle || "BANNER"}
                    </span>
                    <h4 className="text-lg font-bold leading-tight line-clamp-1">
                      {banner.title}
                    </h4>
                    <p className="text-xs text-gray-300 line-clamp-1 mt-0.5">
                      {banner.description}
                    </p>
                  </div>

                  <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-xs text-white text-[11px] font-mono">
                    Slide #{index + 1}
                  </span>

                  <span className={`absolute top-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    banner.isActive ? "bg-emerald-500 text-white" : "bg-gray-500 text-white"
                  }`}>
                    {banner.isActive ? "Đang bật" : "Tạm ẩn"}
                  </span>
                </div>

                {/* Banner Card Body */}
                <div className="p-4 flex-1 flex flex-col justify-between">
                  <div className="space-y-2 mb-3">
                    <div className="text-xs text-gray-500 flex items-center gap-1.5">
                      <span className="font-semibold text-gray-700">Nút hành động:</span>
                      {banner.actions.map((act, i) => (
                        <span key={i} className="px-2 py-0.5 rounded bg-stone-100 text-stone-800 text-[11px]">
                          {act.label} → {act.url}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleMoveBanner(index, "up")}
                        disabled={index === 0}
                        className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-20 cursor-pointer"
                        title="Đẩy lên trước"
                      >
                        <ArrowUp size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveBanner(index, "down")}
                        disabled={index === banners.length - 1}
                        className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-20 cursor-pointer"
                        title="Đẩy xuống sau"
                      >
                        <ArrowDown size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleBannerActive(banner.id)}
                        className={`p-1 ml-2 text-xs font-semibold rounded cursor-pointer ${
                          banner.isActive ? "text-gray-500 hover:text-gray-700" : "text-emerald-600 font-bold"
                        }`}
                      >
                        {banner.isActive ? "Tạm ẩn slide" : "Kích hoạt slide"}
                      </button>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleOpenEditBanner(banner)}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md cursor-pointer"
                        title="Chỉnh sửa slide"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteBanner(banner.id)}
                        className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-md cursor-pointer"
                        title="Xóa slide"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          TAB 3: GỢI Ý SẢN PHẨM PANDORA (PANDORA SUGGESTION)
          ══════════════════════════════════════════════════════════ */}
      {activeTab === "pandora" && (
        <div className="space-y-6">
          {/* Cấu hình tổng quan Pandora */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-xs">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-gray-100 pb-4 mb-4">
              <div>
                <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <Sparkles size={18} className="text-[#B86B49]" />
                  <span>Cấu hình khối Pandora Suggestion (Dưới Bộ sưu tập)</span>
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Phân hệ nằm ngay dưới Bộ sưu tập trên trang chủ, giới thiệu các sản phẩm tuyển chọn cao cấp.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleResetPandoraDefault}
                  className="px-3 py-1.5 text-xs font-semibold text-stone-600 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors cursor-pointer"
                >
                  Khôi phục mặc định
                </button>

                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={pandoraConfig.isEnabled}
                    onChange={(e) => {
                      const updated = { ...pandoraConfig, isEnabled: e.target.checked };
                      setPandoraConfig(updated);
                      clientCmsService.savePandoraConfig(updated);
                      showToast(e.target.checked ? "Đã bật khối Pandora Suggestion." : "Đã tắt khối Pandora Suggestion.");
                    }}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#B86B49]"></div>
                  <span className="ml-2.5 text-xs font-bold text-gray-700">
                    {pandoraConfig.isEnabled ? "Đang Bật hiển thị" : "Đang Tắt"}
                  </span>
                </label>
              </div>
            </div>

            <form onSubmit={handleSavePandoraGeneral} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Huy hiệu nhỏ (Badge Title)
                </label>
                <input
                  type="text"
                  value={pandoraConfig.badgeTitle}
                  onChange={(e) => setPandoraConfig({ ...pandoraConfig, badgeTitle: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:border-[#B86B49] focus:outline-none"
                  placeholder="Ví dụ: PANDORA EXCLUSIVE SUGGESTION"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Tiêu đề chính khối (Main Title)
                </label>
                <input
                  type="text"
                  value={pandoraConfig.mainTitle}
                  onChange={(e) => setPandoraConfig({ ...pandoraConfig, mainTitle: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:border-[#B86B49] focus:outline-none"
                  placeholder="Ví dụ: Gợi Ý Không Gian Tinh Tế Dành Riêng Cho Bạn"
                  required
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Mô tả phụ (Subtitle)
                </label>
                <textarea
                  rows={2}
                  value={pandoraConfig.subtitle}
                  onChange={(e) => setPandoraConfig({ ...pandoraConfig, subtitle: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:border-[#B86B49] focus:outline-none"
                  placeholder="Mô tả truyền cảm hứng..."
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Số lượng sản phẩm lấy từ API Backend (Limit)
                </label>
                <select
                  value={pandoraConfig.apiLimit || 8}
                  onChange={(e) => setPandoraConfig({ ...pandoraConfig, apiLimit: Number(e.target.value) })}
                  className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:border-[#B86B49] focus:outline-none bg-white font-semibold"
                >
                  <option value={4}>4 sản phẩm (1 hàng)</option>
                  <option value={8}>8 sản phẩm (2 hàng - Khuyến nghị)</option>
                  <option value={12}>12 sản phẩm (3 hàng)</option>
                  <option value={16}>16 sản phẩm (4 hàng)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Các thẻ lọc phong cách (Phân cách bằng dấu phẩy)
                </label>
                <input
                  type="text"
                  value={(pandoraConfig.curatedTagFilter || []).join(", ")}
                  onChange={(e) => {
                    const tags = e.target.value
                      .split(",")
                      .map((t) => t.trim())
                      .filter(Boolean);
                    setPandoraConfig({ ...pandoraConfig, curatedTagFilter: tags });
                  }}
                  className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:border-[#B86B49] focus:outline-none"
                  placeholder="Tất cả, Sofa, Bàn, Ghế, Giường, Tủ"
                />
              </div>

              <div className="md:col-span-2 flex justify-end">
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-[#B86B49] hover:bg-[#9E5738] rounded-lg transition-colors cursor-pointer"
                >
                  <Save size={14} />
                  <span>Lưu cấu hình Pandora</span>
                </button>
              </div>
            </form>
          </div>

          {/* Trạng thái tích hợp API & Chuẩn ProductCard */}
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/80 rounded-xl p-5 shadow-xs">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-lg bg-amber-100 text-[#B86B49] shrink-0">
                <Sparkles size={20} />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-gray-900">
                  Dữ liệu Sản phẩm Tự Động Kết Nối API Backend & Chuẩn Product Card
                </h4>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Phân hệ Pandora Suggestion trên trang chủ đã được cấu hình gọi trực tiếp từ <strong>Backend API Sản phẩm (`/api/v1/catalog/products`)</strong>.
                  Từng sản phẩm hiển thị chuẩn theo thẻ <strong>`ProductCard`</strong> của Nhà Xinh với đầy đủ:
                </p>
                <ul className="text-xs text-gray-700 list-disc list-inside mt-2 space-y-1">
                  <li>Tự động chuyển đổi ảnh thứ 2 (`image2`) khi khách hàng rê chuột.</li>
                  <li>Huy hiệu trạng thái: <strong>Mới</strong>, <strong>Đặt trước</strong>, <strong>Hết hàng</strong>, và % giảm giá thực tế từ hệ thống.</li>
                  <li>Bộ nút tương tác nhanh: Thêm vào danh sách Yêu thích, Thêm ngay vào giỏ hàng, và Xem trang chi tiết.</li>
                  <li>Bộ lọc Tab động gửi tham số trực tiếp tới API để lấy danh sách tương ứng.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          MODAL 1: THÊM / SỬA MỤC MENU
          ══════════════════════════════════════════════════════════ */}
      {menuModalOpen && (
        <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-md bg-white rounded-2xl p-6 shadow-2xl border border-gray-200">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              {editingMenuItem ? "Chỉnh sửa mục Menu" : "Thêm mục Menu mới"}
            </h3>

            <form onSubmit={handleSaveMenuModal} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Tên hiển thị trên Menu *
                </label>
                <input
                  type="text"
                  value={menuForm.label}
                  onChange={(e) => setMenuForm({ ...menuForm, label: e.target.value })}
                  placeholder="Ví dụ: Khuyến mãi Tết, Sofa Ý..."
                  className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:border-[#B86B49] focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Đường dẫn (URL / To) *
                </label>
                <input
                  type="text"
                  value={menuForm.to}
                  onChange={(e) => setMenuForm({ ...menuForm, to: e.target.value })}
                  placeholder="Ví dụ: /products, /khuyen-mai..."
                  className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:border-[#B86B49] focus:outline-none font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Kiểu menu
                </label>
                <select
                  value={menuForm.kind}
                  onChange={(e) => setMenuForm({ ...menuForm, kind: e.target.value as any })}
                  className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:border-[#B86B49] focus:outline-none bg-white"
                >
                  <option value="link">Liên kết thường (Chuyển trang trực tiếp)</option>
                  <option value="products">MegaMenu Sản Phẩm (Sổ bảng phân loại sản phẩm)</option>
                  <option value="rooms">MegaMenu Phòng (Sổ danh sách các phòng)</option>
                  <option value="brands">MegaMenu Thương Hiệu (Sổ các hãng hợp tác)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Huy hiệu đính kèm (Badge - tùy chọn)
                </label>
                <input
                  type="text"
                  value={menuForm.badge || ""}
                  onChange={(e) => setMenuForm({ ...menuForm, badge: e.target.value })}
                  placeholder="Ví dụ: Mới, Hot, Sale..."
                  className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:border-[#B86B49] focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="menuVisibleCheck"
                  checked={menuForm.isVisible ?? true}
                  onChange={(e) => setMenuForm({ ...menuForm, isVisible: e.target.checked })}
                  className="rounded text-[#B86B49] focus:ring-[#B86B49]"
                />
                <label htmlFor="menuVisibleCheck" className="text-xs font-semibold text-gray-700 cursor-pointer">
                  Hiển thị mục menu này ngay trên thanh điều hướng
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setMenuModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-[#B86B49] hover:bg-[#9E5738] rounded-lg transition-colors cursor-pointer"
                >
                  {editingMenuItem ? "Cập nhật Menu" : "Thêm vào Menu"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          MODAL 2: THÊM / SỬA HERO BANNER
          ══════════════════════════════════════════════════════════ */}
      {bannerModalOpen && (
        <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in overflow-y-auto">
          <div className="w-full max-w-lg bg-white rounded-2xl p-6 shadow-2xl border border-gray-200 my-8">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              {editingBanner ? "Chỉnh sửa Slide Hero Banner" : "Thêm Slide Banner Mới"}
            </h3>

            <form onSubmit={handleSaveBannerModal} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Tiêu đề lớn (Title) *
                </label>
                <input
                  type="text"
                  value={bannerForm.title}
                  onChange={(e) => setBannerForm({ ...bannerForm, title: e.target.value })}
                  placeholder="Ví dụ: Victoria, Nét Đương Đại..."
                  className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:border-[#B86B49] focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Phụ đề nhỏ phía trên (Subtitle)
                </label>
                <input
                  type="text"
                  value={bannerForm.subtitle}
                  onChange={(e) => setBannerForm({ ...bannerForm, subtitle: e.target.value })}
                  placeholder="Ví dụ: BỘ SƯU TẬP MỚI, PHÒNG KHÁCH..."
                  className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:border-[#B86B49] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Mô tả ngắn
                </label>
                <textarea
                  rows={2}
                  value={bannerForm.description}
                  onChange={(e) => setBannerForm({ ...bannerForm, description: e.target.value })}
                  placeholder="Mô tả truyền cảm hứng xuất hiện trên slide..."
                  className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:border-[#B86B49] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Đường dẫn ảnh nền (Image URL) *
                </label>
                <input
                  type="text"
                  value={bannerForm.backgroundImage}
                  onChange={(e) => setBannerForm({ ...bannerForm, backgroundImage: e.target.value })}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:border-[#B86B49] focus:outline-none font-mono"
                  required
                />
                {bannerForm.backgroundImage && (
                  <div className="mt-2 h-24 rounded-lg overflow-hidden border border-gray-200">
                    <img
                      src={bannerForm.backgroundImage}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
              </div>

              {/* Nút hành động 1 */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Nhãn nút CTA 1
                  </label>
                  <input
                    type="text"
                    value={bannerForm.actions?.[0]?.label || ""}
                    onChange={(e) => {
                      const acts = [...(bannerForm.actions || [])];
                      if (!acts[0]) acts[0] = { label: "", url: "" };
                      acts[0].label = e.target.value;
                      setBannerForm({ ...bannerForm, actions: acts });
                    }}
                    placeholder="Khám phá ngay"
                    className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:border-[#B86B49] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Đường dẫn nút CTA 1
                  </label>
                  <input
                    type="text"
                    value={bannerForm.actions?.[0]?.url || ""}
                    onChange={(e) => {
                      const acts = [...(bannerForm.actions || [])];
                      if (!acts[0]) acts[0] = { label: "", url: "" };
                      acts[0].url = e.target.value;
                      setBannerForm({ ...bannerForm, actions: acts });
                    }}
                    placeholder="/bo-suu-tap/victoria"
                    className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:border-[#B86B49] focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="bannerActiveCheck"
                  checked={bannerForm.isActive ?? true}
                  onChange={(e) => setBannerForm({ ...bannerForm, isActive: e.target.checked })}
                  className="rounded text-[#B86B49] focus:ring-[#B86B49]"
                />
                <label htmlFor="bannerActiveCheck" className="text-xs font-semibold text-gray-700 cursor-pointer">
                  Kích hoạt hiển thị slide này trên Hero Banner
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setBannerModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-[#B86B49] hover:bg-[#9E5738] rounded-lg transition-colors cursor-pointer"
                >
                  {editingBanner ? "Cập nhật Slide" : "Lưu Slide Banner"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
