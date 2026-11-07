import { useState, useMemo } from "react";
import type { AdminProduct, ProductVariant, AdminCategory } from "../../services/admin/types";
import { generateSlug } from "../../services/admin/adminService";
import type { AdminProductInput } from "../../services/admin/catalogApi";
import { usePagination } from "../usePagination";

export type ProductStockFilter = "all" | "in_stock" | "low_stock" | "out_of_stock";
export type ProductBusinessFilter = "all" | "new" | "preorder" | "in_stock";
export type ProductSortBy = "default" | "price_asc" | "price_desc" | "stock_asc" | "stock_desc" | "name_asc";

interface UseAdminProductsParams {
  products: AdminProduct[];
  categories: AdminCategory[];
  onSaveProduct: (prod: AdminProductInput) => Promise<void>;
  onDeleteProduct?: (id: number) => Promise<void> | void;
  onRestoreProduct?: (id: number) => Promise<void> | void;
}

export function useAdminProducts({
  products,
  categories,
  onSaveProduct,
  onDeleteProduct,
  onRestoreProduct,
}: UseAdminProductsParams) {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [stockFilter, setStockFilter] = useState<ProductStockFilter>("all");
  const [businessFilter, setBusinessFilter] = useState<ProductBusinessFilter>("all");
  const [sortBy, setSortBy] = useState<ProductSortBy>("default");
  const [activeTab, setActiveTab] = useState<"active" | "trash">("active");

  // Toast feedback thông báo
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<"success" | "warning" | "info">("success");

  const showToast = (msg: string, type: "success" | "warning" | "info" = "success") => {
    setToastMessage(msg);
    setToastType(type);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3500);
  };

  // Modal Sản phẩm chính
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<AdminProduct | null>(null);

  // Modal Chi tiết xem nhanh Sản phẩm
  const [viewingProduct, setViewingProduct] = useState<AdminProduct | null>(null);

  // Form states cho Sản phẩm
  const [formName, setFormName] = useState("");
  const [formSlug, setFormSlug] = useState("");
  const [formCategoryId, setFormCategoryId] = useState("");
  const [formPrice, setFormPrice] = useState(25000000);
  const [formStock, setFormStock] = useState(10);
  const [formDescription, setFormDescription] = useState("");
  const [formImage, setFormImage] = useState("");
  const [formImage2, setFormImage2] = useState("");
  const [formModel3dUrl, setFormModel3dUrl] = useState("");
  const [formIsPreorder, setFormIsPreorder] = useState(false);
  const [formIsNew, setFormIsNew] = useState(true);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [model3dFile, setModel3dFile] = useState<File | null>(null);
  const [submitError, setSubmitError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [formVariants, setFormVariants] = useState<ProductVariant[]>([]);

  // Modal Biến thể (Variant)
  const [showVariantModal, setShowVariantModal] = useState(false);
  const [editingVariantIndex, setEditingVariantIndex] = useState<number | null>(null);
  const [varSku, setVarSku] = useState("");
  const [varColor, setVarColor] = useState("");
  const [varSize, setVarSize] = useState("");
  const [varMaterial, setVarMaterial] = useState("");
  const [varPrice, setVarPrice] = useState(25000000);
  const [varStock, setVarStock] = useState(5);

  const activeCategories = useMemo(
    () => categories.filter((c) => !c.isDeleted),
    [categories]
  );

  const getProductTotalStock = (p: AdminProduct) =>
    p.variants && p.variants.length > 0
      ? p.variants.reduce((s, v) => s + v.stock, 0)
      : p.stock;

  const filteredProducts = useMemo(() => {
    const q = search.toLowerCase().trim();
    const list = products.filter((p) => {
      const matchState = activeTab === "trash" ? p.isDeleted : !p.isDeleted;
      const matchSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.slug.toLowerCase().includes(q) ||
        p.variants?.some((v) => v.sku.toLowerCase().includes(q));
      const matchCategory =
        categoryFilter === "all" || p.categoryId === categoryFilter || p.category === categoryFilter;

      const totalStock = getProductTotalStock(p);
      const matchStock =
        stockFilter === "all" ||
        (stockFilter === "in_stock" && totalStock >= 10) ||
        (stockFilter === "low_stock" && totalStock > 0 && totalStock < 10) ||
        (stockFilter === "out_of_stock" && totalStock <= 0);

      const matchBusiness =
        businessFilter === "all" ||
        (businessFilter === "new" && Boolean(p.isNew)) ||
        (businessFilter === "preorder" && Boolean(p.isPreorder)) ||
        (businessFilter === "in_stock" && !p.isPreorder && totalStock > 0);

      return matchState && matchSearch && matchCategory && matchStock && matchBusiness;
    });

    if (sortBy === "default") return list;
    return [...list].sort((a, b) => {
      if (sortBy === "price_asc") return a.price - b.price;
      if (sortBy === "price_desc") return b.price - a.price;
      if (sortBy === "stock_asc") return getProductTotalStock(a) - getProductTotalStock(b);
      if (sortBy === "stock_desc") return getProductTotalStock(b) - getProductTotalStock(a);
      if (sortBy === "name_asc") return a.name.localeCompare(b.name, "vi");
      return 0;
    });
  }, [products, activeTab, search, categoryFilter, stockFilter, businessFilter, sortBy]);

  const counts = useMemo(() => {
    const active = products.filter((p) => !p.isDeleted);
    return {
      all: active.length,
      new: active.filter((p) => Boolean(p.isNew)).length,
      preorder: active.filter((p) => Boolean(p.isPreorder)).length,
      trash: products.filter((p) => p.isDeleted).length,
    };
  }, [products]);

  const pagination = usePagination(filteredProducts, 10, [
    activeTab,
    search,
    categoryFilter,
    stockFilter,
    businessFilter,
    sortBy,
  ]);

  const handleOpenAdd = () => {
    setEditingProduct(null);
    setFormName("");
    setFormSlug("");
    setFormCategoryId(activeCategories[0]?.id || "cat-sofa");
    setFormPrice(25000000);
    setFormStock(10);
    setFormDescription("");
    setFormImage("");
    setFormImage2("");
    setFormModel3dUrl("");
    setFormIsPreorder(false);
    setFormIsNew(true);
    setImageFiles([]);
    setModel3dFile(null);
    setSubmitError("");
    setFormVariants([]);
    setShowProductModal(true);
  };

  const handleOpenEdit = (p: AdminProduct) => {
    setEditingProduct(p);
    setFormName(p.name);
    setFormSlug(p.slug);
    setFormCategoryId(p.categoryId || activeCategories[0]?.id || "");
    setFormPrice(p.price);
    setFormStock(p.stock);
    setFormDescription(p.description || "");
    setFormImage(p.image);
    setFormImage2(p.image2 || "");
    setFormModel3dUrl(p.model3dUrl || "");
    setFormIsPreorder(Boolean(p.isPreorder));
    setFormIsNew(Boolean(p.isNew));
    setImageFiles([]);
    setModel3dFile(null);
    setSubmitError("");
    setFormVariants(p.variants || []);
    setShowProductModal(true);
  };

  const handleNameChange = (val: string) => {
    setFormName(val);
    if (!editingProduct) {
      setFormSlug(generateSlug(val));
    }
  };

  // ── Kiểm tra trùng lặp slug sản phẩm ──
  const isSlugDuplicate = useMemo(() => {
    const slug = formSlug.trim().toLowerCase();
    if (!slug) return false;
    return products.some(
      (p) => p.slug && p.slug.toLowerCase() === slug && p.id !== editingProduct?.id
    );
  }, [formSlug, products, editingProduct]);

  // Gợi ý slug duy nhất (tự thêm hậu tố -1, -2...)
  const suggestedSlug = useMemo(() => {
    if (!isSlugDuplicate) return formSlug;
    const base = (formSlug.trim() || generateSlug(formName.trim())).toLowerCase();
    let count = 1;
    let candidate = `${base}-${count}`;
    while (
      products.some(
        (p) => p.slug && p.slug.toLowerCase() === candidate && p.id !== editingProduct?.id
      )
    ) {
      count++;
      candidate = `${base}-${count}`;
    }
    return candidate;
  }, [isSlugDuplicate, formSlug, formName, products, editingProduct]);

  const handleApplySuggestedSlug = () => {
    setFormSlug(suggestedSlug);
  };

  const handleFormStockChange = (val: number) => {
    const safeVal = Math.max(0, val);
    setFormStock(safeVal);
    if (formVariants.length === 1) {
      setFormVariants((prev) => [{ ...prev[0], stock: safeVal }]);
    }
  };

  const handleSubmitProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;
    setSubmitError("");
    setIsSaving(true);

    try {
      const matchedCat = categories.find((c) => c.id === formCategoryId);
      let variantsToSave = [...formVariants];
      if (variantsToSave.length === 1) {
        variantsToSave[0] = { ...variantsToSave[0], stock: Number(formStock) };
      } else if (variantsToSave.length === 0 && editingProduct?.variants?.length === 1) {
        variantsToSave = [{ ...editingProduct.variants[0], stock: Number(formStock) }];
      }

      const finalStock =
        variantsToSave.length > 1
          ? variantsToSave.reduce((sum, v) => sum + v.stock, 0)
          : Number(formStock);

      const isEdit = Boolean(editingProduct);
      const prodName = formName.trim();
      const finalSlug = isSlugDuplicate
        ? suggestedSlug
        : formSlug.trim() || generateSlug(formName.trim());
      await onSaveProduct({
        id: editingProduct ? editingProduct.id : undefined,
        name: formName.trim(),
        slug: finalSlug,
        categoryId: formCategoryId,
        category: matchedCat ? matchedCat.name : "",
        price: Number(formPrice),
        stock: finalStock,
        description: formDescription.trim() || undefined,
        image: formImage.trim(),
        image2: formImage2.trim() || undefined,
        model3dUrl: formModel3dUrl.trim() || undefined,
        imageFiles,
        model3dFile,
        variants: variantsToSave,
        status: finalStock > 0 ? "active" : "out_of_stock",
        isPreorder: formIsPreorder,
        stockStatus: formIsPreorder ? "PRE_ORDER" : finalStock > 0 ? "IN_STOCK" : "OUT_OF_STOCK",
        isNew: formIsNew,
      });
      setShowProductModal(false);
      showToast(
        `Đã ${isEdit ? "cập nhật" : "thêm mới"} sản phẩm "${prodName}" thành công!`,
        "success"
      );
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Không thể lưu sản phẩm.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteProduct = async (id: number) => {
    const target = products.find((p) => p.id === id);
    if (!window.confirm(`Bạn có chắc chắn muốn chuyển sản phẩm "${target?.name || id}" vào thùng rác?`)) {
      return;
    }
    try {
      await onDeleteProduct?.(id);
      showToast(`Đã chuyển sản phẩm "${target?.name || id}" vào thùng rác!`, "warning");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Không thể xóa sản phẩm", "warning");
    }
  };

  const handleRestoreProduct = async (id: number) => {
    const target = products.find((p) => p.id === id);
    try {
      await onRestoreProduct?.(id);
      showToast(`Đã khôi phục sản phẩm "${target?.name || id}" thành công!`, "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Không thể khôi phục sản phẩm", "warning");
    }
  };

  const handleOpenAddVariant = () => {
    setEditingVariantIndex(null);
    const baseSku = formSlug ? formSlug.toUpperCase().slice(0, 10) : "NX-VAR";
    setVarSku(`${baseSku}-${formVariants.length + 1}`);
    setVarColor("Xám khói");
    setVarSize("Tiêu chuẩn");
    setVarMaterial("Vải cao cấp / Gỗ tự nhiên");
    setVarPrice(formPrice);
    setVarStock(5);
    setShowVariantModal(true);
  };

  const handleOpenEditVariant = (idx: number) => {
    const v = formVariants[idx];
    setEditingVariantIndex(idx);
    setVarSku(v.sku);
    setVarColor(v.color);
    setVarSize(v.size);
    setVarMaterial(v.material);
    setVarPrice(v.price);
    setVarStock(v.stock);
    setShowVariantModal(true);
  };

  const handleSaveVariant = (e: React.FormEvent) => {
    e.preventDefault();
    if (!varSku.trim()) return;

    const newVar: ProductVariant = {
      id: editingVariantIndex !== null ? formVariants[editingVariantIndex].id : `var-${Date.now()}`,
      sku: varSku.trim().toUpperCase(),
      color: varColor,
      size: varSize,
      material: varMaterial,
      price: Number(varPrice),
      stock: Number(varStock),
    };

    if (editingVariantIndex !== null) {
      setFormVariants((prev) => {
        const next = prev.map((item, i) => (i === editingVariantIndex ? newVar : item));
        setFormStock(next.reduce((sum, v) => sum + v.stock, 0));
        return next;
      });
    } else {
      setFormVariants((prev) => {
        const next = [...prev, newVar];
        setFormStock(next.reduce((sum, v) => sum + v.stock, 0));
        return next;
      });
    }

    setShowVariantModal(false);
  };

  const handleDeleteVariant = (idx: number) => {
    setFormVariants((prev) => {
      const next = prev.filter((_, i) => i !== idx);
      if (next.length > 0) {
        setFormStock(next.reduce((sum, v) => sum + v.stock, 0));
      }
      return next;
    });
  };

  return {
    search,
    setSearch,
    categoryFilter,
    setCategoryFilter,
    stockFilter,
    setStockFilter,
    businessFilter,
    setBusinessFilter,
    sortBy,
    setSortBy,
    activeTab,
    setActiveTab,
    counts,
    activeCategories,
    filteredProducts,
    pagination,
    getProductTotalStock,
    showProductModal,
    setShowProductModal,
    editingProduct,
    viewingProduct,
    setViewingProduct,
    formName,
    formSlug,
    setFormSlug,
    isSlugDuplicate,
    suggestedSlug,
    handleApplySuggestedSlug,
    formCategoryId,
    setFormCategoryId,
    formPrice,
    setFormPrice,
    formStock,
    setFormStock,
    handleFormStockChange,
    formDescription,
    setFormDescription,
    formImage,
    setFormImage,
    formImage2,
    setFormImage2,
    formModel3dUrl,
    setFormModel3dUrl,
    formIsPreorder,
    setFormIsPreorder,
    formIsNew,
    setFormIsNew,
    imageFiles,
    setImageFiles,
    model3dFile,
    setModel3dFile,
    submitError,
    setSubmitError,
    isSaving,
    formVariants,
    showVariantModal,
    setShowVariantModal,
    editingVariantIndex,
    varSku,
    setVarSku,
    varColor,
    setVarColor,
    varSize,
    setVarSize,
    varMaterial,
    setVarMaterial,
    varPrice,
    setVarPrice,
    varStock,
    setVarStock,
    handleOpenAdd,
    handleOpenEdit,
    handleNameChange,
    handleSubmitProduct,
    handleOpenAddVariant,
    handleOpenEditVariant,
    handleSaveVariant,
    handleDeleteVariant,
    toastMessage,
    setToastMessage,
    toastType,
    showToast,
    handleDeleteProduct,
    handleRestoreProduct,
  };
}

