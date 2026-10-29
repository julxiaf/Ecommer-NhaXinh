import {
  ShieldCheck, Plus, Search, Edit3, Trash2, Eye,
  Save, RefreshCw, Type, Sparkles,
  FileText, Layout, AlertCircle, ArrowLeft,
  Bold, Italic, Underline, Strikethrough,
  Heading2, Heading3, List, ListOrdered,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  Quote,  Code, Columns, CheckCircle2,
  Sliders
} from "lucide-react";
import type { RoleDefinition } from "../../../services/admin/types";
import PermissionGate from "../../../components/admin/PermissionGate";
import { AdminPagination } from "../../../components/admin/AdminPagination";
import { useAdminPolicies } from "../../../hooks/admin/useAdminPolicies";

interface PolicyAdminViewProps {
  currentRole: RoleDefinition;
}

// ── Danh mục Font chuẩn thiết kế theo yêu cầu cá nhân ──
export const FONT_OPTIONS = [
  { id: "Be Vietnam Pro, sans-serif", name: "Be Vietnam Pro", desc: "Hiện đại, chuẩn chữ Việt hoàn hảo", family: "'Be Vietnam Pro', sans-serif" },
  { id: "Playfair Display, serif", name: "Playfair Display", desc: "Sang trọng, phong cách tạp chí Ý thượng lưu", family: "'Playfair Display', serif" },
  { id: "Inter, sans-serif", name: "Inter", desc: "Tối giản, công nghệ sắc nét", family: "'Inter', sans-serif" },
  { id: "Montserrat, sans-serif", name: "Montserrat", desc: "Mạnh mẽ, phong cách kiến trúc không gian", family: "'Montserrat', sans-serif" },
  { id: "Merriweather, serif", name: "Merriweather", desc: "Cổ điển, ấm áp, trang trọng", family: "'Merriweather', serif" },
  { id: "Lora, serif", name: "Lora", desc: "Nhẹ nhàng, thư thái, cảm xúc", family: "'Lora', serif" },
  { id: "Roboto, sans-serif", name: "Roboto", desc: "Trung tính, rõ ràng, dễ tiếp cận", family: "'Roboto', sans-serif" },
];

export const FONT_SIZES = [
  { id: "14px", label: "Nhỏ (14px)" },
  { id: "15px", label: "Tiêu chuẩn (15px)" },
  { id: "16px", label: "Thoáng đãng (16px)" },
  { id: "18px", label: "Lớn & Nổi bật (18px)" },
];

export const LINE_HEIGHTS = [
  { id: "1.6", label: "Gọn gàng (1.6)" },
  { id: "1.75", label: "Chuẩn vàng (1.75)" },
  { id: "2.0", label: "Rộng rãi (2.0)" },
];

export const ACCENT_COLORS = [
  { hex: "#b38e5d", name: "Vàng đồng Nhà Xinh" },
  { hex: "#1e3a8a", name: "Xanh Navy Hoàng Gia" },
  { hex: "#047857", name: "Xanh Rừng Nhiệt Đới" },
  { hex: "#b91c1c", name: "Đỏ Rượu Vang" },
  { hex: "#0f172a", name: "Đen Than Thượng Hạng" },
];

