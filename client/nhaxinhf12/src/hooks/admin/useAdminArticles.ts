import { useState, useMemo } from "react";
import type { AdminArticle } from "../../services/admin/types";
import { generateSlug } from "../../services/admin/adminService";
import { usePagination } from "../usePagination";

interface UseAdminArticlesParams {
  articles: AdminArticle[];
  onSaveArticle: (art: Partial<AdminArticle>) => void;
}

export function useAdminArticles({ articles, onSaveArticle }: UseAdminArticlesParams) {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [showModal, setShowModal] = useState(false);
  const [editingArt, setEditingArt] = useState<AdminArticle | null>(null);

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<AdminArticle["category"]>("Góc cảm hứng");
  const [summary, setSummary] = useState("");
  const [content, setContent] = useState("");
  const [image, setImage] = useState("");

  const filteredArticles = useMemo(() => {
    const q = search.toLowerCase().trim();
    return articles.filter((a) => {
      const matchCat = categoryFilter === "all" || a.category === categoryFilter;
      const matchSearch =
        !q ||
        a.title.toLowerCase().includes(q) ||
        a.summary.toLowerCase().includes(q) ||
        a.author.toLowerCase().includes(q);
      return matchCat && matchSearch;
    });
  }, [articles, search, categoryFilter]);

  const pagination = usePagination(filteredArticles, 6, [search, categoryFilter]);

  const openCreate = () => {
    setEditingArt(null);
    setTitle("");
    setCategory("Góc cảm hứng");
    setSummary("");
    setContent("");
    setImage("https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=600&q=80");
    setShowModal(true);
  };

  const openEdit = (art: AdminArticle) => {
    setEditingArt(art);
    setTitle(art.title);
    setCategory(art.category);
    setSummary(art.summary);
    setContent(art.content);
    setImage(art.image);
    setShowModal(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveArticle({
      id: editingArt ? editingArt.id : `art-${Date.now()}`,
      title,
      slug: generateSlug(title),
      category,
      author: "Ban Biên Tập",
      views: editingArt ? editingArt.views : 1,
      createdAt: editingArt ? editingArt.createdAt : new Date().toLocaleDateString("vi-VN"),
      status: "published",
      image: image || "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=600&q=80",
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
    filteredArticles,
    pagination,
    showModal,
    setShowModal,
    editingArt,
    title,
    setTitle,
    category,
    setCategory,
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

