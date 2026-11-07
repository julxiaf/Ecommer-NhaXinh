import { useState, useMemo } from "react";
import type { AdminCategory } from "../../services/admin/types";
import { generateSlug } from "../../services/admin/adminService";
import { catalogApi } from "../../services/admin/catalogApi";
import { usePagination } from "../usePagination";

export type CategoryLevelFilter = "all" | "parent" | "child" | "collection" | "room" | "page" | "product";

export type AdminCategoryViewMode = "all" | "categories_only" | "collections_only";

interface UseAdminCategoriesParams {
  categories: AdminCategory[];
  onSaveCategory: (cat: Partial<AdminCategory>, imageFile?: File | null) => Promise<void>;
  onDeleteCategory: (id: string) => Promise<void>;
  onRestoreCategory: (id: string) => Promise<void>;
  viewMode?: AdminCategoryViewMode;
}

export function useAdminCategories({
  categories,
  onSaveCategory,
  onDeleteCategory,
  onRestoreCategory,
  viewMode = "all",
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
  const [formImageFile, setFormImageFile] = useState<File | null>(null);
  const [formIsCollection, setFormIsCollection] = useState(false);
  const [formCategoryGroup, setFormCategoryGroup] = useState<string>("PRODUCT");

  // Extended Lookbook Collection fields (chuẩn mẫu Nhà Xinh Orientale)
  const [formSubtitle, setFormSubtitle] = useState("");
  const [formIntroQuote, setFormIntroQuote] = useState("");
  const [formStoryTitle, setFormStoryTitle] = useState("");
  const [formVideoUrl, setFormVideoUrl] = useState("");
  const [formGalleryImages, setFormGalleryImages] = useState<string[]>([]);
  const [formStyleTag, setFormStyleTag] = useState("");
  const [formMaterials, setFormMaterials] = useState("");
  const [formProductIds, setFormProductIds] = useState<number[]>([]);
  const [uploadingMedia, setUploadingMedia] = useState(false);

  const [submitError, setSubmitError] = useState("");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const formPreviewUrl = useMemo(() => {
    if (formImageFile) {
      return URL.createObjectURL(formImageFile);
    }
    return formImageUrl;
  }, [formImageFile, formImageUrl]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3500);
  };

  const isCollectionItem = (c: AdminCategory) =>
    Boolean(
      c.categoryGroup === "COLLECTION" ||
        c.isCollection ||
        c.slug === "bo-suu-tap" ||
        c.parentId === "cat-collections" ||
        c.slug.includes("victoria") ||
        c.slug.includes("duong-dai") ||
        c.slug.includes("osaka") ||
        c.slug.includes("coastal")
    );

  const parentCategories = useMemo(
    () =>
      categories.filter((c) => {
        if (c.parentId || c.isDeleted) return false;
        if (viewMode === "categories_only") {
          return !isCollectionItem(c) && c.categoryGroup !== "COLLECTION";
        }
        if (viewMode === "collections_only") {
          return isCollectionItem(c) || c.categoryGroup === "COLLECTION";
        }
        return true;
      }),
    [categories, viewMode]
  );

  const collectionsList = useMemo(
    () => categories.filter((c) => !c.isDeleted && isCollectionItem(c)),
    [categories]
  );

  const filteredCategories = useMemo(() => {
    const q = search.toLowerCase().trim();
    return categories.filter((c) => {
      // 1. Phân loại theo viewMode (categories_only vs collections_only)
      const isCol = isCollectionItem(c);
      if (viewMode === "categories_only" && isCol) {
        return false;
      }
      if (viewMode === "collections_only" && !isCol) {
        return false;
      }

      // 2. Phân loại theo tab (active / collections / trash)
      if (activeTab === "trash") {
        if (!c.isDeleted) return false;
      } else if (activeTab === "collections") {
        if (c.isDeleted || !isCol) return false;
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
        (levelFilter === "collection" && isCol) ||
        (levelFilter === "product" && (c.categoryGroup === "PRODUCT" || (!c.categoryGroup && !isCol))) ||
        (levelFilter === "room" && c.categoryGroup === "ROOM") ||
        (levelFilter === "page" && (c.categoryGroup === "PAGE" || c.categoryGroup === "STATIC"));
      return matchSearch && matchLevel;
    });
  }, [categories, activeTab, search, levelFilter, viewMode]);

  // Xây dựng cây phân cấp (Hierarchy Tree: Parent -> Children)
  const categoryTree = useMemo(() => {
    if (
      viewMode === "collections_only" ||
      levelFilter === "child" ||
      levelFilter === "collection" ||
      activeTab === "collections"
    ) {
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
  }, [filteredCategories, categories, levelFilter, activeTab, search, viewMode]);

  const activePagination = usePagination(categoryTree, 10, [activeTab, search, levelFilter]);
  const trashPagination = usePagination(filteredCategories, 10, [activeTab, search, levelFilter]);

  const handleOpenAdd = (
    defaultParentId?: string,
    defaultIsCollection = viewMode === "collections_only",
    defaultGroup = viewMode === "collections_only" ? "COLLECTION" : "PRODUCT"
  ) => {
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
    setFormImageFile(null);
    const initialGroup =
      viewMode === "collections_only" || defaultIsCollection || activeTab === "collections"
        ? "COLLECTION"
        : defaultGroup;
    setFormCategoryGroup(initialGroup);
    setFormIsCollection(initialGroup === "COLLECTION");
    setFormSubtitle("");
    setFormIntroQuote("");
    setFormStoryTitle("Chất liệu cao cấp tạo trải nghiệm đẳng cấp");
    setFormVideoUrl("");
    setFormGalleryImages([]);
    setFormStyleTag("Hiện đại & Tinh tế");
    setFormMaterials("Gỗ Walnut tự nhiên • Da bò thật nhập khẩu");
    setFormProductIds([]);
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
    setFormImageFile(null);
    const group = cat.categoryGroup || (isCollectionItem(cat) ? "COLLECTION" : "PRODUCT");
    setFormCategoryGroup(group);
    setFormIsCollection(group === "COLLECTION");
    setFormSubtitle(cat.subtitle || "");
    setFormIntroQuote(cat.introQuote || "");
    setFormStoryTitle(cat.storyTitle || "Chất liệu cao cấp tạo trải nghiệm đẳng cấp");
    setFormVideoUrl(cat.videoUrl || "");
    setFormGalleryImages(Array.isArray(cat.galleryImages) ? [...cat.galleryImages] : []);
    setFormStyleTag(cat.styleTag || "");
    setFormMaterials(cat.materials || "");
    setFormProductIds(Array.isArray(cat.productIds) ? [...cat.productIds] : []);
    setSubmitError("");
    setShowModal(true);
  };

  const handleUploadGalleryFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploadingMedia(true);
    setSubmitError("");
    try {
      const uploadedUrls: string[] = [];
      for (const file of Array.from(files)) {
        const url = await catalogApi.uploadCategoryImage(file);
        if (url) uploadedUrls.push(url);
      }
      if (uploadedUrls.length > 0) {
        setFormGalleryImages((prev) => [...prev, ...uploadedUrls]);
      }
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Không thể tải ảnh bộ sưu tập lên máy chủ.");
    } finally {
      setUploadingMedia(false);
    }
  };

  const handleUploadVideoFile = async (file?: File | null) => {
    if (!file) return;
    setUploadingMedia(true);
    setSubmitError("");
    try {
      const url = await catalogApi.uploadCategoryImage(file);
      if (url) {
        setFormVideoUrl(url);
      }
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Không thể tải video bộ sưu tập lên máy chủ.");
    } finally {
      setUploadingMedia(false);
    }
  };

  const toggleProductInCollection = (productId: number) => {
    setFormProductIds((prev) =>
      prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId]
    );
  };

  const handleNameChange = (val: string) => {
    setFormName(val);
    if (!editingCategory) {
      setFormSlug(generateSlug(val));
    }
  };

  // ── Kiểm tra trùng lặp slug danh mục ──
  const isSlugDuplicate = useMemo(() => {
    const slug = formSlug.trim().toLowerCase();
    if (!slug) return false;
    return categories.some(
      (c) => c.slug && c.slug.toLowerCase() === slug && c.id !== editingCategory?.id
    );
  }, [formSlug, categories, editingCategory]);

  // Gợi ý slug duy nhất
  const suggestedSlug = useMemo(() => {
    if (!isSlugDuplicate) return formSlug;
    const base = (formSlug.trim() || generateSlug(formName.trim())).toLowerCase();
    let count = 1;
    let candidate = `${base}-${count}`;
    while (
      categories.some(
        (c) => c.slug && c.slug.toLowerCase() === candidate && c.id !== editingCategory?.id
      )
    ) {
      count++;
      candidate = `${base}-${count}`;
    }
    return candidate;
  }, [isSlugDuplicate, formSlug, formName, categories, editingCategory]);

  const handleApplySuggestedSlug = () => {
    setFormSlug(suggestedSlug);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    setSubmitError("");
    try {
      const isCol = formCategoryGroup === "COLLECTION" || formIsCollection;
      const label = isCol ? "bộ sưu tập" : "danh mục";
      await onSaveCategory(
        {
          id: editingCategory?.id,
          name: formName.trim(),
          slug: isSlugDuplicate
            ? suggestedSlug
            : formSlug.trim() || generateSlug(formName.trim()),
          parentId: formParentId === "none" ? null : formParentId,
          order: Number(formOrder),
          description: formDescription.trim() || undefined,
          imageUrl: formImageUrl.trim() || undefined,
          categoryGroup: formCategoryGroup,
          isCollection: isCol,
          subtitle: isCol ? formSubtitle.trim() || undefined : undefined,
          introQuote: isCol ? formIntroQuote.trim() || undefined : undefined,
          storyTitle: isCol ? formStoryTitle.trim() || undefined : undefined,
          videoUrl: isCol ? formVideoUrl.trim() || undefined : undefined,
          galleryImages:
            isCol && formGalleryImages.filter((u) => u.trim()).length > 0
              ? formGalleryImages.map((u) => u.trim()).filter(Boolean)
              : undefined,
          styleTag: isCol ? formStyleTag.trim() || undefined : undefined,
          materials: isCol ? formMaterials.trim() || undefined : undefined,
          productIds: isCol ? formProductIds : undefined,
          productCount:
            isCol && formProductIds.length > 0
              ? formProductIds.length
              : editingCategory?.productCount,
        },
        formImageFile
      );
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
    isSlugDuplicate,
    suggestedSlug,
    handleApplySuggestedSlug,
    formParentId,
    setFormParentId,
    formOrder,
    setFormOrder,
    formDescription,
    setFormDescription,
    formImageUrl,
    setFormImageUrl,
    formImageFile,
    setFormImageFile,
    formPreviewUrl,
    formIsCollection,
    setFormIsCollection,
    formCategoryGroup,
    setFormCategoryGroup,
    formSubtitle,
    setFormSubtitle,
    formIntroQuote,
    setFormIntroQuote,
    formStoryTitle,
    setFormStoryTitle,
    formVideoUrl,
    setFormVideoUrl,
    formGalleryImages,
    setFormGalleryImages,
    formStyleTag,
    setFormStyleTag,
    formMaterials,
    setFormMaterials,
    formProductIds,
    setFormProductIds,
    uploadingMedia,
    handleUploadGalleryFiles,
    handleUploadVideoFile,
    toggleProductInCollection,
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