// ── Kho mẫu chính sách nội thất chuẩn mực (Tự do sáng mẫu) ──
export const POLICY_TEMPLATES = [
  {
    type: "return",
    name: "Chính sách Đổi trả & Hoàn tiền tiêu chuẩn",
    shortTitle: "Đổi trả hàng",
    badge: "Phổ biến nhất",
    intro: "Nhà Xinh cam kết mang đến trải nghiệm hài lòng tuyệt đối. Nếu sản phẩm giao đến không vừa vặn kích thước hoặc phát sinh lỗi do nhà sản xuất, quý khách được hỗ trợ đổi mới nhanh chóng trong 03 ngày làm việc.",
    content: `<h3>1. Các trường hợp chấp nhận đổi trả</h3>
<p>• Sản phẩm không thể đưa vào nhà do kích thước cửa hẹp, cầu thang nhỏ hoặc trần thấp (chuyên viên kỹ thuật sẽ kiểm tra và lập biên bản ngay lúc bàn giao).<br/>
• Hàng giao không đúng mẫu mã, màu sắc da/vải, kích thước so với đơn đặt hàng đã ký.<br/>
• Sản phẩm có lỗi gia công khung gỗ, ray trượt phụ kiện hoặc trầy xước trong quá trình bốc xếp.</p>

<h3>2. Điều kiện áp dụng đổi trả</h3>
<p>• Thời gian gửi yêu cầu trong vòng <strong>03 ngày</strong> kể từ thời điểm ký biên bản nghiệm thu.<br/>
• Sản phẩm còn nguyên hiện trạng, chưa qua sử dụng, kèm hóa đơn mua hàng và phiếu bảo hành điện tử.<br/>
• Không áp dụng đổi trả với sản phẩm giảm giá đặc biệt trên 40% hoặc hàng thanh lý xả kho.</p>

<h3>3. Chi phí và thời gian hoàn trả</h3>
<p>• <strong>Miễn phí 100%</strong> chi phí vận chuyển thu hồi nếu lỗi thuộc về Nhà Xinh.<br/>
• Đổi mới sản phẩm khác: Thời gian bàn giao từ 2 - 5 ngày làm việc tùy thuộc vào kho hàng khu vực.<br/>
• Hoàn tiền qua tài khoản: Tiền được hoàn trả trong vòng 3 - 7 ngày làm việc kể từ khi nhận lại hàng.</p>`,
  },
  {
    type: "shipping",
    name: "Chính sách Vận chuyển & Giao lắp White-glove",
    shortTitle: "Vận chuyển & Lắp đặt",
    badge: "Dịch vụ tận tâm",
    intro: "Dịch vụ giao nhận White-glove độc quyền của Nhà Xinh mang lại sự an tâm tuyệt đối: Giao đúng hẹn, vận chuyển cẩn trọng, lắp đặt hoàn thiện và dọn dẹp bao bì sạch sẽ trước khi rời đi.",
    content: `<h3>1. Thời gian bàn giao đơn hàng</h3>
<p>• Khu vực nội thành TP.HCM & Hà Nội: Giao hàng trong vòng <strong>24h - 48h</strong> kể từ thời điểm chốt lịch hẹn.<br/>
• Các tỉnh lân cận (Đồng Nai, Bình Dương, Bắc Ninh, Hưng Yên...): Bàn giao trong vòng <strong>3 - 7 ngày</strong> theo lộ trình xe chuyên dụng.</p>

<h3>2. Biểu phí và Ưu đãi vận chuyển</h3>
<p>• <strong>Miễn phí vận chuyển & lắp ráp tận phòng</strong> cho mọi đơn hàng từ 10.000.000₫ trở lên trong bán kính 30km.<br/>
• Đơn hàng dưới 10.000.000₫: Phụ phí đồng giá 150.000₫ - 300.000₫ tùy cự ly cụ thể.<br/>
• Hỗ trợ khiêng vác thang bộ lên các tầng cao chung cư, kiểm tra vị trí đặt đồ phong thủy theo yêu cầu gia chủ.</p>

<h3>3. Biên bản bàn giao và nghiệm thu</h3>
<p>• Khách hàng cùng kỹ thuật viên kiểm tra bề mặt sơn, da, ray kéo và độ cân bằng trước khi ký xác nhận hoàn tất dịch vụ.</p>`,
  },
  {
    type: "warranty",
    name: "Chính sách Bảo hành Khung gỗ & Da thật",
    shortTitle: "Bảo hành & Bảo trì",
    badge: "Bảo đảm trọn đời",
    intro: "Mỗi sản phẩm nội thất Nhà Xinh là một tác phẩm được bảo chứng chất lượng với chế độ bảo hành khung gỗ lên đến 24 tháng và bảo trì kỹ thuật trọn đời.",
    content: `<h3>1. Phạm vi thời hạn bảo hành</h3>
<p>• <strong>Bảo hành 24 tháng</strong>: Khung sườn gỗ tự nhiên, mối ghép mộng, phụ kiện bản lề ray trượt Hafele/Blum.<br/>
• <strong>Bảo hành 12 tháng</strong>: Bề mặt da bò Ý cao cấp, vải dệt chống thấm, nệm mút bọt biển đàn hồi cao.<br/>
• <strong>Bảo trì trọn đời</strong>: Sau thời hạn bảo hành, Nhà Xinh hỗ trợ làm sạch, đánh bóng dưỡng da, thay phụ kiện với giá gốc linh kiện.</p>

<h3>2. Quy trình tiếp nhận yêu cầu bảo hành</h3>
<p>• Bước 1: Tiếp nhận phản ánh qua Hotline 0903 884 358 hoặc Zalo OA Nhà Xinh.<br/>
• Bước 2: Kỹ sư kỹ thuật liên hệ trong 2h làm việc để thẩm định qua hình ảnh hoặc khảo sát tại nhà.<br/>
• Bước 3: Tiến hành khắc phục tại chỗ hoặc vận chuyển về xưởng xử lý trong tối đa 7 ngày.</p>`,
  },
  {
    type: "privacy",
    name: "Chính sách Bảo mật thông tin & Quyền riêng tư",
    shortTitle: "Bảo mật thông tin",
    badge: "An toàn dữ liệu",
    intro: "Nhà Xinh tuân thủ nghiêm ngặt Luật An ninh mạng và cam kết bảo vệ thông tin cá nhân khách hàng ở mức độ an ninh cao nhất.",
    content: `<h3>1. Mục đích thu thập dữ liệu</h3>
<p>• Xử lý thanh toán đơn hàng và điều phối xe giao nhận nội thất tận nhà.<br/>
• Kích hoạt sổ bảo hành điện tử và thông báo định kỳ lịch chăm sóc sofa/gỗ.<br/>
• Gửi ưu đãi sinh nhật và đặc quyền dành riêng cho khách hàng thân thiết (có tùy chọn hủy nhận tin bất kỳ lúc nào).</p>

<h3>2. Cam kết không tiết lộ bên thứ ba</h3>
<p>• Nhà Xinh <strong>tuyệt đối không chia sẻ, mua bán</strong> dữ liệu cá nhân khách hàng cho bên thứ ba vì mục đích thương mại.<br/>
• Toàn bộ giao dịch ngân hàng và ví điện tử được xử lý an toàn qua cổng VNPAY với chuẩn bảo mật SSL 256-bit.</p>`,
  },
  {
    type: "terms",
    name: "Điều khoản sử dụng dịch vụ & Hóa đơn VAT",
    shortTitle: "Điều khoản dịch vụ",
    badge: "Pháp lý chuẩn mực",
    intro: "Quy chế minh bạch đảm bảo quyền lợi bình đẳng giữa người tiêu dùng và Nhà Xinh trong mọi giao dịch trực tuyến.",
    content: `<h3>1. Giá niêm yết & Hóa đơn giá trị gia tăng</h3>
<p>• Toàn bộ mức giá hiển thị trên website nhaxinh.com đều là giá thanh toán cuối cùng đã bao gồm thuế VAT (10%).<br/>
• Nhà Xinh xuất hóa đơn điện tử hợp pháp gửi trực tiếp vào email của quý khách ngay sau khi đơn hàng hoàn tất.</p>

<h3>2. Bản quyền hình ảnh & Thiết kế 3D</h3>
<p>• Toàn bộ hình ảnh phối cảnh không gian nội thất, bài viết cảm hứng kiến trúc thuộc quyền sở hữu trí tuệ của Nhà Xinh. Nghiêm cấm sao chép phục vụ mục đích thương mại khi chưa có sự chấp thuận bằng văn bản.</p>`,
  },
  {
    type: "vip",
    name: "Chương trình Hội viên VIP & Khách hàng Thân thiết",
    shortTitle: "Đặc quyền VIP",
    badge: "Đẳng cấp thượng lưu",
    intro: "Gia nhập Nhà Xinh VIP Club để tận hưởng những đặc quyền thượng lưu cùng trải nghiệm dịch vụ nội thất may đo độc bản.",
    content: `<h3>1. Các hạng thẻ & Chiết khấu ưu đãi</h3>
<p>• <strong>Hạng Classic</strong>: Kích hoạt ngay sau đơn hàng đầu tiên. Tích lũy 1% giá trị mua sắm.<br/>
• <strong>Hạng Silver (Chi tiêu từ 50.000.000₫)</strong>: Giảm thêm 5% cho toàn bộ đơn hàng tiếp theo.<br/>
• <strong>Hạng Gold (Chi tiêu từ 150.000.000₫)</strong>: Giảm 8%, tặng gói tư vấn phối cảnh 3D không gian phòng khách.<br/>
• <strong>Hạng Diamond (Chi tiêu trên 300.000.000₫)</strong>: Giảm 12%, ưu tiên đặt làm hàng bespoke theo thiết kế riêng, bảo dưỡng sofa da miễn phí 6 tháng/lần.</p>

<h3>2. Quà tặng dịp sinh nhật & Triển lãm</h3>
<p>• Tặng voucher trị giá đến 5.000.000₫ vào tháng sinh nhật hội viên.<br/>
• Vé mời VIP tham dự dạ tiệc ra mắt Bộ sưu tập nội thất mới phong cách Châu Âu hàng năm.</p>`,
  },
  {
    type: "custom",
    name: "Chính sách Đặt may đo nội thất theo yêu cầu riêng (Bespoke)",
    shortTitle: "May đo Bespoke",
    badge: "May đo độc bản",
    intro: "Dịch vụ sản xuất nội thất may đo theo kích thước và chất liệu riêng biệt cho từng căn hộ, biệt thự cao cấp.",
    content: `<h3>1. Quy trình sản xuất theo yêu cầu</h3>
<p>• Bước 1: Khảo sát thực tế mặt bằng và lên bản vẽ thiết kế kỹ thuật 2D/3D chi tiết.<br/>
• Bước 2: Quý khách lựa chọn mẫu da thật nhập khẩu từ Ý, gỗ sồi Bắc Mỹ hoặc đá cẩm thạch tự nhiên.<br/>
• Bước 3: Đặt cọc 50% giá trị hợp đồng để tiến hành đặt phôi và gia công thủ công tại xưởng.<br/>
• Bước 4: Nghiệm thu tại xưởng hoặc kiểm tra lúc bàn giao hoàn thiện trong 15 - 25 ngày làm việc.</p>`,
  },
];

