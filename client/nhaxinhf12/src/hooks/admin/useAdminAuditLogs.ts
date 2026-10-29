import { useState, useMemo } from "react";
import type { AdminAuditLog } from "../../services/admin/types";
import { usePagination } from "../usePagination";

export function useAdminAuditLogs(logs: AdminAuditLog[]) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedModule, setSelectedModule] = useState<string>("all");
  const [selectedSeverity, setSelectedSeverity] = useState<string>("all");
  const [selectedAction, setSelectedAction] = useState<string>("all");
  const [activeLog, setActiveLog] = useState<AdminAuditLog | null>(null);

  const stats = useMemo(() => {
    const total = logs.length;
    const ordersAndPayments = logs.filter(
      (l) => l.module === "Đơn hàng" || l.module === "Thanh toán"
    ).length;
    const productsAndCats = logs.filter(
      (l) => l.module === "Sản phẩm" || l.module === "Danh mục" || l.module === "Bộ sưu tập"
    ).length;
    const securityAndRoles = logs.filter(
      (l) => l.module === "Phân quyền" || l.module === "Hệ thống"
    ).length;
    return { total, ordersAndPayments, productsAndCats, securityAndRoles };
  }, [logs]);

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      if (searchTerm) {
        const query = searchTerm.toLowerCase();
        const matchActor =
          log.actor.name.toLowerCase().includes(query) ||
          (log.actor.email && log.actor.email.toLowerCase().includes(query));
        const matchTarget = log.target.toLowerCase().includes(query);
        const matchDesc = log.description.toLowerCase().includes(query);
        const matchIp = log.ipAddress && log.ipAddress.toLowerCase().includes(query);
        const matchMetadata = JSON.stringify(log.metadata || {}).toLowerCase().includes(query);
        if (!matchActor && !matchTarget && !matchDesc && !matchIp && !matchMetadata) return false;
      }

      if (selectedModule !== "all" && log.module !== selectedModule) return false;
      if (selectedSeverity !== "all" && log.severity !== selectedSeverity) return false;
      if (selectedAction !== "all" && log.action !== selectedAction) return false;

      return true;
    });
  }, [logs, searchTerm, selectedModule, selectedSeverity, selectedAction]);

  const pagination = usePagination(filteredLogs, 10, [
    searchTerm,
    selectedModule,
    selectedSeverity,
    selectedAction,
  ]);

  const handleResetFilters = () => {
    setSearchTerm("");
    setSelectedModule("all");
    setSelectedSeverity("all");
    setSelectedAction("all");
  };

  const handleExportCSV = () => {
    const headers = [
      "ID",
      "Thời gian",
      "Người thực hiện",
      "Email",
      "Vai trò",
      "Hành động",
      "Phân hệ",
      "Đối tượng",
      "Mô tả",
      "IP",
      "Mức độ",
      "Chi tiết",
    ];
    const escapeCsv = (value: string) => `"${value.replace(/"/g, '""')}"`;
    const rows = filteredLogs.map((l) =>
      [
        l.id,
        l.timestamp,
        l.actor.name,
        l.actor.email || "",
        l.actor.role,
        l.action,
        l.module,
        l.target,
        l.description,
        l.ipAddress || "",
        l.severity,
        JSON.stringify(l.metadata || {}),
      ].map(escapeCsv)
    );

    const csvContent =
      "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return {
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
    filteredLogs,
    pagination,
    handleResetFilters,
    handleExportCSV,
  };
}

