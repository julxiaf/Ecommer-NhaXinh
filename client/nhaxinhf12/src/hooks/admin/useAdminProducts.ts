import { useState, useMemo } from "react";
import type { AdminProduct, ProductVariant, AdminCategory } from "../../services/admin/types";
import { generateSlug } from "../../services/admin/adminService";
import type { AdminProductInput } from "../../services/admin/catalogApi";
import { usePagination } from "../usePagination";

export type ProductStockFilter = "all" | "in_stock" | "low_stock" | "out_of_stock";
export type ProductSortBy = "default" | "price_asc" | "price_desc" | "stock_asc" | "stock_desc" | "name_asc";

interface UseAdminProductsParams {
  products: AdminProduct[];
  categories: AdminCategory[];
  onSaveProduct: (prod: AdminProductInput) => Promise<void>;
}

export function useAdminProducts({ products, categories, onSaveProduct }: UseAdminProductsParams) {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [stockFilter, setStockFilter] = useState<ProductStockFilter>("all");
  const [sortBy, setSortBy] = useState<ProductSortBy>("default");
  const [activeTab, setActiveTab] = useState<"active" | "trash">("active");

  // Modal Sản phẩm chính
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<AdminProduct | null>(null);

  // Form states cho Sản phẩm
  const [formName, setFormName] = useState("");
  const [formSlug, setFormSlug] = useState("");
  const [formCategoryId, setFormCategoryId] = useState("");
  const [formPrice, setFormPrice] = useState(25000000);
  const [formStock, setFormStock] = useState(10);
  const [formImage, setFormImage] = useState("");
  const [formImage2, setFormImage2] = useState("");
  const [formModel3dUrl, setFormModel3dUrl] = useState("");
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

      return matchState && matchSearch && matchCategory && matchStock;
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
  }, [products, activeTab, search, categoryFilter, stockFilter, sortBy]);

  const pagination = usePagination(filteredProducts, 10, [
    activeTab,
    search,
    categoryFilter,
    stockFilter,
    sortBy,
  ]);

  const handleOpenAdd = () => {
    setEditingProduct(null);
    setFormName("");
    setFormSlug("");
    setFormCategoryId(activeCategories[0]?.id || "cat-sofa");
    setFormPrice(25000000);
    setFormStock(10);
    setFormImage("");
    setFormImage2("");
    setFormModel3dUrl("");
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
    setFormImage(p.image);
    setFormImage2(p.image2 || "");
    setFormModel3dUrl(p.model3dUrl || "");
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

  const handleSubmitProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;
    setSubmitError("");
    setIsSaving(true);

    try {
      const matchedCat = categories.find((c) => c.id === formCategoryId);
      const finalStock =
        formVariants.length > 0
          ? formVariants.reduce((sum, v) => sum + v.stock, 0)
          : Number(formStock);

      await onSaveProduct({
        id: editingProduct ? editingProduct.id : undefined,
        name: formName.trim(),
        slug: formSlug.trim() || generateSlug(formName.trim()),
        categoryId: formCategoryId,
        category: matchedCat ? matchedCat.name : "",
        price: Number(formPrice),
        stock: finalStock,
        image: formImage.trim(),
        image2: formImage2.trim() || undefined,
        model3dUrl: formModel3dUrl.trim() || undefined,
        imageFiles,
        model3dFile,
        variants: formVariants,
        status: finalStock > 0 ? "active" : "out_of_stock",
      });
      setShowProductModal(false);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Không thể lưu sản phẩm.");
    } finally {
      setIsSaving(false);
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
      setFormVariants((prev) => prev.map((item, i) => (i === editingVariantIndex ? newVar : item)));
    } else {
      setFormVariants((prev) => [...prev, newVar]);
    }

    setShowVariantModal(false);
  };

  const handleDeleteVariant = (idx: number) => {
    setFormVariants((prev) => prev.filter((_, i) => i !== idx));
  };

  return {
    search,
    setSearch,
    categoryFilter,
    setCategoryFilter,
    stockFilter,
    setStockFilter,
    sortBy,
    setSortBy,
    activeTab,
    setActiveTab,
    activeCategories,
    filteredProducts,
    pagination,
    getProductTotalStock,
    showProductModal,
    setShowProductModal,
    editingProduct,
    formName,
    formSlug,
    setFormSlug,
    formCategoryId,
    setFormCategoryId,
    formPrice,
    setFormPrice,
    formStock,
    setFormStock,
    formImage,
    setFormImage,
    formImage2,
    setFormImage2,
    formModel3dUrl,
    setFormModel3dUrl,
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
  };
}