// ── Các khối nội dung mẫu sẵn sàng chèn nhanh (Quick Block Insert) ──
const QUICK_BLOCKS = [
  {
    name: "Khung cam kết vàng (Gold Callout)",
    html: `<div style="background: #faf7f2; border-left: 4px solid #b38e5d; padding: 16px 20px; border-radius: 8px; margin: 16px 0;">
  <strong style="color: #b38e5d; font-size: 15px; display: block; margin-bottom: 6px;">★ CAM KẾT VÀNG TỪ NHÀ XINH</strong>
  <p style="margin: 0; color: #444; font-size: 14px; line-height: 1.6;">Toàn bộ sản phẩm được chế tác từ nguyên vật liệu đạt chứng chỉ bảo vệ môi trường, không phát thải formaldehyde, an toàn tuyệt đối cho sức khỏe cả gia đình.</p>
</div>`,
  },
  {
    name: "Bảng thông số thời hạn (Spec Table)",
    html: `<table style="width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 14px;">
  <thead>
    <tr style="background: #f1f5f9; border-bottom: 2px solid #cbd5e1;">
      <th style="padding: 10px 14px; text-align: left; font-weight: 700; color: #1e293b;">Hạng mục sản phẩm</th>
      <th style="padding: 10px 14px; text-align: left; font-weight: 700; color: #1e293b;">Thời hạn bảo hành</th>
      <th style="padding: 10px 14px; text-align: left; font-weight: 700; color: #1e293b;">Quyền lợi hỗ trợ</th>
    </tr>
  </thead>
  <tbody>
    <tr style="border-bottom: 1px solid #e2e8f0;">
      <td style="padding: 10px 14px; font-weight: 600;">Khung sườn sofa gỗ tự nhiên</td>
      <td style="padding: 10px 14px; color: #b38e5d; font-weight: 700;">24 Tháng</td>
      <td style="padding: 10px 14px; color: #64748b;">Đổi mới nếu cong vênh, mối mọt</td>
    </tr>
    <tr style="border-bottom: 1px solid #e2e8f0; background: #fafafa;">
      <td style="padding: 10px 14px; font-weight: 600;">Bề mặt da bò Ý & Vải bọc</td>
      <td style="padding: 10px 14px; color: #b38e5d; font-weight: 700;">12 Tháng</td>
      <td style="padding: 10px 14px; color: #64748b;">Xử lý bảo dưỡng vết nứt tự nhiên</td>
    </tr>
    <tr style="border-bottom: 1px solid #e2e8f0;">
      <td style="padding: 10px 14px; font-weight: 600;">Phụ kiện ray kéo bản lề</td>
      <td style="padding: 10px 14px; color: #b38e5d; font-weight: 700;">24 Tháng</td>
      <td style="padding: 10px 14px; color: #64748b;">Thay mới linh kiện chính hãng</td>
    </tr>
  </tbody>
</table>`,
  },
  {
    name: "Khung cảnh báo & Lưu ý (Alert Box)",
    html: `<div style="background: #fffbeb; border: 1px solid #fef3c7; border-left: 4px solid #f59e0b; padding: 14px 18px; border-radius: 8px; margin: 16px 0;">
  <strong style="color: #b45309; font-size: 14px; display: block; margin-bottom: 4px;">⚠ Lưu ý quan trọng:</strong>
  <p style="margin: 0; color: #92400e; font-size: 13px; line-height: 1.6;">Quý khách vui lòng kiểm tra kỹ bề mặt ngoại quan và phụ kiện trước khi ký nhận bàn giao. Các phát sinh sau thời gian nghiệm thu sẽ được tiếp nhận theo quy trình bảo hành tiêu chuẩn.</p>
</div>`,
  },
  {
    name: "Hộp liên hệ CSKH 24/7 (Hotline Box)",
    html: `<div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px; margin: 20px 0; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px;">
  <div>
    <h4 style="margin: 0 0 4px; color: #0f172a; font-size: 15px; font-weight: 700;">Bạn cần hỗ trợ thêm thông tin?</h4>
    <p style="margin: 0; color: #64748b; font-size: 13px;">Chuyên viên chăm sóc khách hàng Nhà Xinh luôn sẵn lòng tư vấn 24/7.</p>
  </div>
  <div style="display: flex; gap: 10px;">
    <a href="tel:0903884358" style="background: #b38e5d; color: #fff; padding: 8px 16px; border-radius: 8px; font-weight: 700; font-size: 13px; text-decoration: none; display: inline-flex; align-items: center; gap: 6px;">
      📞 0903 884 358
    </a>
  </div>
</div>`,
  },
];

