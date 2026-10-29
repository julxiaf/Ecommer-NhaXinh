import * as XLSX from "xlsx";
import type { AdminOrder, AdminProduct } from "../services/admin/types";

// Helper chuyển đổi trạng thái đơn hàng sang tiếng Việt
const mapOrderStatus = (status: AdminOrder["status"]): string => {
  switch (status) {
    case "pending":
      return "Chờ xác nhận";
    case "confirmed":
      return "Đã xác nhận";
    case "processing":
      return "Đang đóng gói / xử lý";
    case "shipping":
      return "Đang giao hàng";
    case "completed":
      return "Hoàn tất";
    case "cancelled":
      return "Đã hủy";
    default:
      return status;
  }
};

// Helper chuyển đổi trạng thái thanh toán
const mapPaymentStatus = (status?: AdminOrder["paymentStatus"]): string => {
  switch (status) {
    case "paid":
      return "Đã thanh toán đủ";
    case "partially_paid":
      return "Đã đặt cọc một phần";
    case "refunded":
      return "Đã hoàn tiền";
    case "failed":
      return "Thanh toán thất bại";
    case "pending":
    default:
      return "Chờ thanh toán";
  }
};

// Helper chuyển đổi phương thức thanh toán
const mapPaymentMethod = (method: string): string => {
  switch (method?.toLowerCase()) {
    case "cod":
      return "Tiền mặt khi nhận (COD)";
    case "vietqr":
    case "bank_transfer":
      return "Chuyển khoản VietQR";
    case "vnpay":
      return "Cổng VNPAY / Thẻ";
    case "momo":
      return "Ví MoMo";
    default:
      return method?.toUpperCase() || "COD";
  }
};

// Helper tính toán độ rộng tối ưu cho các cột trong Excel
const fitColumns = (data: Record<string, any>[]): XLSX.ColInfo[] => {
  if (!data || data.length === 0) return [];
  const keys = Object.keys(data[0]);
  return keys.map((key) => {
    let maxLen = key.length;
    data.forEach((row) => {
      const val = row[key];
      const strVal = val !== null && val !== undefined ? String(val) : "";
      if (strVal.length > maxLen) {
        maxLen = strVal.length;
      }
    });
    return { wch: Math.min(Math.max(maxLen + 3, 10), 50) };
  });
};

/**
 * ════════════════════════════════════════════════════════
 * 1. XUẤT EXCEL DANH SÁCH ĐƠN HÀNG (MODULE ORDER)
 * ════════════════════════════════════════════════════════
 */
export const exportOrdersToExcel = (
  orders: AdminOrder[],
  customFilename?: string
): void => {
  if (!orders || orders.length === 0) {
    alert("Không có dữ liệu đơn hàng để xuất file Excel!");
    return;
  }

  // Sheet 1: Danh sách tổng hợp đơn hàng
  const ordersSheetData = orders.map((o, idx) => ({
    "STT": idx + 1,
    "Mã đơn hàng": o.orderCode,
    "Ngày đặt": o.createdAt,
    "Khách hàng": o.customerName,
    "Số điện thoại": o.phone,
    "Email": o.email || "Không có",
    "Địa chỉ giao hàng": o.address,
    "Phương thức thanh toán": mapPaymentMethod(o.paymentMethod),
    "Trạng thái thanh toán": mapPaymentStatus(o.paymentStatus),
    "Trạng thái đơn hàng": mapOrderStatus(o.status),
    "Số lượng món": o.items ? o.items.reduce((s, it) => s + (it.quantity || 1), 0) : 0,
    "Tổng tiền (VNĐ)": Number(o.total) || 0,
    "Ghi chú khách hàng": o.note || "",
  }));

  // Sheet 2: Chi tiết các sản phẩm trong từng đơn
  const itemsSheetData: Record<string, any>[] = [];
  let itemIndex = 1;
  orders.forEach((o) => {
    if (o.items && o.items.length > 0) {
      o.items.forEach((it) => {
        itemsSheetData.push({
          "STT": itemIndex++,
          "Mã đơn hàng": o.orderCode,
          "Khách hàng": o.customerName,
          "Tên sản phẩm": it.name,
          "Biến thể / Phân loại": it.variantDetails || it.variantSku || "Mặc định",
          "Số lượng": it.quantity || 1,
          "Đơn giá (VNĐ)": Number(it.price) || 0,
          "Thành tiền (VNĐ)": (Number(it.price) || 0) * (it.quantity || 1),
        });
      });
    }
  });

  const wb = XLSX.utils.book_new();

  // Tạo Sheet 1
  const wsOrders = XLSX.utils.json_to_sheet(ordersSheetData);
  wsOrders["!cols"] = fitColumns(ordersSheetData);
  XLSX.utils.book_append_sheet(wb, wsOrders, "Danh Sách Đơn Hàng");

  // Tạo Sheet 2 nếu có sản phẩm
  if (itemsSheetData.length > 0) {
    const wsItems = XLSX.utils.json_to_sheet(itemsSheetData);
    wsItems["!cols"] = fitColumns(itemsSheetData);
    XLSX.utils.book_append_sheet(wb, wsItems, "Chi Tiết Sản Phẩm");
  }

  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const filename = customFilename || `NhaXinh_DonHang_${dateStr}.xlsx`;
  XLSX.writeFile(wb, filename);
};

