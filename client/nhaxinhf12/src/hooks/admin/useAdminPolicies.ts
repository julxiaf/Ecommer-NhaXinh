import { useState, useEffect, useRef, useMemo } from "react";
import { adminService } from "../../services/admin/adminService";
import {
  policyApi,
  type AdminPolicy,
  type CreatePolicyInput,
  type UpdatePolicyInput,
} from "../../services/admin/policyApi";
import { usePagination } from "../usePagination";

export function useAdminPolicies(defaultContent: string) {
  const [policies, setPolicies] = useState<AdminPolicy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [templateFilter, setTemplateFilter] = useState("ALL");

  const [viewMode, setViewMode] = useState<"list" | "edit" | "preview">("list");
  const [editorMode, setEditorMode] = useState<"visual" | "html" | "split">("visual");

  const [currentId, setCurrentId] = useState<number | null>(null);
  const [formData, setFormData] = useState<CreatePolicyInput>({
    title: "",
    slug: "",
    shortTitle: "",
    intro: "",
    content: "",
    templateType: "return",
    fontFamily: "Be Vietnam Pro, sans-serif",
    fontSize: "15px",
    lineHeight: "1.75",
    accentColor: "#b38e5d",
    status: "PUBLISHED",
  });

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showTypographyDrawer, setShowTypographyDrawer] = useState(false);

  const visualEditorRef = useRef<HTMLDivElement>(null);
  const isLoadedForSession = useRef<string | null>(null);

  useEffect(() => {
    let ignore = false;
    policyApi
      .getAll(statusFilter, searchQuery)
      .then((data) => {
        if (!ignore) {
          setPolicies(Array.isArray(data) ? data : []);
          setError(null);
        }
      })
      .catch((err: unknown) => {
        if (!ignore) {
          const msg = err instanceof Error ? err.message : "Không thể tải danh sách chính sách";
          setError(msg);
          setPolicies([]);
        }
      })
      .finally(() => {
        if (!ignore) {
          setLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [statusFilter, searchQuery]);

  const loadPolicies = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await policyApi.getAll(statusFilter, searchQuery);
      setPolicies(Array.isArray(data) ? data : []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Không thể tải danh sách chính sách";
      setError(msg);
      setPolicies([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredPolicies = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return policies.filter((p) => {
      const matchTemplate = templateFilter === "ALL" || (p.templateType || "custom") === templateFilter;
      const matchSearch =
        !q ||
        p.title.toLowerCase().includes(q) ||
        p.slug.toLowerCase().includes(q) ||
        (p.shortTitle && p.shortTitle.toLowerCase().includes(q));
      return matchTemplate && matchSearch;
    });
  }, [policies, searchQuery, templateFilter]);

  const pagination = usePagination(filteredPolicies, 8, [statusFilter, searchQuery, templateFilter]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const syncContentFromDom = (): string => {
    if ((editorMode === "visual" || editorMode === "split") && visualEditorRef.current) {
      const html = visualEditorRef.current.innerHTML || "";
      setFormData((prev) => ({ ...prev, content: html }));
      return html;
    }
    return formData.content || "";
  };

  const handleSwitchEditorMode = (newMode: "visual" | "html" | "split") => {
    if (newMode === editorMode) return;

    if ((editorMode === "visual" || editorMode === "split") && visualEditorRef.current) {
      const currentHtml = visualEditorRef.current.innerHTML || "";
      setFormData((prev) => ({ ...prev, content: currentHtml }));
    }

    isLoadedForSession.current = null;
    setEditorMode(newMode);
  };

  // Đồng bộ nội dung vào visual editor DOM một cách an toàn:
  // Chỉ cập nhật khi chuyển chế độ, đổi policy được chọn, hoặc khi chuyển sang visual/split mode
  // KHÔNG re-assign innerHTML trên từng phím gõ để chống giật con trỏ và tránh lỗi React Fiber crash DOM
  useEffect(() => {
    if (viewMode === "edit" && visualEditorRef.current) {
      const sessionKey = `${currentId ?? "new"}-${editorMode}`;
      if (isLoadedForSession.current !== sessionKey && visualEditorRef.current) {
        visualEditorRef.current.innerHTML = formData.content || "";
        isLoadedForSession.current = sessionKey;
      }
    } else if (viewMode !== "edit") {
      isLoadedForSession.current = null;
    }
  }, [viewMode, editorMode, currentId, formData.content]);

  const handleOpenCreate = () => {
    isLoadedForSession.current = null;
    setCurrentId(null);
    setFormData({
      title: "",
      slug: "",
      shortTitle: "",
      intro: "",
      content: defaultContent || "",
      templateType: "return",
      fontFamily: "Be Vietnam Pro, sans-serif",
      fontSize: "15px",
      lineHeight: "1.75",
      accentColor: "#b38e5d",
      status: "PUBLISHED",
    });
    setViewMode("edit");
    setEditorMode("visual");
  };

  const handleOpenEdit = (policy: AdminPolicy) => {
    isLoadedForSession.current = null;
    setCurrentId(policy.id);
    setFormData({
      title: policy.title || "",
      slug: policy.slug || "",
      shortTitle: policy.shortTitle || "",
      intro: policy.intro || "",
      content: policy.content || "",
      templateType: policy.templateType || "custom",
      fontFamily: policy.fontFamily || "Be Vietnam Pro, sans-serif",
      fontSize: policy.fontSize || "15px",
      lineHeight: policy.lineHeight || "1.75",
      accentColor: policy.accentColor || "#b38e5d",
      status: policy.status || "PUBLISHED",
    });
    setViewMode("edit");
    setEditorMode("visual");
  };

  const handleOpenPreview = (policy: AdminPolicy) => {
    setCurrentId(policy.id);
    setFormData({
      title: policy.title || "",
      slug: policy.slug || "",
      shortTitle: policy.shortTitle || "",
      intro: policy.intro || "",
      content: policy.content || "",
      templateType: policy.templateType || "custom",
      fontFamily: policy.fontFamily || "Be Vietnam Pro, sans-serif",
      fontSize: policy.fontSize || "15px",
      lineHeight: policy.lineHeight || "1.75",
      accentColor: policy.accentColor || "#b38e5d",
      status: policy.status || "PUBLISHED",
    });
    setViewMode("preview");
  };

  const handleTitleChange = (newTitle: string) => {
    setFormData((prev) => {
      const updated = { ...prev, title: newTitle };
      if (!currentId) {
        const slug = newTitle
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[đĐ]/g, "d")
          .replace(/[^a-z0-9\s-]/g, "")
          .trim()
          .replace(/\s+/g, "-")
          .replace(/-+/g, "-");
        updated.slug = slug;
        if (!prev.shortTitle) updated.shortTitle = newTitle.slice(0, 30);
      }
      return updated;
    });
  };

  const handleApplyTemplate = (tmpl: {
    name: string;
    shortTitle: string;
    intro: string;
    content: string;
    type: string;
  }) => {
    setFormData((prev) => ({
      ...prev,
      title: prev.title || tmpl.name,
      shortTitle: prev.shortTitle || tmpl.shortTitle,
      intro: tmpl.intro,
      content: tmpl.content,
      templateType: tmpl.type,
    }));
    if (visualEditorRef.current) {
      visualEditorRef.current.innerHTML = tmpl.content;
    }
    setShowTemplateModal(false);
    showToast(`Đã áp dụng mẫu: "${tmpl.name}"`);
  };

  const handleInsertBlock = (blockHtml: string) => {
    if (editorMode === "html") {
      setFormData((prev) => ({ ...prev, content: (prev.content || "") + "\n\n" + blockHtml }));
    } else {
      if (visualEditorRef.current) {
        visualEditorRef.current.focus();
        document.execCommand("insertHTML", false, blockHtml);
        setFormData((prev) => ({ ...prev, content: visualEditorRef.current?.innerHTML || "" }));
      }
    }
    showToast("Đã chèn khối nội dung thành công!");
  };

  const executeCmd = (command: string, value: string | undefined = undefined) => {
    if (visualEditorRef.current) {
      visualEditorRef.current.focus();
      document.execCommand(command, false, value);
      setFormData((prev) => ({ ...prev, content: visualEditorRef.current?.innerHTML || "" }));
    }
  };

  const handleSavePolicy = async () => {
    if (!formData.title?.trim()) {
      alert("Vui lòng nhập tiêu đề chính sách");
      return;
    }

    try {
      setIsSaving(true);
      let contentToSave = formData.content || "";
      if ((editorMode === "visual" || editorMode === "split") && visualEditorRef.current) {
        contentToSave = visualEditorRef.current?.innerHTML || "";
      }

      if (currentId) {
        const updatePayload: UpdatePolicyInput = {
          ...formData,
          content: contentToSave,
        };
        const updated = await policyApi.update(currentId, updatePayload);
        adminService.logAction(
          "Cập nhật chính sách website",
          `Cập nhật chính sách "${updated.title}" [Mã: ${updated.slug}, Font: ${updated.fontFamily}]`
        );
        showToast(`Cập nhật thành công: "${updated.title}"`);
      } else {
        const createPayload: CreatePolicyInput = {
          ...formData,
          content: contentToSave,
        };
        const created = await policyApi.create(createPayload);
        adminService.logAction(
          "Tạo chính sách mới",
          `Tạo mới chính sách "${created.title}" [Mã: ${created.slug}, Mẫu: ${created.templateType}]`
        );
        showToast(`Tạo mới thành công: "${created.title}"`);
      }

      await loadPolicies();
      setViewMode("list");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Lỗi khi lưu chính sách";
      alert(msg);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeletePolicy = async (id: number) => {
    const target = policies.find((p) => p.id === id);
    try {
      await policyApi.delete(id);
      adminService.logAction(
        "Xóa chính sách",
        `Đã xóa chính sách "${target?.title || id}" [Mã: ${target?.slug}]`
      );
      showToast(`Đã xóa chính sách thành công`);
      setDeleteConfirmId(null);
      await loadPolicies();
      if (currentId === id) setViewMode("list");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Lỗi khi xóa chính sách";
      alert(msg);
    }
  };

  return {
    policies,
    filteredPolicies,
    pagination,
    loading,
    error,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    templateFilter,
    setTemplateFilter,
    viewMode,
    setViewMode,
    editorMode,
    setEditorMode,
    handleSwitchEditorMode,
    syncContentFromDom,
    currentId,
    formData,
    setFormData,
    toastMessage,
    isSaving,
    deleteConfirmId,
    setDeleteConfirmId,
    showTemplateModal,
    setShowTemplateModal,
    showTypographyDrawer,
    setShowTypographyDrawer,
    visualEditorRef,
    loadPolicies,
    handleOpenCreate,
    handleOpenEdit,
    handleOpenPreview,
    handleTitleChange,
    handleApplyTemplate,
    handleInsertBlock,
    executeCmd,
    handleSavePolicy,
    handleDeletePolicy,
  };
}