export default function PolicyAdminView({ currentRole }: PolicyAdminViewProps) {
  const {
    pagination,
    loading,
    error,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    templateFilter,
    setTemplateFilter,
    viewMode,
    setViewMode,
    editorMode,
    handleSwitchEditorMode,
    syncContentFromDom,
    currentId,
    formData,
    setFormData,
    toastMessage,
    isSaving,
    deleteConfirmId,
    setDeleteConfirmId,
    showTemplateModal,
    setShowTemplateModal,
    showTypographyDrawer,
    setShowTypographyDrawer,
    visualEditorRef,
    loadPolicies,
    handleOpenCreate,
    handleOpenEdit,
    handleOpenPreview,
    handleTitleChange,
    handleApplyTemplate,
    handleInsertBlock,
    executeCmd,
    handleSavePolicy,
    handleDeletePolicy,
  } = useAdminPolicies(POLICY_TEMPLATES[0].content);

  const { paginatedItems: displayedPolicies } = pagination;

  return (
    <div className="space-y-6">
      {/* ── TOP HEADER BAR ── */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700 shadow-sm">
              <ShieldCheck size={22} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                Hệ thống Quản lý Chính sách & Điều khoản
                <span className="text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-0.5 rounded-full">
            
                </span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Soạn thảo tự do, kho mẫu chuẩn quốc tế, tùy biến font chữ & lưu trữ nhật ký kiểm toán (Audit Logs)
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {viewMode !== "list" ? (
            <button
              onClick={() => setViewMode("list")}
              className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 transition-all shadow-sm"
            >
              <ArrowLeft size={15} /> Quay lại danh sách
            </button>
          ) : (
            <PermissionGate permission="policies.manage" currentRole={currentRole}>
              <button
                onClick={handleOpenCreate}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition-all"
              >
                <Plus size={16} /> Thêm chính sách mới
              </button>
            </PermissionGate>
          )}

          <button
            onClick={loadPolicies}
            disabled={loading}
            className="p-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition-all shadow-sm"
            title="Làm mới dữ liệu"
          >
            <RefreshCw size={16} className={loading ? "animate-spin text-blue-600" : ""} />
          </button>
        </div>
      </div>

      {/* ── TOAST ALERT NOTIFICATION (LUÔN NỔI TRÊN CÙNG) ── */}
      {toastMessage && (
        <div className="admin-toast-banner p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2.5">
          <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          VIEW 1: LIST TABLE (DANH SÁCH CHÍNH SÁCH)
         ───────────────────────────────────────────────────────────── */}
      {viewMode === "list" && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              {["ALL", "PUBLISHED", "DRAFT", "ARCHIVED"].map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    statusFilter === st
                      ? "bg-slate-900 text-white shadow-sm"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {st === "ALL" && "Tất cả chính sách"}
                  {st === "PUBLISHED" && "Đang công bố"}
                  {st === "DRAFT" && "Bản nháp"}
                  {st === "ARCHIVED" && "Đã lưu trữ"}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={templateFilter}
                onChange={(e) => setTemplateFilter(e.target.value)}
                className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-700"
              >
                <option value="ALL">Mọi loại mẫu</option>
                <option value="return">Đổi trả (return)</option>
                <option value="shipping">Vận chuyển (shipping)</option>
                <option value="warranty">Bảo hành (warranty)</option>
                <option value="privacy">Bảo mật (privacy)</option>
                <option value="terms">Điều khoản (terms)</option>
                <option value="vip">VIP (vip)</option>
                <option value="custom">Tùy biến (custom)</option>
              </select>

              <div className="relative min-w-65">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Tìm theo tiêu đề, slug hoặc từ khóa..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && loadPolicies()}
                  className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Table Container */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {error && (
              <div className="p-4 bg-red-50 text-red-700 text-xs flex items-center gap-2 border-b border-red-100">
                <AlertCircle size={15} />
                <span>{error}</span>
              </div>
            )}

            {loading ? (
              <div className="p-12 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-2">
                <RefreshCw size={24} className="animate-spin text-blue-500" />
                <span>Đang tải danh sách chính sách từ máy chủ...</span>
              </div>
            ) : displayedPolicies.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-xs">
                <FileText size={32} className="mx-auto text-slate-300 mb-2" />
                <p className="font-semibold text-slate-600">Không tìm thấy chính sách nào phù hợp</p>
                <p className="text-[11px] text-slate-400 mt-1">Bấm "Thêm chính sách mới" để khởi tạo chính sách đầu tiên</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="px-5 py-3">Mã (Slug) & Tiêu đề</th>
                      <th className="px-4 py-3">Loại Mẫu</th>
                      <th className="px-4 py-3">Typography (Font chữ)</th>
                      <th className="px-4 py-3">Trạng thái</th>
                      <th className="px-4 py-3">Người sửa / Ngày</th>
                      <th className="px-5 py-3 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {displayedPolicies.map((pol) => {
                      const fontObj = (pol?.fontFamily && FONT_OPTIONS.find((f) => f.id === pol.fontFamily)) || FONT_OPTIONS[0];
                      return (
                        <tr key={pol.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="px-5 py-3.5">
                            <div className="flex items-start gap-2.5">
                              <span className="p-1.5 rounded-lg bg-blue-50 text-blue-600 mt-0.5">
                                <FileText size={15} />
                              </span>
                              <div>
                                <div className="font-bold text-slate-900 text-sm">{pol.title}</div>
                                <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-400">
                                  <span className="font-mono text-blue-600 bg-blue-50/60 px-1.5 py-0.5 rounded">
                                    /{pol.slug}
                                  </span>
                                  {pol.shortTitle && <span>• {pol.shortTitle}</span>}
                                </div>
                              </div>
                            </div>
                          </td>

                          <td className="px-4 py-3.5">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                              <Layout size={12} />
                              {pol.templateType || "custom"}
                            </span>
                          </td>

                          <td className="px-4 py-3.5">
                            <div className="flex flex-col">
                              <span className="font-semibold text-slate-800" style={{ fontFamily: pol.fontFamily }}>
                                {fontObj.name}
                              </span>
                              <span className="text-[10px] text-slate-400">
                                Size: {pol.fontSize || "15px"} • Dòng: {pol.lineHeight || "1.75"}
                              </span>
                            </div>
                          </td>

                          <td className="px-4 py-3.5">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                pol.status === "PUBLISHED"
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  : pol.status === "DRAFT"
                                  ? "bg-amber-50 text-amber-700 border border-amber-200"
                                  : "bg-slate-100 text-slate-600 border border-slate-200"
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  pol.status === "PUBLISHED" ? "bg-emerald-500" : "bg-amber-500"
                                }`}
                              />
                              {pol.status === "PUBLISHED" ? "Đã công bố" : pol.status === "DRAFT" ? "Bản nháp" : "Lưu trữ"}
                            </span>
                          </td>

                          <td className="px-4 py-3.5 text-slate-500 text-[11px]">
                            <div className="font-medium text-slate-700">{pol.updatedBy || "admin"}</div>
                            <div className="text-slate-400 text-[10px]">
                              {pol.updatedAt ? new Date(pol.updatedAt).toLocaleDateString("vi-VN") : "Gần đây"}
                            </div>
                          </td>

                          <td className="px-5 py-3.5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleOpenPreview(pol)}
                                className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                title="Xem trước giao diện người dùng"
                              >
                                <Eye size={15} />
                              </button>

                              <PermissionGate permission="policies.manage" currentRole={currentRole}>
                                <button
                                  onClick={() => handleOpenEdit(pol)}
                                  className="p-1.5 text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                                  title="Chỉnh sửa nội dung & Font"
                                >
                                  <Edit3 size={15} />
                                </button>

                                <button
                                  onClick={() => setDeleteConfirmId(pol.id)}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                                  title="Xóa chính sách"
                                >
                                  <Trash2 size={15} />
                                </button>
                              </PermissionGate>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            <AdminPagination pagination={pagination} itemLabel="chính sách" />
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          VIEW 2: EDIT / CREATE WORKSPACE (SOẠN THẢO TỰ DO + SÁNG MẪU + FONT)
         ───────────────────────────────────────────────────────────── */}
      {viewMode === "edit" && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Editing Column (3 Cols) */}
          <div className="lg:col-span-3 space-y-4">
            {/* Meta info box */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Edit3 size={18} className="text-blue-600" />
                  {currentId ? "Cập nhật Chính sách" : "Tạo Chính sách Mới"}
                </h3>

                <div className="flex items-center gap-2">
                  {/* Sáng mẫu button */}
                  <button
                    type="button"
                    onClick={() => setShowTemplateModal(true)}
                    className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
                  >
                    <Sparkles size={14} className="text-amber-600" /> Tự do sáng mẫu
                  </button>

                  {/* Font setup button */}
                  <button
                    type="button"
                    onClick={() => setShowTypographyDrawer(!showTypographyDrawer)}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all"
                  >
                    <Type size={14} className="text-indigo-600" /> Font cá nhân
                  </button>
                </div>
              </div>

              {/* Title & Slug inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Tiêu đề chính sách <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.title || ""}
                    onChange={(e) => handleTitleChange(e.target.value)}
                    placeholder="VD: Chính sách Bảo hành Khung sườn Sofa..."
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Mã Slug định danh
                  </label>
                  <input
                    type="text"
                    value={formData.slug || ""}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                    placeholder="VD: bao-hanh-sofa"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono text-blue-700 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Tên viết tắt (Menu/Breadcrumb)
                  </label>
                  <input
                    type="text"
                    value={formData.shortTitle || ""}
                    onChange={(e) => setFormData({ ...formData, shortTitle: e.target.value })}
                    placeholder="VD: Bảo hành"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Mẫu kế thừa
                  </label>
                  <select
                    value={formData.templateType || "custom"}
                    onChange={(e) => setFormData({ ...formData, templateType: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="return">Đổi trả & Hoàn tiền (return)</option>
                    <option value="shipping">Vận chuyển & Lắp đặt (shipping)</option>
                    <option value="warranty">Bảo hành khung/da (warranty)</option>
                    <option value="privacy">Bảo mật thông tin (privacy)</option>
                    <option value="terms">Điều khoản dịch vụ (terms)</option>
                    <option value="vip">Khách hàng VIP (vip)</option>
                    <option value="custom">Tùy biến tự do (custom)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Trạng thái xuất bản
                  </label>
                  <select
                    value={formData.status || "PUBLISHED"}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="PUBLISHED">Công bố công khai (PUBLISHED)</option>
                    <option value="DRAFT">Lưu bản nháp (DRAFT)</option>
                    <option value="ARCHIVED">Lưu trữ ẩn (ARCHIVED)</option>
                  </select>
                </div>
              </div>

              {/* Intro textarea */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Lời mở đầu & Tuyên ngôn cam kết
                </label>
                <textarea
                  rows={2}
                  value={formData.intro || ""}
                  onChange={(e) => setFormData({ ...formData, intro: e.target.value })}
                  placeholder="Nhà Xinh cam kết đem lại giá trị đích thực cho không gian sống..."
                  className="w-full p-2.5 border border-slate-300 rounded-lg text-xs leading-relaxed focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* ── RICH WYSIWYG & CODE EDITOR CONTAINER ── */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
              {/* Editor Mode Header */}
              <div className="bg-slate-50 border-b border-slate-200 p-2.5 flex items-center justify-between flex-wrap gap-2">
                {/* Visual / HTML / Split mode toggles */}
                <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-200">
                  <button
                    type="button"
                    onClick={() => handleSwitchEditorMode("visual")}
                    className={`px-3 py-1 rounded text-xs font-bold flex items-center gap-1.5 transition-all ${
                      editorMode === "visual" ? "bg-blue-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    <Edit3 size={13} /> Soạn thảo trực quan (WYSIWYG)
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSwitchEditorMode("html")}
                    className={`px-3 py-1 rounded text-xs font-bold flex items-center gap-1.5 transition-all ${
                      editorMode === "html" ? "bg-blue-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    <Code size={13} /> Mã nguồn HTML
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSwitchEditorMode("split")}
                    className={`px-3 py-1 rounded text-xs font-bold flex items-center gap-1.5 transition-all ${
                      editorMode === "split" ? "bg-blue-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    <Columns size={13} /> Chia đôi xem trước
                  </button>
                </div>

                {/* Quick Insert Blocks Dropdown */}
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-400 font-semibold">Chèn nhanh:</span>
                  <div className="flex items-center gap-1">
                    {QUICK_BLOCKS.map((qb, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => handleInsertBlock(qb.html)}
                        className="px-2 py-1 text-[11px] font-semibold bg-white border border-slate-200 hover:bg-blue-50 hover:text-blue-700 rounded transition-all"
                        title={qb.name}
                      >
                        {i === 0 && "★ Cam kết"}
                        {i === 1 && "📋 Bảng thời hạn"}
                        {i === 2 && "⚠ Cảnh báo"}
                        {i === 3 && "📞 Hotline"}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Visual Formatting Toolbar (when visual or split) */}
              {editorMode !== "html" && (
                <div className="bg-white border-b border-slate-200 p-2 flex items-center flex-wrap gap-1 text-slate-700">
                  <button
                    type="button"
                    onClick={() => executeCmd("bold")}
                    className="p-1.5 hover:bg-slate-100 rounded text-slate-700 hover:text-slate-900"
                    title="In đậm (Bold)"
                  >
                    <Bold size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={() => executeCmd("italic")}
                    className="p-1.5 hover:bg-slate-100 rounded text-slate-700 hover:text-slate-900"
                    title="In nghiêng (Italic)"
                  >
                    <Italic size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={() => executeCmd("underline")}
                    className="p-1.5 hover:bg-slate-100 rounded text-slate-700 hover:text-slate-900"
                    title="Gạch chân (Underline)"
                  >
                    <Underline size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={() => executeCmd("strikeThrough")}
                    className="p-1.5 hover:bg-slate-100 rounded text-slate-700 hover:text-slate-900"
                    title="Gạch ngang (Strikethrough)"
                  >
                    <Strikethrough size={15} />
                  </button>

                  <div className="w-px h-4 bg-slate-200 mx-1" />

                  <button
                    type="button"
                    onClick={() => executeCmd("formatBlock", "<h2>")}
                    className="px-2 py-1 hover:bg-slate-100 rounded font-bold text-xs"
                    title="Tiêu đề H2"
                  >
                    <Heading2 size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={() => executeCmd("formatBlock", "<h3>")}
                    className="px-2 py-1 hover:bg-slate-100 rounded font-bold text-xs"
                    title="Tiêu đề H3"
                  >
                    <Heading3 size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={() => executeCmd("formatBlock", "<p>")}
                    className="px-2 py-1 hover:bg-slate-100 rounded text-xs font-semibold"
                    title="Đoạn văn thường (Paragraph)"
                  >
                    P
                  </button>

                  <div className="w-px h-4 bg-slate-200 mx-1" />

                  <button
                    type="button"
                    onClick={() => executeCmd("insertUnorderedList")}
                    className="p-1.5 hover:bg-slate-100 rounded"
                    title="Danh sách gạch đầu dòng"
                  >
                    <List size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={() => executeCmd("insertOrderedList")}
                    className="p-1.5 hover:bg-slate-100 rounded"
                    title="Danh sách đánh số"
                  >
                    <ListOrdered size={15} />
                  </button>

                  <div className="w-px h-4 bg-slate-200 mx-1" />

                  <button
                    type="button"
                    onClick={() => executeCmd("justifyLeft")}
                    className="p-1.5 hover:bg-slate-100 rounded"
                    title="Căn trái"
                  >
                    <AlignLeft size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={() => executeCmd("justifyCenter")}
                    className="p-1.5 hover:bg-slate-100 rounded"
                    title="Căn giữa"
                  >
                    <AlignCenter size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={() => executeCmd("justifyRight")}
                    className="p-1.5 hover:bg-slate-100 rounded"
                    title="Căn phải"
                  >
                    <AlignRight size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={() => executeCmd("justifyFull")}
                    className="p-1.5 hover:bg-slate-100 rounded"
                    title="Căn đều"
                  >
                    <AlignJustify size={15} />
                  </button>

                  <div className="w-px h-4 bg-slate-200 mx-1" />

                  <button
                    type="button"
                    onClick={() => executeCmd("formatBlock", "<blockquote>")}
                    className="p-1.5 hover:bg-slate-100 rounded"
                    title="Trích dẫn (Quote)"
                  >
                    <Quote size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={() => executeCmd("insertHorizontalRule")}
                    className="px-2 py-1 hover:bg-slate-100 rounded text-xs font-semibold"
                    title="Kẻ ngang phân cách"
                  >
                    ―
                  </button>
                </div>
              )}

              {/* Editor Workspace Content */}
              <div className="min-h-105 max-h-150 overflow-y-auto">
                {editorMode === "visual" && (
                  <div
                    ref={visualEditorRef}
                    contentEditable
                    suppressContentEditableWarning={true}
                    onInput={() => {
                      if (visualEditorRef.current) {
                        const html = visualEditorRef.current.innerHTML || "";
                        setFormData((p) => ({ ...p, content: html }));
                      }
                    }}
                    onBlur={() => {
                      if (visualEditorRef.current) {
                        const html = visualEditorRef.current.innerHTML || "";
                        setFormData((p) => ({ ...p, content: html }));
                      }
                    }}
                    style={{
                      fontFamily: formData.fontFamily,
                      fontSize: formData.fontSize,
                      lineHeight: formData.lineHeight,
                    }}
                    className="p-6 focus:outline-none min-h-105 prose prose-slate max-w-none text-slate-800"
                  />
                )}

                {editorMode === "html" && (
                  <textarea
                    rows={20}
                    value={formData.content || ""}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    className="w-full h-full min-h-105 p-4 font-mono text-xs text-slate-800 leading-relaxed border-0 focus:outline-none bg-slate-50"
                  />
                )}

                {editorMode === "split" && (
                  <div className="grid grid-cols-2 divide-x divide-slate-200 min-h-105">
                    <div
                      ref={visualEditorRef}
                      contentEditable
                      suppressContentEditableWarning={true}
                      onInput={() => {
                        if (visualEditorRef.current) {
                          const html = visualEditorRef.current.innerHTML || "";
                          setFormData((p) => ({ ...p, content: html }));
                        }
                      }}
                      onBlur={() => {
                        if (visualEditorRef.current) {
                          const html = visualEditorRef.current.innerHTML || "";
                          setFormData((p) => ({ ...p, content: html }));
                        }
                      }}
                      style={{
                        fontFamily: formData.fontFamily,
                        fontSize: formData.fontSize,
                        lineHeight: formData.lineHeight,
                      }}
                      className="p-5 focus:outline-none min-h-105 prose prose-slate max-w-none text-slate-800 overflow-y-auto"
                    />

                    <div
                      className="p-5 bg-slate-50/50 overflow-y-auto text-slate-800"
                      style={{
                        fontFamily: formData.fontFamily,
                        fontSize: formData.fontSize,
                        lineHeight: formData.lineHeight,
                      }}
                    >
                      <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-2">
                        👁 Xem trước trực tiếp theo Font
                      </div>
                      <div dangerouslySetInnerHTML={{ __html: formData.content || "" }} />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Save Action Bar */}
            <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <button
                type="button"
                onClick={() => setViewMode("list")}
                className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Hủy bỏ
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    syncContentFromDom();
                    setViewMode("preview");
                  }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold flex items-center gap-1.5"
                >
                  <Eye size={15} /> Xem toàn màn hình
                </button>

                <PermissionGate permission="policies.manage" currentRole={currentRole}>
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={handleSavePolicy}
                    className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition-all"
                  >
                    {isSaving ? <RefreshCw size={15} className="animate-spin" /> : <Save size={15} />}
                    {currentId ? "Lưu thay đổi chính sách" : "Tạo & Xuất bản chính sách"}
                  </button>
                </PermissionGate>
              </div>
            </div>
          </div>

          {/* Right Sidebar: Typography & Style Inspector (1 Col) */}
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Sliders size={14} className="text-blue-600" />
                  Font & Thẩm mỹ văn bản
                </h4>
                <span className="text-[10px] text-slate-400">Tùy biến</span>
              </div>

              {/* Font Family Selector */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1.5">
                  Kiểu Font chữ (Font Family)
                </label>
                <div className="space-y-1.5">
                  {FONT_OPTIONS.map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setFormData({ ...formData, fontFamily: f.id })}
                      className={`w-full text-left p-2.5 rounded-xl border text-xs transition-all ${
                        formData.fontFamily === f.id
                          ? "border-blue-500 bg-blue-50/60 shadow-sm"
                          : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      <div className="font-bold text-slate-900" style={{ fontFamily: f.family }}>
                        {f.name}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">{f.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Font Size Selector */}
              <div className="pt-2 border-t border-slate-100">
                <label className="block text-[11px] font-bold text-slate-700 mb-1.5">
                  Cỡ chữ nội dung
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {FONT_SIZES.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setFormData({ ...formData, fontSize: s.id })}
                      className={`py-1.5 px-2 text-center text-xs font-semibold rounded-lg border transition-all ${
                        formData.fontSize === s.id
                          ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                          : "border-slate-200 text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Line Height Selector */}
              <div className="pt-2 border-t border-slate-100">
                <label className="block text-[11px] font-bold text-slate-700 mb-1.5">
                  Khoảng cách dòng (Line Height)
                </label>
                <div className="grid grid-cols-3 gap-1">
                  {LINE_HEIGHTS.map((lh) => (
                    <button
                      key={lh.id}
                      type="button"
                      onClick={() => setFormData({ ...formData, lineHeight: lh.id })}
                      className={`py-1.5 px-1 text-center text-[11px] font-semibold rounded-lg border transition-all ${
                        formData.lineHeight === lh.id
                          ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                          : "border-slate-200 text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      {lh.id}
                    </button>
                  ))}
                </div>
              </div>

              {/* Accent Color Selector */}
              <div className="pt-2 border-t border-slate-100">
                <label className=" text-[11px] font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                  <span>Màu thương hiệu nhấn</span>
                  <span className="font-mono text-[10px] text-slate-400">{formData.accentColor}</span>
                </label>
                <div className="flex items-center gap-2">
                  {ACCENT_COLORS.map((col) => (
                    <button
                      key={col.hex}
                      type="button"
                      onClick={() => setFormData({ ...formData, accentColor: col.hex })}
                      className={`w-7 h-7 rounded-full border-2 transition-all ${
                        formData.accentColor === col.hex
                          ? "border-slate-900 scale-110 shadow-sm"
                          : "border-white hover:scale-105"
                      }`}
                      style={{ backgroundColor: col.hex }}
                      title={col.name}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Quick Template Tips */}
            <div className="bg-amber-50/60 rounded-2xl border border-amber-200 p-4 text-xs text-amber-900 space-y-2">
              <div className="font-bold flex items-center gap-1.5 text-amber-800">
                <Sparkles size={14} /> Gợi ý định dạng chuẩn Nhà Xinh
              </div>
              <p className="text-[11px] leading-relaxed text-amber-700">
                Sử dụng các thẻ <strong>H3</strong> cho các điều khoản lớn, thẻ <strong>p</strong> kèm dấu chấm gạch đầu dòng cho các tiểu mục, và chèn <strong>Khung cam kết</strong> để tạo sự tin tưởng tuyệt đối cho khách hàng cao cấp.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          VIEW 3: FULL USER-FACING PREVIEW (XEM TRƯỚC GIAO DIỆN)
         ───────────────────────────────────────────────────────────── */}
      {viewMode === "preview" && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex items-center justify-between">
            <button
              onClick={() => setViewMode(currentId ? "edit" : "list")}
              className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-1.5"
            >
              <ArrowLeft size={15} /> Quay lại trình soạn thảo
            </button>

            <div className="text-xs text-slate-500 font-medium">
              Mô phỏng hiển thị trên cổng người dùng (Khách xem tại <span className="font-mono text-blue-600">/{formData.slug}</span>)
            </div>

            <PermissionGate permission="policies.manage" currentRole={currentRole}>
              <button
                type="button"
                onClick={handleSavePolicy}
                disabled={isSaving}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm"
              >
                <Save size={15} /> Lưu & Xuất bản ngay
              </button>
            </PermissionGate>
          </div>

          {/* User Portal Mockup Container */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-lg p-8 md:p-12 max-w-4xl mx-auto space-y-6">
            {/* Header section */}
            <div className="border-b border-slate-200 pb-6 text-center space-y-2">
              <span
                className="text-[11px] font-bold uppercase tracking-widest px-3 py-1 rounded-full text-white"
                style={{ backgroundColor: formData.accentColor || "#b38e5d" }}
              >
                CHÍNH SÁCH KHÁCH HÀNG NHÀ XINH
              </span>
              <h1
                className="text-2xl md:text-3xl font-bold text-slate-900 mt-2"
                style={{ fontFamily: formData.fontFamily }}
              >
                {formData.title || "Chính sách Nhà Xinh"}
              </h1>
              {formData.intro && (
                <p
                  className="text-slate-600 max-w-2xl mx-auto italic text-sm md:text-base leading-relaxed mt-2"
                  style={{ fontFamily: formData.fontFamily }}
                >
                  "{formData.intro}"
                </p>
              )}
            </div>

            {/* Content rendered with the chosen font & typography */}
            <div
              className="prose prose-slate max-w-none text-slate-800"
              style={{
                fontFamily: formData.fontFamily,
                fontSize: formData.fontSize,
                lineHeight: formData.lineHeight,
              }}
              dangerouslySetInnerHTML={{ __html: formData.content || "" }}
            />
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          MODAL: KHO MẪU CHÍNH SÁCH (TỰ DO SÁNG MẪU)
         ───────────────────────────────────────────────────────────── */}
      {showTemplateModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-3xl w-full max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Sparkles size={18} className="text-amber-600" />
                  Kho Mẫu Chính Sách Chuẩn Mực Nội Thất
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Chọn mẫu định dạng sẵn để áp dụng ngay cấu trúc văn bản pháp lý & dịch vụ chuyên nghiệp
                </p>
              </div>
              <button
                onClick={() => setShowTemplateModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold p-1"
              >
                ✕
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-3.5 divide-y divide-slate-100">
              {POLICY_TEMPLATES.map((tmpl, idx) => (
                <div key={idx} className="pt-3.5 first:pt-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-sm">{tmpl.name}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                        {tmpl.badge}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 line-clamp-2 max-w-xl">{tmpl.intro}</p>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleApplyTemplate(tmpl)}
                    className="px-4 py-2 bg-slate-900 hover:bg-blue-600 text-white rounded-xl text-xs font-bold shrink-0 transition-all shadow-sm"
                  >
                    Áp dụng mẫu này
                  </button>
                </div>
              ))}
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button
                onClick={() => setShowTemplateModal(false)}
                className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          MODAL: CONFIRM DELETE
         ───────────────────────────────────────────────────────────── */}
      {deleteConfirmId !== null && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 mx-auto">
              <Trash2 size={24} />
            </div>

            <div className="text-center">
              <h3 className="text-base font-bold text-slate-900">Xác nhận xóa chính sách?</h3>
              <p className="text-xs text-slate-500 mt-1">
                Chính sách này sẽ bị gỡ bỏ khỏi hệ thống và người dùng sẽ không còn xem được điều khoản này. Hành động này sẽ được ghi vào Nhật ký kiểm toán (Audit Logs).
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={() => handleDeletePolicy(deleteConfirmId)}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-sm"
              >
                Xóa vĩnh viễn
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