/**
 * ════════════════════════════════════════════════════════
 * 2. XUẤT EXCEL DANH SÁCH SẢN PHẨM (MODULE PRODUCT)
 * ════════════════════════════════════════════════════════
 */
export const exportProductsToExcel = (
  products: AdminProduct[],
  customFilename?: string
): void => {
  if (!products || products.length === 0) {
    alert("Không có dữ liệu sản phẩm để xuất file Excel!");
    return;
  }

  // Sheet 1: Danh sách sản phẩm tổng quan
  const productsSheetData = products.map((p, idx) => ({
    "STT": idx + 1,
    "Mã ID": p.id,
    "Tên sản phẩm": p.name,
    "Đường dẫn (Slug)": p.slug,
    "Danh mục": p.category || "Chưa phân loại",
    "Giá niêm yết (VNĐ)": Number(p.price) || 0,
    "Tồn kho": Number(p.stock) || 0,
    "Số biến thể": p.variants ? p.variants.length : 0,
    "Trạng thái": p.status === "active" ? "Đang bán" : p.status === "draft" ? "Bản nháp" : "Lưu trữ",
    "Thùng rác": p.isDeleted ? "Đã xóa" : "Bình thường",
  }));

  // Sheet 2: Danh sách chi tiết các biến thể sản phẩm (nếu có)
  const variantsSheetData: Record<string, any>[] = [];
  let variantIndex = 1;
  products.forEach((p) => {
    if (p.variants && p.variants.length > 0) {
      p.variants.forEach((v) => {
        variantsSheetData.push({
          "STT": variantIndex++,
          "Mã SP": p.id,
          "Tên sản phẩm": p.name,
          "Mã SKU biến thể": v.sku,
          "Màu sắc": v.color || "Tiêu chuẩn",
          "Kích thước": v.size || "Tiêu chuẩn",
          "Chất liệu": v.material || "Tiêu chuẩn",
          "Giá bán biến thể (VNĐ)": Number(v.price) || Number(p.price) || 0,
          "Tồn kho biến thể": Number(v.stock) || 0,
        });
      });
    }
  });

  const wb = XLSX.utils.book_new();

  // Tạo Sheet 1
  const wsProducts = XLSX.utils.json_to_sheet(productsSheetData);
  wsProducts["!cols"] = fitColumns(productsSheetData);
  XLSX.utils.book_append_sheet(wb, wsProducts, "Danh Sách Sản Phẩm");

  // Tạo Sheet 2 nếu có biến thể
  if (variantsSheetData.length > 0) {
    const wsVariants = XLSX.utils.json_to_sheet(variantsSheetData);
    wsVariants["!cols"] = fitColumns(variantsSheetData);
    XLSX.utils.book_append_sheet(wb, wsVariants, "Chi Tiết Biến Thể");
  }

  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const filename = customFilename || `NhaXinh_SanPham_${dateStr}.xlsx`;
  XLSX.writeFile(wb, filename);
};

