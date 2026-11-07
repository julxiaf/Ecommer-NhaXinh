import { useState, useMemo } from "react";
import type { AdminArticle } from "../../services/admin/types";
import { generateSlug } from "../../services/admin/adminService";
import { DEFAULT_PLACEHOLDER_IMAGE } from "../../services/productService";
import { usePagination } from "../usePagination";

interface UseAdminArticlesParams {
  articles: AdminArticle[];
  onSaveArticle: (art: Partial<AdminArticle>) => void;
}

export function useAdminArticles({ articles, onSaveArticle }: UseAdminArticlesParams) {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "published" | "hidden">("all");
  const [activeTab, setActiveTab] = useState<"active" | "trash">("active");
  const [showModal, setShowModal] = useState(false);
  const [editingArt, setEditingArt] = useState<AdminArticle | null>(null);

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<AdminArticle["category"]>("Góc cảm hứng");
  const [collectionSlug, setCollectionSlug] = useState<string>("");
  const [status, setStatus] = useState<"published" | "hidden">("published");
  const [summary, setSummary] = useState("");
  const [content, setContent] = useState("");
  const [image, setImage] = useState("");

  const filteredArticles = useMemo(() => {
    const q = search.toLowerCase().trim();
    return articles.filter((a) => {
      const matchTab = activeTab === "trash" ? Boolean(a.isDeleted) : !a.isDeleted;
      const matchCat = categoryFilter === "all" || a.category === categoryFilter;
      const matchStatus =
        statusFilter === "all" ||
        (statusFilter === "published" && (!a.status || a.status === "" || a.status === "published")) ||
        (statusFilter === "hidden" && a.status === "hidden");
      const matchSearch =
        !q ||
        a.title.toLowerCase().includes(q) ||
        a.summary.toLowerCase().includes(q) ||
        a.author.toLowerCase().includes(q);
      return matchTab && matchCat && matchStatus && matchSearch;
    });
  }, [articles, search, categoryFilter, statusFilter, activeTab]);

  const pagination = usePagination(filteredArticles, 6, [search, categoryFilter, statusFilter, activeTab]);

  const openCreate = () => {
    setEditingArt(null);
    setTitle("");
    setCategory("Bộ sưu tập");
    setCollectionSlug("");
    setStatus("published");
    setSummary("");
    setContent("");
    setImage("");
    setShowModal(true);
  };

  const openEdit = (art: AdminArticle) => {
    setEditingArt(art);
    setTitle(art.title);
    setCategory(art.category);
    setCollectionSlug(art.collectionSlug || "");
    setStatus((art.status as any) === "hidden" ? "hidden" : "published");
    setSummary(art.summary);
    setContent(art.content);
    setImage(art.image);
    setShowModal(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveArticle({
      id: editingArt ? editingArt.id : undefined,
      title,
      slug: editingArt ? editingArt.slug : generateSlug(title),
      category,
      collectionSlug: category === "Bộ sưu tập" ? (collectionSlug.trim() || undefined) : undefined,
      author: "Ban Biên Tập",
      views: editingArt ? editingArt.views : 1,
      createdAt: editingArt ? editingArt.createdAt : new Date().toLocaleDateString("vi-VN"),
      status,
      image: image || DEFAULT_PLACEHOLDER_IMAGE,
      summary,
      content: content || summary,
    });
    setShowModal(false);
  };

  return {
    search,
    setSearch,
    categoryFilter,
    setCategoryFilter,
    statusFilter,
    setStatusFilter,
    activeTab,
    setActiveTab,
    filteredArticles,
    pagination,
    showModal,
    setShowModal,
    editingArt,
    title,
    setTitle,
    category,
    setCategory,
    collectionSlug,
    setCollectionSlug,
    status,
    setStatus,
    summary,
    setSummary,
    content,
    setContent,
    image,
    setImage,
    openCreate,
    openEdit,
    handleSave,
  };
}

