import type { AdminOrder } from "./types";

/**
 * Định nghĩa sơ đồ chuyển đổi trạng thái hợp lệ (State Machine Rules)
 * - Chờ xác nhận (PENDING): • Đã xác nhận (CONFIRMED), • Hủy đơn hàng (CANCELLED)
 * - Đã xác nhận (CONFIRMED): • Đang đóng gói / Xử lý (PROCESSING), • Hủy đơn hàng (CANCELLED)
 * - Đang đóng gói / Xử lý (PROCESSING): • Bàn giao ĐVVC / Đang giao (SHIPPING), • Hủy đơn hàng (CANCELLED)
 * - Bàn giao ĐVVC / Đang giao (SHIPPING): • Đã giao thành công (COMPLETED)
 * - Đã giao thành công (COMPLETED): (Không cho phép chuyển đổi bất kỳ trạng thái nào nữa - Khóa)
 * - Đã hủy (CANCELLED): (Không cho phép chuyển đổi bất kỳ trạng thái nào nữa - Khóa)
 */
export const VALID_ORDER_TRANSITIONS: Record<string, string[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["processing", "cancelled"],
  processing: ["shipping", "cancelled"],
  shipping: ["completed"],
  completed: [],
  cancelled: [],
};

export const ORDER_STATUS_LABELS: Record<string, string> = {
  pending: "Chờ xác nhận (PENDING)",
  confirmed: "Đã xác nhận (CONFIRMED)",
  processing: "Đang đóng gói / Xử lý (PROCESSING)",
  shipping: "Bàn giao ĐVVC / Đang giao (SHIPPING)",
  completed: "Đã giao thành công (COMPLETED)",
  cancelled: "Hủy đơn hàng (CANCELLED)",
};

/**
 * Kiểm tra xem chuyển đổi từ currentStatus sang targetStatus có hợp lệ theo State Machine không.
 */
export function isValidTransition(currentStatus?: string, targetStatus?: string): boolean {
  if (!currentStatus || !targetStatus) return false;
  const curr = currentStatus.toLowerCase().trim();
  const target = targetStatus.toLowerCase().trim();
  const allowed = VALID_ORDER_TRANSITIONS[curr];
  return Boolean(allowed && allowed.includes(target));
}

/**
 * Lấy danh sách các option hợp lệ tiếp theo dựa trên trạng thái hiện tại.
 */
export function getAllowedNextStatuses(
  currentStatus?: string
): Array<{ value: AdminOrder["status"]; label: string }> {
  if (!currentStatus) return [];
  const curr = currentStatus.toLowerCase().trim();
  const allowed = VALID_ORDER_TRANSITIONS[curr] || [];
  return allowed.map((status) => ({
    value: status as AdminOrder["status"],
    label: ORDER_STATUS_LABELS[status] || status.toUpperCase(),
  }));
}

/**
 * Kiểm tra xem đơn hàng đã ở trạng thái kết thúc (COMPLETED hoặc CANCELLED) hay chưa.
 */
export function isOrderTerminated(status?: string): boolean {
  if (!status) return false;
  const s = status.toLowerCase().trim();
  return s === "completed" || s === "cancelled";
}

