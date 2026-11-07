import { useState, useMemo } from "react";
import type { AdminDiscount } from "../../services/admin/types";
import { usePagination } from "../usePagination";

export type DiscountStatusFilter = "all" | "active" | "expired";
export type DiscountTargetFilter = "all" | "first_order" | "collection" | "percent" | "fixed" | "freeship";

interface UseAdminDiscountsParams {
  discounts: AdminDiscount[];
  onSaveDiscount: (d: Partial<AdminDiscount>) => void;
}

export function useAdminDiscounts({ discounts, onSaveDiscount }: UseAdminDiscountsParams) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<DiscountStatusFilter>("all");
  const [targetFilter, setTargetFilter] = useState<DiscountTargetFilter>("all");
  const [showModal, setShowModal] = useState(false);
  const [editingDisc, setEditingDisc] = useState<AdminDiscount | null>(null);

  // Form states
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [discountType, setDiscountType] = useState<"PERCENT" | "FIXED" | "FREESHIP">("PERCENT");
  const [discountValue, setDiscountValue] = useState<number>(10);
  const [maxDiscount, setMaxDiscount] = useState<number>(1000000);
  const [minOrder, setMinOrder] = useState<number>(2000000);
  const [targetCustomer, setTargetCustomer] = useState<"ALL" | "FIRST_ORDER">("ALL");
  const [scopeType, setScopeType] = useState<"ALL" | "PRODUCT" | "COLLECTION" | "CATEGORY">("ALL");
  const [applicableCollections, setApplicableCollections] = useState("");
  const [applicableProductIds, setApplicableProductIds] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [expiresAt, setExpiresAt] = useState("31/12/2026");
  const [usageLimit, setUsageLimit] = useState(500);
  const [status, setStatus] = useState<"active" | "expired">("active");

  const filteredDiscounts = useMemo(() => {
    const q = search.toLowerCase().trim();
    return discounts.filter((d) => {
      const matchStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && d.status === "active") ||
        (statusFilter === "expired" && d.status !== "active");

      const matchTarget =
        targetFilter === "all" ||
        (targetFilter === "first_order" && d.targetCustomer === "FIRST_ORDER") ||
        (targetFilter === "collection" && d.scopeType === "COLLECTION") ||
        (targetFilter === "percent" && (d.discountType === "PERCENT" || (!d.discountType && d.discountPercent > 0))) ||
        (targetFilter === "fixed" && d.discountType === "FIXED") ||
        (targetFilter === "freeship" && d.discountType === "FREESHIP");

      const matchSearch =
        !q ||
        d.code.toLowerCase().includes(q) ||
        (d.name && d.name.toLowerCase().includes(q)) ||
        d.description.toLowerCase().includes(q) ||
        (d.applicableCollections && d.applicableCollections.toLowerCase().includes(q));

      return matchStatus && matchTarget && matchSearch;
    });
  }, [discounts, search, statusFilter, targetFilter]);

  const pagination = usePagination(filteredDiscounts, 6, [search, statusFilter, targetFilter]);

  const openCreate = () => {
    setEditingDisc(null);
    setCode("");
    setName("");
    setDescription("");
    setDiscountType("PERCENT");
    setDiscountValue(10);
    setMaxDiscount(1000000);
    setMinOrder(2000000);
    setTargetCustomer("ALL");
    setScopeType("ALL");
    setApplicableCollections("");
    setApplicableProductIds("");
    setStartsAt("");
    setExpiresAt("31/12/2026");
    setUsageLimit(500);
    setStatus("active");
    setShowModal(true);
  };

  const openEdit = (d: AdminDiscount) => {
    setEditingDisc(d);
    setCode(d.code);
    setName(d.name || d.code);
    setDescription(d.description);
    const dtype = d.discountType || (d.discountPercent > 0 ? "PERCENT" : "FIXED");
    setDiscountType(dtype);
    setDiscountValue(d.discountValue ?? (dtype === "PERCENT" ? d.discountPercent : d.maxDiscount));
    setMaxDiscount(d.maxDiscount);
    setMinOrder(d.minOrder);
    setTargetCustomer(d.targetCustomer || "ALL");
    setScopeType(d.scopeType || "ALL");
    setApplicableCollections(d.applicableCollections || "");
    setApplicableProductIds(d.applicableProductIds || "");
    setStartsAt(d.startsAt || "");
    setExpiresAt(d.expiresAt || "");
    setUsageLimit(d.usageLimit || 500);
    setStatus(d.status === "active" ? "active" : "expired");
    setShowModal(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const val = Number(discountValue);
    const pct = discountType === "PERCENT" ? val : 0;
    const maxD = discountType === "PERCENT" ? Number(maxDiscount) : val;

    onSaveDiscount({
      id: editingDisc ? editingDisc.id : undefined,
      code: code.toUpperCase().trim(),
      name: name.trim() || code.toUpperCase().trim(),
      description: description.trim(),
      discountType,
      discountValue: val,
      discountPercent: pct,
      maxDiscount: maxD,
      minOrder: Number(minOrder),
      targetCustomer,
      scopeType,
      applicableCollections: applicableCollections.trim(),
      applicableProductIds: applicableProductIds.trim(),
      startsAt: startsAt || undefined,
      expiresAt: expiresAt || "31/12/2026",
      usageLimit: Number(usageLimit) || 500,
      usedCount: editingDisc ? editingDisc.usedCount : 0,
      status,
    });
    setShowModal(false);
  };

  return {
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    targetFilter,
    setTargetFilter,
    filteredDiscounts,
    pagination,
    showModal,
    setShowModal,
    editingDisc,
    code,
    setCode,
    name,
    setName,
    description,
    setDescription,
    discountType,
    setDiscountType,
    discountValue,
    setDiscountValue,
    maxDiscount,
    setMaxDiscount,
    minOrder,
    setMinOrder,
    targetCustomer,
    setTargetCustomer,
    scopeType,
    setScopeType,
    applicableCollections,
    setApplicableCollections,
    applicableProductIds,
    setApplicableProductIds,
    startsAt,
    setStartsAt,
    expiresAt,
    setExpiresAt,
    usageLimit,
    setUsageLimit,
    status,
    setStatus,
    openCreate,
    openEdit,
    handleSave,
  };
}
