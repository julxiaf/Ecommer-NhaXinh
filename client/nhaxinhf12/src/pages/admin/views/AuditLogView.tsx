import {
  Activity, Search, Download, RefreshCw, Trash2,
  ShoppingCart, CreditCard, ShieldCheck, Package, FolderTree,
  Settings, MessageSquare, Tag, User, Terminal, Eye,
  PlusCircle,
} from "lucide-react";
import type { AdminAuditLog, RoleDefinition } from "../../../services/admin/types";
import PermissionGate from "../../../components/admin/PermissionGate";
import { AdminPagination } from "../../../components/admin/AdminPagination";
import { useAdminAuditLogs } from "../../../hooks/admin/useAdminAuditLogs";

interface AuditLogViewProps {
  logs: AdminAuditLog[];
  currentRole: RoleDefinition;
  onRefresh: () => void;
  onClearLogs?: () => void;
  onSimulateLog?: (entry: Omit<AdminAuditLog, "id" | "timestamp">) => void;
}

export default function AuditLogView({
  logs,
  currentRole,
  onRefresh,
  onClearLogs,
}: AuditLogViewProps) {
  const {
    searchTerm,
    setSearchTerm,
    selectedModule,
    setSelectedModule,
    selectedSeverity,
    setSelectedSeverity,
    selectedAction,
    setSelectedAction,
    activeLog,
    setActiveLog,
    stats,
    pagination,
    handleResetFilters,
    handleExportCSV,
  } = useAdminAuditLogs(logs);

  const { paginatedItems: displayedLogs } = pagination;

  const renderActionBadge = (action: AdminAuditLog["action"]) => {
    switch (action) {
      case "ORDER_CREATED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <ShoppingCart size={12} className="text-emerald-600" />
            Khách đặt hàng
          </span>
        );
      case "PAYMENT_CONFIRMED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
            <CreditCard size={12} className="text-blue-600" />
            Xác nhận thanh toán
          </span>
        );
      case "PAYMENT_INITIATED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-blue-200 bg-blue-50 text-[11px] font-bold text-blue-700">
            <CreditCard size={12} className="text-blue-600" />
            Khởi tạo thanh toán
          </span>
        );
      case "ORDER_STATUS_CHANGED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
            <RefreshCw size={12} className="text-amber-600" />
            Đổi trạng thái đơn
          </span>
        );
      case "PRODUCT_CREATED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
            <Package size={12} className="text-purple-600" />
            Tạo sản phẩm mới
          </span>
        );
      case "PRODUCT_UPDATED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
            <Package size={12} className="text-indigo-600" />
            Cập nhật sản phẩm
          </span>
        );
      case "PRODUCT_RESTOCKED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-teal-50 text-teal-700 border border-teal-200">
            <PlusCircle size={12} className="text-teal-600" />
            Nhập thêm kho
          </span>
        );
      case "PRODUCT_DELETED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
            <Trash2 size={12} className="text-rose-600" />
            Xóa sản phẩm
          </span>
        );
      case "CATEGORY_CREATED":
      case "CATEGORY_UPDATED":
      case "CATEGORY_DELETED":
      case "CATEGORY_RESTORED":
      case "ADMIN_CREATE_CATEGORY":
      case "ADMIN_UPDATE_CATEGORY":
      case "ADMIN_DELETE_CATEGORY":
      case "ADMIN_RESTORE_CATEGORY":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-sky-50 text-sky-700 border border-sky-200">
            <FolderTree size={12} className="text-sky-600" />
            Quản trị danh mục
          </span>
        );
      case "COLLECTION_CREATED":
      case "COLLECTION_UPDATED":
      case "COLLECTION_DELETED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-violet-50 text-violet-700 border border-violet-200">
            <FolderTree size={12} className="text-violet-600" />
            Quản trị bộ sưu tập
          </span>
        );
      case "PERMISSION_GRANTED":
      case "ROLE_PERMISSIONS_UPDATE":
      case "ROLE_UPDATED":
      case "ROLE_UPDATE":
      case "ROLE_CREATED":
      case "ROLE_CREATE":
      case "ROLE_DELETED":
      case "ROLE_DELETE":
      case "PERMISSION_CREATE":
      case "PERMISSION_UPDATE":
      case "PERMISSION_DELETE":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-amber-50 text-amber-900 border border-amber-300">
            <ShieldCheck size={12} className="text-amber-600" />
            Phân quyền vai trò
          </span>
        );
      case "STAFF_INVITED":
      case "USER_CREATE":
      case "ASSIGN_ROLES":
      case "USER_STATUS_UPDATE":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-cyan-50 text-cyan-800 border border-cyan-200">
            <User size={12} className="text-cyan-600" />
            Quản trị nhân sự
          </span>
        );
      case "SETTINGS_CHANGED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-slate-100 text-slate-800 border border-slate-300">
            <Settings size={12} className="text-slate-600" />
            Thay đổi cấu hình
          </span>
        );
      case "TICKET_REPLIED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
            <MessageSquare size={12} className="text-emerald-600" />
            Phản hồi CSKH
          </span>
        );
      case "VOUCHER_CREATED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-pink-50 text-pink-700 border border-pink-200">
            <Tag size={12} className="text-pink-600" />
            Tạo voucher
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono bg-slate-100 text-slate-700">
            {action}
          </span>
        );
    }
  };

  const renderSeverityBadge = (severity: AdminAuditLog["severity"]) => {
    switch (severity) {
      case "success":
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Thành công
          </span>
        );
      case "warning":
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-300 px-2 py-0.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Cảnh báo
          </span>
        );
      case "danger":
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" /> Hủy / Xóa
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" /> Thông tin
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header with KPI Cards */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Activity className="text-blue-600" size={24} />
            Nhật ký Hoạt động & Kiểm toán (Audit Logs)
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Ghi nhận toàn bộ vết lịch sử: Khách hàng mua hàng, Cổng thanh toán, Nhân viên đổi trạng thái đơn, Cập nhật sản phẩm & Cấp quyền truy cập
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onRefresh}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs"
            title="Tải lại nhật ký"
          >
            <RefreshCw size={14} /> Làm mới
          </button>

          <PermissionGate permission="logs.export" currentRole={currentRole}>
            <button
              onClick={handleExportCSV}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm"
              title="Xuất danh sách log ra file CSV"
            >
              <Download size={14} /> Xuất CSV
            </button>
          </PermissionGate>

          {onClearLogs && (
            <PermissionGate permission="logs.clear" currentRole={currentRole}>
              <button
                onClick={() => {
                  if (confirm("Bạn có chắc chắn muốn làm trống toàn bộ nhật ký kiểm toán không?")) onClearLogs();
                }}
                className="px-3 py-2 border border-slate-200 text-rose-600 hover:bg-rose-50 rounded-lg text-xs font-medium transition-all"
                title="Xóa sạch log (môi trường thử nghiệm)"
              >
                <Trash2 size={14} />
              </button>
            </PermissionGate>
          )}
        </div>
      </div>

      {/* 2. Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
            <Activity size={20} />
          </div>
          <div>
            <div className="text-xs text-slate-500">Tổng sự kiện ghi nhận</div>
            <div className="text-lg font-bold text-slate-900">{stats.total} log</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <ShoppingCart size={20} />
          </div>
          <div>
            <div className="text-xs text-slate-500">Đơn hàng & Thanh toán</div>
            <div className="text-lg font-bold text-emerald-700">{stats.ordersAndPayments} giao dịch</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
            <Package size={20} />
          </div>
          <div>
            <div className="text-xs text-slate-500">Sản phẩm & Tồn kho</div>
            <div className="text-lg font-bold text-purple-700">{stats.productsAndCats} tác vụ</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
            <ShieldCheck size={20} />
          </div>
          <div>
            <div className="text-xs text-slate-500">Phân quyền & Bảo mật</div>
            <div className="text-lg font-bold text-amber-700">{stats.securityAndRoles} lượt</div>
          </div>
        </div>
      </div>

      {/* 3. Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={15} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm theo người thực hiện, email, đối tượng (#NX-..., tên sản phẩm, IP)..."
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selectedModule}
              onChange={(e) => setSelectedModule(e.target.value)}
              className="text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="all">Tất cả phân hệ</option>
              <option value="Đơn hàng">Đơn hàng</option>
              <option value="Thanh toán">Thanh toán</option>
              <option value="Sản phẩm">Sản phẩm</option>
              <option value="Danh mục">Danh mục</option>
              <option value="Bộ sưu tập">Bộ sưu tập</option>
              <option value="Phân quyền">Phân quyền</option>
              <option value="Hệ thống">Hệ thống</option>
              <option value="CSKH">CSKH</option>
              <option value="Khuyến mãi">Khuyến mãi</option>
            </select>

            <select
              value={selectedSeverity}
              onChange={(e) => setSelectedSeverity(e.target.value)}
              className="text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="all">Mọi mức độ</option>
              <option value="success">Thành công</option>
              <option value="warning">Cảnh báo</option>
              <option value="danger">Hủy / Xóa</option>
              <option value="info">Thông tin</option>
            </select>

            <select
              value={selectedAction}
              onChange={(e) => setSelectedAction(e.target.value)}
              className="text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="all">Tất cả hành động</option>
              <option value="ORDER_CREATED">Tạo đơn hàng</option>
              <option value="ORDER_STATUS_CHANGED">Đổi trạng thái đơn</option>
              <option value="PAYMENT_INITIATED">Khởi tạo thanh toán</option>
              <option value="PAYMENT_CONFIRMED">Xác nhận thanh toán</option>
              <option value="PRODUCT_CREATED">Tạo sản phẩm</option>
              <option value="PRODUCT_UPDATED">Cập nhật sản phẩm</option>
              <option value="PRODUCT_RESTOCKED">Điều chỉnh tồn kho</option>
              <option value="CATEGORY_CREATED">Tạo danh mục</option>
              <option value="COLLECTION_CREATED">Tạo bộ sưu tập</option>
              <option value="COLLECTION_UPDATED">Cập nhật bộ sưu tập</option>
              <option value="PERMISSION_GRANTED">Cấp / thu hồi quyền</option>
              <option value="ROLE_CREATED">Tạo vai trò</option>
              <option value="ROLE_UPDATED">Cập nhật vai trò</option>
              <option value="ROLE_DELETED">Xóa vai trò</option>
              <option value="ASSIGN_ROLES">Phân quyền nhân sự</option>
              <option value="STAFF_INVITED">Tạo nhân sự</option>
              <option value="USER_STATUS_UPDATE">Khóa / Mở khóa nhân sự</option>
            </select>

            {(searchTerm || selectedModule !== "all" || selectedSeverity !== "all" || selectedAction !== "all") && (
              <button
                onClick={handleResetFilters}
                className="text-xs text-blue-600 hover:text-blue-800 font-semibold px-2 py-1"
              >
                Đặt lại
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 4. Audit Log Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[11px] font-semibold">
                <th className="py-3 px-4 w-44">THỜI GIAN / IP</th>
                <th className="py-3 px-4 w-52">NGƯỜI THỰC HIỆN (ACTOR)</th>
                <th className="py-3 px-4 w-44">HÀNH ĐỘNG</th>
                <th className="py-3 px-4 w-48">ĐỐI TƯỢNG (TARGET)</th>
                <th className="py-3 px-4">CHI TIẾT THAY ĐỔI</th>
                <th className="py-3 px-3 text-center w-24">THAO TÁC</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {displayedLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <Activity size={32} className="mx-auto mb-2 opacity-40" />
                    Không tìm thấy bản ghi hoạt động nào phù hợp với bộ lọc tìm kiếm.
                  </td>
                </tr>
              ) : (
                displayedLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-mono text-xs font-semibold text-slate-800">
                        {log.timestamp}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                        IP: {log.ipAddress || "127.0.0.1"}
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                            log.actor.isSystem
                              ? "bg-purple-100 text-purple-700"
                              : "bg-blue-100 text-blue-700"
                          }`}
                        >
                          {log.actor.isSystem ? "⚙" : log.actor.name.charAt(0)}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900 leading-tight">
                            {log.actor.name}
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded font-medium">
                              {log.actor.role}
                            </span>
                            {log.actor.email && (
                              <span className="text-[10px] text-slate-400 font-mono truncate max-w-27.5" title={log.actor.email}>
                                {log.actor.email}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <div>{renderActionBadge(log.action)}</div>
                      <div className="mt-1">{renderSeverityBadge(log.severity)}</div>
                    </td>

                    <td className="py-3 px-4">
                      <span className="font-bold text-xs text-slate-800 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded inline-block">
                        {log.target}
                      </span>
                      <div className="text-[10px] text-slate-400 font-medium mt-0.5">
                        Phân hệ: <span className="text-slate-600">{log.module}</span>
                      </div>
                    </td>

                    <td className="py-3 px-4 text-slate-700 leading-relaxed">
                      {log.description}
                    </td>

                    <td className="py-3 px-3 text-center">
                      <button
                        onClick={() => setActiveLog(log)}
                        className="px-2.5 py-1 text-[11px] font-semibold text-blue-600 hover:text-blue-800 hover:bg-blue-50 border border-blue-200 rounded-md transition-all inline-flex items-center gap-1"
                        title="Xem dữ liệu chi tiết JSON"
                      >
                        <Eye size={12} /> Chi tiết
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <AdminPagination pagination={pagination} itemLabel="nhật ký sự kiện" />
      </div>

      {/* 5. Detail Modal with Metadata JSON Payload */}
      {activeLog && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Terminal size={16} className="text-blue-600" />
                Chi tiết vết hoạt động #{activeLog.id}
              </h3>
              <button
                onClick={() => setActiveLog(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                <div>
                  <span className="text-[11px] text-slate-500 block">Người thực hiện:</span>
                  <strong className="text-slate-900">{activeLog.actor.name}</strong>
                  <div className="text-slate-500 font-mono text-[10px]">{activeLog.actor.role}</div>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 block">Thời gian & IP:</span>
                  <strong className="text-slate-900 font-mono">{activeLog.timestamp}</strong>
                  <div className="text-slate-500 font-mono text-[10px]">{activeLog.ipAddress}</div>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 block">Hành động:</span>
                  <div className="mt-1">{renderActionBadge(activeLog.action)}</div>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 block">Đối tượng tác động:</span>
                  <strong className="text-slate-900 mt-1 block">{activeLog.target}</strong>
                </div>
              </div>

              <div>
                <span className="font-bold text-slate-700 block mb-1">Mô tả đầy đủ:</span>
                <p className="p-2.5 bg-slate-50 border border-slate-200 rounded text-slate-800 leading-relaxed">
                  {activeLog.description}
                </p>
              </div>

              {activeLog.metadata && Object.keys(activeLog.metadata).length > 0 && (
                <div>
                  <span className="font-bold text-slate-700 block mb-1">Dữ liệu thay đổi (Metadata Payload):</span>
                  <pre className="p-3 bg-slate-900 text-emerald-400 rounded-lg font-mono text-[11px] overflow-x-auto max-h-48">
                    {JSON.stringify(activeLog.metadata, null, 2)}
                  </pre>
                </div>
              )}

              <div className="pt-2 border-t border-slate-100 flex justify-end">
                <button
                  onClick={() => setActiveLog(null)}
                  className="px-4 py-2 bg-slate-800 text-white rounded-lg text-xs font-semibold hover:bg-slate-900"
                >
                  Đóng cửa sổ
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
