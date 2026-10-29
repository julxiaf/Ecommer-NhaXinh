import { useState, useMemo } from "react";
import type { AdminCategory } from "../../services/admin/types";
import { generateSlug } from "../../services/admin/adminService";
import { usePagination } from "../usePagination";

export type CategoryLevelFilter = "all" | "parent" | "child" | "collection";

interface UseAdminCategoriesParams {
  categories: AdminCategory[];
  onSaveCategory: (cat: Partial<AdminCategory>) => Promise<void>;
  onDeleteCategory: (id: string) => Promise<void>;
  onRestoreCategory: (id: string) => Promise<void>;
}

export function useAdminCategories({
  categories,
  onSaveCategory,
  onDeleteCategory,
  onRestoreCategory,
}: UseAdminCategoriesParams) {
  const [search, setSearch] = useState("");
  const [levelFilter, setLevelFilter] = useState<CategoryLevelFilter>("all");
  const [activeTab, setActiveTab] = useState<"active" | "collections" | "trash">("active");
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<AdminCategory | null>(null);

  const [formName, setFormName] = useState("");
  const [formSlug, setFormSlug] = useState("");
  const [formParentId, setFormParentId] = useState<string | "none">("none");
  const [formOrder, setFormOrder] = useState(1);
  const [formDescription, setFormDescription] = useState("");
  const [formImageUrl, setFormImageUrl] = useState("");
  const [formIsCollection, setFormIsCollection] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3500);
  };

  const isCollectionItem = (c: AdminCategory) =>
    Boolean(
      c.isCollection ||
        c.slug === "bo-suu-tap" ||
        c.parentId === "cat-collections" ||
        c.slug.includes("victoria") ||
        c.slug.includes("duong-dai") ||
        c.slug.includes("osaka") ||
        c.slug.includes("coastal")
    );

  const parentCategories = useMemo(
    () => categories.filter((c) => !c.parentId && !c.isDeleted),
    [categories]
  );

  const collectionsList = useMemo(
    () => categories.filter((c) => !c.isDeleted && isCollectionItem(c)),
    [categories]
  );

  const filteredCategories = useMemo(() => {
    const q = search.toLowerCase().trim();
    return categories.filter((c) => {
      if (activeTab === "trash") {
        if (!c.isDeleted) return false;
      } else if (activeTab === "collections") {
        if (c.isDeleted || !isCollectionItem(c)) return false;
      } else {
        if (c.isDeleted) return false;
      }

      const matchSearch =
        !q ||
        c.name.toLowerCase().includes(q) ||
        c.slug.toLowerCase().includes(q) ||
        (c.description || "").toLowerCase().includes(q);
      const matchLevel =
        levelFilter === "all" ||
        (levelFilter === "parent" && !c.parentId) ||
        (levelFilter === "child" && Boolean(c.parentId)) ||
        (levelFilter === "collection" && isCollectionItem(c));
      return matchSearch && matchLevel;
    });
  }, [categories, activeTab, search, levelFilter]);

  // Xây dựng cây phân cấp (Hierarchy Tree: Parent -> Children)
  const categoryTree = useMemo(() => {
    if (levelFilter === "child" || levelFilter === "collection" || activeTab === "collections") {
      return filteredCategories.map((c) => ({ ...c, children: [] as AdminCategory[] }));
    }
    const parents = filteredCategories.filter((c) => !c.parentId);
    return parents.map((p) => ({
      ...p,
      children:
        levelFilter === "parent"
          ? []
          : categories.filter(
              (child) =>
                !child.isDeleted &&
                child.parentId === p.id &&
                (!search.trim() ||
                  child.name.toLowerCase().includes(search.toLowerCase()) ||
                  child.slug.toLowerCase().includes(search.toLowerCase()) ||
                  p.name.toLowerCase().includes(search.toLowerCase()))
            ),
    }));
  }, [filteredCategories, categories, levelFilter, activeTab, search]);

  const activePagination = usePagination(categoryTree, 10, [activeTab, search, levelFilter]);
  const trashPagination = usePagination(filteredCategories, 10, [activeTab, search, levelFilter]);

  const handleOpenAdd = (defaultParentId?: string, defaultIsCollection = false) => {
    setEditingCategory(null);
    setFormName("");
    setFormSlug("");
    const collectionParent = categories.find((c) => c.slug === "bo-suu-tap");
    if (defaultIsCollection && !defaultParentId && collectionParent) {
      setFormParentId(collectionParent.id);
    } else {
      setFormParentId(defaultParentId || "none");
    }
    setFormOrder(categories.length + 1);
    setFormDescription("");
    setFormImageUrl("");
    setFormIsCollection(defaultIsCollection || activeTab === "collections");
    setSubmitError("");
    setShowModal(true);
  };

  const handleOpenEdit = (cat: AdminCategory) => {
    setEditingCategory(cat);
    setFormName(cat.name);
    setFormSlug(cat.slug);
    setFormParentId(cat.parentId || "none");
    setFormOrder(cat.order);
    setFormDescription(cat.description || "");
    setFormImageUrl(cat.imageUrl || "");
    setFormIsCollection(isCollectionItem(cat));
    setSubmitError("");
    setShowModal(true);
  };

  const handleNameChange = (val: string) => {
    setFormName(val);
    if (!editingCategory) {
      setFormSlug(generateSlug(val));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    setSubmitError("");
    try {
      const label = formIsCollection ? "bộ sưu tập" : "danh mục";
      await onSaveCategory({
        id: editingCategory?.id,
        name: formName.trim(),
        slug: formSlug.trim() || generateSlug(formName.trim()),
        parentId: formParentId === "none" ? null : formParentId,
        order: Number(formOrder),
        description: formDescription.trim() || undefined,
        imageUrl: formImageUrl.trim() || undefined,
        isCollection: formIsCollection,
      });
      setShowModal(false);
      showToast(
        `Đã ${editingCategory ? "cập nhật" : "tạo mới"} ${label} "${formName.trim()}" và ghi vào Nhật ký Hoạt động.`
      );
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Không thể lưu danh mục / bộ sưu tập.");
    }
  };

  const handleDelete = async (id: string) => {
    setSubmitError("");
    try {
      const target = categories.find((c) => c.id === id);
      await onDeleteCategory(id);
      showToast(`Đã chuyển "${target?.name || id}" vào thùng rác và ghi vào Nhật ký Hoạt động.`);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Không thể chuyển danh mục vào thùng rác.");
    }
  };

  const handleRestore = async (id: string) => {
    setSubmitError("");
    try {
      const target = categories.find((c) => c.id === id);
      await onRestoreCategory(id);
      showToast(`Đã khôi phục "${target?.name || id}" từ thùng rác và ghi vào Nhật ký Hoạt động.`);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Không thể khôi phục danh mục.");
    }
  };

  return {
    search,
    setSearch,
    levelFilter,
    setLevelFilter,
    activeTab,
    setActiveTab,
    showModal,
    setShowModal,
    editingCategory,
    formName,
    formSlug,
    setFormSlug,
    formParentId,
    setFormParentId,
    formOrder,
    setFormOrder,
    formDescription,
    setFormDescription,
    formImageUrl,
    setFormImageUrl,
    formIsCollection,
    setFormIsCollection,
    submitError,
    toastMessage,
    parentCategories,
    collectionsList,
    isCollectionItem,
    activePagination,
    trashPagination,
    handleOpenAdd,
    handleOpenEdit,
    handleNameChange,
    handleSubmit,
    handleDelete,
    handleRestore,
  };
}
