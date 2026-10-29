import { useState, useMemo } from "react";
import type { AdminDiscount } from "../../services/admin/types";
import { usePagination } from "../usePagination";

export type DiscountStatusFilter = "all" | "active" | "expired";

interface UseAdminDiscountsParams {
  discounts: AdminDiscount[];
  onSaveDiscount: (d: Partial<AdminDiscount>) => void;
}

export function useAdminDiscounts({ discounts, onSaveDiscount }: UseAdminDiscountsParams) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<DiscountStatusFilter>("all");
  const [showModal, setShowModal] = useState(false);
  const [editingDisc, setEditingDisc] = useState<AdminDiscount | null>(null);

  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [discountPercent, setDiscountPercent] = useState(10);
  const [maxDiscount, setMaxDiscount] = useState(2000000);
  const [minOrder, setMinOrder] = useState(5000000);
  const [expiresAt, setExpiresAt] = useState("31/12/2026");

  const filteredDiscounts = useMemo(() => {
    const q = search.toLowerCase().trim();
    return discounts.filter((d) => {
      const matchStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && d.status === "active") ||
        (statusFilter === "expired" && d.status !== "active");
      const matchSearch =
        !q ||
        d.code.toLowerCase().includes(q) ||
        d.description.toLowerCase().includes(q);
      return matchStatus && matchSearch;
    });
  }, [discounts, search, statusFilter]);

  const pagination = usePagination(filteredDiscounts, 6, [search, statusFilter]);

  const openCreate = () => {
    setEditingDisc(null);
    setCode("");
    setDescription("");
    setDiscountPercent(10);
    setMaxDiscount(2000000);
    setMinOrder(5000000);
    setExpiresAt("31/12/2026");
    setShowModal(true);
  };

  const openEdit = (d: AdminDiscount) => {
    setEditingDisc(d);
    setCode(d.code);
    setDescription(d.description);
    setDiscountPercent(d.discountPercent);
    setMaxDiscount(d.maxDiscount);
    setMinOrder(d.minOrder);
    setExpiresAt(d.expiresAt);
    setShowModal(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveDiscount({
      id: editingDisc ? editingDisc.id : undefined,
      code: code.toUpperCase().trim(),
      description,
      discountPercent: Number(discountPercent),
      maxDiscount: Number(maxDiscount),
      minOrder: Number(minOrder),
      expiresAt,
      status: "active",
      usageLimit: editingDisc ? editingDisc.usageLimit : 500,
      usedCount: editingDisc ? editingDisc.usedCount : 0,
    });
    setShowModal(false);
  };

  return {
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    filteredDiscounts,
    pagination,
    showModal,
    setShowModal,
    editingDisc,
    code,
    setCode,
    description,
    setDescription,
    discountPercent,
    setDiscountPercent,
    maxDiscount,
    setMaxDiscount,
    minOrder,
    setMinOrder,
    expiresAt,
    setExpiresAt,
    openCreate,
    openEdit,
    handleSave,
  };
}

