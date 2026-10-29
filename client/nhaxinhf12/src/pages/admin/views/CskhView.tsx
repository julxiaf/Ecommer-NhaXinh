/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable react-hooks/set-state-in-effect */
import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  MessageSquare, Send, User, Phone, Mail, CornerDownRight, Search,
  Bot, Headphones, RefreshCw, Clock, Edit3
} from "lucide-react";
import type { AdminTicket, RoleDefinition } from "../../../services/admin/types";
import PermissionGate from "../../../components/admin/PermissionGate";
import { AdminPagination } from "../../../components/admin/AdminPagination";
import { useAdminCskh, type TicketStatusFilter } from "../../../hooks/admin/useAdminCskh";
import { chatbotService, type AdminConversation, type ChatMessage } from "../../../services/chatbotService";

interface CskhViewProps {
  tickets: AdminTicket[];
  currentRole: RoleDefinition;
  onReplyTicket: (id: string, replyText: string) => void;
}

export default function CskhView({
  tickets,
  currentRole,
  onReplyTicket,
}: CskhViewProps) {
  // Tab chuyển đổi: "chat" (Hội thoại trực tuyến từ khách hàng) hoặc "tickets" (Phiếu hỗ trợ)
  const [activeSubTab, setActiveSubTab] = useState<"chat" | "tickets">("chat");

  // ── STATE CHO PHẦN LIVE CHAT CSKH ──
  const [conversations, setConversations] = useState<AdminConversation[]>([]);
  const [selectedConv, setSelectedConv] = useState<AdminConversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatSearch, setChatSearch] = useState("");
  const [chatModeFilter, setChatModeFilter] = useState<"ALL" | "AGENT" | "BOT">("ALL");
  const [adminReplyText, setAdminReplyText] = useState("");
  const [isSendingReply, setIsSendingReply] = useState(false);
  const [isLoadingConvs, setIsLoadingConvs] = useState(false);

  // ── STATE GHI ĐÈ TIN NHẮN CỦA BOT BỞI CSKH ──
  const [editingMessageId, setEditingMessageId] = useState<number | null>(null);
  const [overrideText, setOverrideText] = useState("");
  const [isSavingOverride, setIsSavingOverride] = useState(false);

  const chatScrollRef = useRef<HTMLDivElement>(null);

  // ── STATE CHO PHẦN TICKETS CŨ ──
  const {
    search: ticketSearch,
    setSearch: setTicketSearch,
    statusFilter: ticketStatusFilter,
    setStatusFilter: setTicketStatusFilter,
    filteredTickets,
    pagination,
    selectedTicket,
    setSelectedTicket,
    replyText: ticketReplyText,
    setReplyText: setTicketReplyText,
    handleSendReply: handleSendTicketReply,
  } = useAdminCskh({ tickets, onReplyTicket });

  const { paginatedItems: displayedTickets } = pagination;

  // Tải danh sách hội thoại khách hàng từ API Backend
  const loadConversations = async (silent = false) => {
    if (!silent) setIsLoadingConvs(true);
    try {
      const data = await chatbotService.getAdminConversations();
      setConversations(data);
      // Tự chọn hội thoại đầu tiên nếu chưa chọn hội thoại nào
      if (data.length > 0 && !selectedConv) {
        setSelectedConv(data[0]);
      } else if (selectedConv) {
        const found = data.find((c) => c.id === selectedConv.id);
        if (found) setSelectedConv(found);
      }
    } catch (err) {
      console.error("Lỗi tải hội thoại CSKH:", err);
    } finally {
      if (!silent) setIsLoadingConvs(false);
    }
  };

  // Tải tin nhắn của cuộc hội thoại đang chọn
  const loadSelectedMessages = async (convId: number) => {
    try {
      const msgs = await chatbotService.getMessages(convId);
      setMessages(msgs);
    } catch (err) {
      console.error("Lỗi tải tin nhắn hội thoại:", err);
    }
  };

  // Khởi động nạp hội thoại và polling mỗi 4 giây
  useEffect(() => {
    loadConversations();
    const interval = setInterval(() => {
      loadConversations(true);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  // Khi chọn cuộc hội thoại khác, nạp tin nhắn và cuộn xuống cuối
  useEffect(() => {
    if (selectedConv) {
      loadSelectedMessages(selectedConv.id);
    }
  }, [selectedConv?.id]);

  // Polling tin nhắn chi tiết của hội thoại đang mở mỗi 3 giây
  useEffect(() => {
    if (!selectedConv) return;
    const interval = setInterval(() => {
      loadSelectedMessages(selectedConv.id);
    }, 3000);
    return () => clearInterval(interval);
  }, [selectedConv?.id]);

  // Cuộn xuống tin nhắn cuối cùng khi có tin mới
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Gửi tin nhắn trả lời từ phía CSKH (Admin / Agent)
  const handleSendAdminMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedConv || !adminReplyText.trim() || isSendingReply) return;

    const textToSend = adminReplyText.trim();
    setAdminReplyText("");
    setIsSendingReply(true);

    try {
      const res = await chatbotService.sendAdminReply(selectedConv.id, textToSend);
      if (res) {
        setMessages((prev) => [...prev, res]);
        // Cập nhật lại danh sách hội thoại
        loadConversations(true);
      }
    } catch (err) {
      console.error("Lỗi khi gửi phản hồi CSKH:", err);
    } finally {
      setIsSendingReply(false);
    }
  };

  // Bắt đầu sửa / ghi đè lên tin nhắn của Bot
  const handleStartOverride = (m: ChatMessage) => {
    setEditingMessageId(m.id || null);
    setOverrideText(m.messageText);
  };

  // Hủy sửa ghi đè
  const handleCancelOverride = () => {
    setEditingMessageId(null);
    setOverrideText("");
  };

  // Lưu ghi đè câu trả lời của Bot
  const handleSaveOverride = async (messageId: number) => {
    if (!overrideText.trim() || isSavingOverride) return;
    setIsSavingOverride(true);
    try {
      const updated = await chatbotService.overrideMessage(messageId, overrideText.trim());
      if (updated) {
        setMessages((prev) =>
          prev.map((item) => (item.id === messageId ? { ...item, ...updated, isOverridden: true } : item))
        );
        setEditingMessageId(null);
        setOverrideText("");
        loadConversations(true);
      }
    } catch (err) {
      console.error("Lỗi khi ghi đè tin nhắn bot:", err);
      alert("Có lỗi khi ghi đè tin nhắn của bot. Vui lòng thử lại!");
    } finally {
      setIsSavingOverride(false);
    }
  };

  // Chuyển chế độ hội thoại (AGENT tiếp quản <-> Trả lại cho AI BOT)
  const handleToggleConvMode = async () => {
    if (!selectedConv) return;
    const nextMode = selectedConv.mode === "AGENT" ? "BOT" : "AGENT";
    try {
      await fetch("/api/v1/chatbot/switch-mode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId: selectedConv.id,
          mode: nextMode,
        }),
      });
      setSelectedConv((prev) => (prev ? { ...prev, mode: nextMode } : null));
      loadConversations(true);
      loadSelectedMessages(selectedConv.id);
    } catch (err) {
      console.error("Lỗi khi chuyển đổi mode:", err);
    }
  };

  // Đóng cuộc hội thoại
  const handleCloseConversation = async () => {
    if (!selectedConv) return;
    if (!window.confirm("Bạn có chắc chắn muốn đóng cuộc hội thoại này không?")) return;
    try {
      await chatbotService.closeConversation(selectedConv.id);
      setSelectedConv((prev) => (prev ? { ...prev, status: "CLOSED" } : null));
      loadConversations(true);
    } catch (err) {
      console.error("Lỗi khi đóng hội thoại:", err);
    }
  };

  // Lọc danh sách hội thoại chat
  const filteredConversations = useMemo(() => {
    return conversations.filter((c) => {
      const matchSearch =
        c.customerName.toLowerCase().includes(chatSearch.toLowerCase()) ||
        c.lastMessage.toLowerCase().includes(chatSearch.toLowerCase()) ||
        (c.customerPhone && c.customerPhone.includes(chatSearch));

      if (chatModeFilter === "AGENT") return matchSearch && c.mode === "AGENT";
      if (chatModeFilter === "BOT") return matchSearch && c.mode === "BOT";
      return matchSearch;
    });
  }, [conversations, chatSearch, chatModeFilter]);

  const activeAgentChatsCount = useMemo(
    () => conversations.filter((c) => c.mode === "AGENT" && c.status === "ACTIVE").length,
    [conversations]
  );

  // Tìm tin nhắn gần nhất của Bot trong cuộc hội thoại để gợi ý ghi đè nhanh
  const lastBotMessage = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].senderType === "BOT") {
        return messages[i];
      }
    }
    return null;
  }, [messages]);

  return (
    <div className="space-y-6">
      {/* ── HEADER PHÂN VÙNG CSKH & TAB SELECTOR ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-xl font-black text-slate-900 flex items-center gap-2.5">
            <MessageSquare className="text-blue-600" size={24} />
            Chăm sóc Khách hàng & Hỗ trợ Trực tuyến
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Tiếp nhận hội thoại trực tiếp từ khách hàng đang truy cập website & xử lý phiếu hỗ trợ
          </p>
        </div>

        {/* Tab Switcher: Chat Trực Tuyến vs Phiếu Hỗ Trợ */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
          <button
            type="button"
            onClick={() => setActiveSubTab("chat")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeSubTab === "chat"
                ? "bg-white text-blue-700 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Headphones size={15} />
            <span>Hội thoại trực tuyến</span>
            {activeAgentChatsCount > 0 && (
              <span className="px-1.5 py-0.2 bg-rose-500 text-white text-[10px] rounded-full animate-pulse font-extrabold">
                {activeAgentChatsCount} cần CSKH
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab("tickets")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeSubTab === "tickets"
                ? "bg-white text-blue-700 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Mail size={15} />
            <span>Phiếu hỗ trợ (Tickets)</span>
            {tickets.filter((t) => t.status === "open").length > 0 && (
              <span className="px-1.5 py-0.2 bg-amber-500 text-white text-[10px] rounded-full font-bold">
                {tickets.filter((t) => t.status === "open").length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          TAB 1: LIVE CHAT VỚI KHÁCH HÀNG (KẾT NỐI API CHATBOT THỰC TẾ)
          ══════════════════════════════════════════════════════════════════════ */}
      {activeSubTab === "chat" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-155">
          {/* Cột trái: Danh sách khách hàng đang chat (4 cols) */}
          <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col justify-between">
            <div>
              {/* Header danh sách & Bộ lọc */}
              <div className="p-3.5 border-b border-slate-100 bg-slate-50/70 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                    <span>Hội thoại khách hàng</span>
                    <span className="text-blue-600 font-extrabold">({conversations.length})</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => loadConversations()}
                    className="p-1 text-slate-400 hover:text-blue-600 transition-colors rounded-lg hover:bg-slate-100"
                    title="Làm mới danh sách"
                  >
                    <RefreshCw size={13} className={isLoadingConvs ? "animate-spin text-blue-600" : ""} />
                  </button>
                </div>

                <div className="relative">
                  <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Tìm tên khách, tin nhắn, SĐT..."
                    value={chatSearch}
                    onChange={(e) => setChatSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setChatModeFilter("ALL")}
                    className={`px-2 py-1 rounded-md text-[11px] font-semibold transition-all ${
                      chatModeFilter === "ALL" ? "bg-slate-800 text-white" : "bg-slate-200/70 text-slate-600 hover:bg-slate-300"
                    }`}
                  >
                    Tất cả
                  </button>
                  <button
                    type="button"
                    onClick={() => setChatModeFilter("AGENT")}
                    className={`px-2 py-1 rounded-md text-[11px] font-semibold transition-all flex items-center gap-1 ${
                      chatModeFilter === "AGENT" ? "bg-emerald-600 text-white" : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                    }`}
                  >
                    <Headphones size={11} /> Cần CSKH
                  </button>
                  <button
                    type="button"
                    onClick={() => setChatModeFilter("BOT")}
                    className={`px-2 py-1 rounded-md text-[11px] font-semibold transition-all flex items-center gap-1 ${
                      chatModeFilter === "BOT" ? "bg-indigo-600 text-white" : "bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
                    }`}
                  >
                    <Bot size={11} /> Đang chat AI
                  </button>
                </div>
              </div>

              {/* Danh sách các cuộc hội thoại */}
              <div className="divide-y divide-slate-100 overflow-y-auto max-h-130">
                {filteredConversations.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400">
                    <MessageSquare size={32} className="mx-auto mb-2 text-slate-300" />
                    Chưa có cuộc hội thoại nào từ khách hàng.
                  </div>
                ) : (
                  filteredConversations.map((c) => {
                    const isSelected = selectedConv?.id === c.id;
                    const isAgent = c.mode === "AGENT";

                    return (
                      <div
                        key={c.id}
                        onClick={() => setSelectedConv(c)}
                        className={`p-3.5 cursor-pointer transition-all flex items-start gap-3 ${
                          isSelected
                            ? "bg-blue-50/80 border-l-4 border-l-blue-600"
                            : "hover:bg-slate-50"
                        }`}
                      >
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-white font-bold text-xs ${
                            isAgent
                              ? "bg-linear-to-br from-emerald-500 to-teal-600"
                              : "bg-linear-to-br from-indigo-500 to-blue-600"
                          }`}
                        >
                          {isAgent ? <Headphones size={16} /> : <Bot size={16} />}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1 mb-0.5">
                            <span className="font-bold text-xs text-slate-900 truncate">
                              {c.customerName}
                            </span>
                            <span className="text-[10px] text-slate-400 shrink-0">
                              {c.updatedAt ? c.updatedAt.split(" ")[0] : ""}
                            </span>
                          </div>

                          <p className="text-[11px] text-slate-500 truncate leading-relaxed">
                            <strong className="text-slate-700">
                              {c.lastSender === "USER"
                                ? "Khách: "
                                : c.lastSender === "AGENT"
                                ? "CSKH: "
                                : "AI: "}
                            </strong>
                            {c.lastMessage}
                          </p>

                          <div className="flex items-center gap-1.5 mt-1.5">
                            <span
                              className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-full ${
                                isAgent
                                  ? "bg-emerald-100 text-emerald-800"
                                  : "bg-indigo-100 text-indigo-800"
                              }`}
                            >
                              {isAgent ? "👨‍💼 Chuyên viên CSKH" : "🤖 Trợ lý AI"}
                            </span>
                            {c.status === "CLOSED" && (
                              <span className="text-[9px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded-full font-semibold">
                                Đã đóng
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Cột phải: Cửa sổ Live Chat trực tiếp (8 cols) */}
          <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between overflow-hidden">
            {selectedConv ? (
              <>
                {/* Header Cửa sổ Chat */}
                <div className="p-4 border-b border-slate-100 bg-slate-50/80 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-sm ${
                        selectedConv.mode === "AGENT"
                          ? "bg-linear-to-tr from-emerald-600 to-teal-500"
                          : "bg-linear-to-tr from-indigo-600 to-blue-500"
                      }`}
                    >
                      {selectedConv.mode === "AGENT" ? <Headphones size={20} /> : <Bot size={20} />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-black text-slate-900">
                          {selectedConv.customerName}
                        </h3>
                        <span
                          className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                            selectedConv.mode === "AGENT"
                              ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                              : "bg-indigo-100 text-indigo-800 border border-indigo-200"
                          }`}
                        >
                          {selectedConv.mode === "AGENT" ? "ĐANG KẾT NỐI CSKH" : "TRỢ LÝ ẢO AI"}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
                        {selectedConv.customerPhone && (
                          <span className="flex items-center gap-1">
                            <Phone size={12} className="text-slate-400" /> {selectedConv.customerPhone}
                          </span>
                        )}
                        {selectedConv.customerEmail && (
                          <span className="flex items-center gap-1">
                            <Mail size={12} className="text-slate-400" /> {selectedConv.customerEmail}
                          </span>
                        )}
                        <span className="flex items-center gap-1 text-[11px] text-slate-400">
                          <Clock size={11} /> Cập nhật: {selectedConv.updatedAt}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions Header: Chuyển Mode & Đóng */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleToggleConvMode}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs ${
                        selectedConv.mode === "AGENT"
                          ? "bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200"
                          : "bg-emerald-600 text-white hover:bg-emerald-700"
                      }`}
                      title={selectedConv.mode === "AGENT" ? "Chuyển lại cho AI Bot tự động trả lời" : "Tiếp quản hội thoại với tư cách CSKH trực tiếp"}
                    >
                      {selectedConv.mode === "AGENT" ? (
                        <>
                          <Bot size={14} /> Chuyển sang AI Bot
                        </>
                      ) : (
                        <>
                          <Headphones size={14} /> Tiếp quản CSKH
                        </>
                      )}
                    </button>

                    {selectedConv.status !== "CLOSED" && (
                      <button
                        type="button"
                        onClick={handleCloseConversation}
                        className="px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-100 rounded-xl transition-colors"
                        title="Đóng hội thoại này"
                      >
                        Đóng phiên
                      </button>
                    )}
                  </div>
                </div>

                {/* Danh sách tin nhắn cuộn */}
                <div
                  ref={chatScrollRef}
                  className="p-5 overflow-y-auto flex-1 max-h-115 space-y-3.5 bg-slate-50/40"
                >
                  {messages.length === 0 ? (
                    <div className="text-center py-16 text-slate-400 text-xs">
                      Chưa có tin nhắn nào trong hội thoại này.
                    </div>
                  ) : (
                    messages.map((m, idx) => {
                      const isUser = m.senderType === "USER";
                      const isBot = m.senderType === "BOT";
                      const isAgent = m.senderType === "AGENT" || m.senderType === "ADMIN";
                      const isEditing = editingMessageId === m.id;

                      return (
                        <div
                          key={m.id || idx}
                          className={`flex flex-col ${isUser ? "items-start" : "items-end"}`}
                        >
                          {/* Header tên và badge người gửi */}
                          <div className={`flex items-center gap-1.5 mb-1 px-1 ${isUser ? "justify-start" : "justify-end"}`}>
                            {isUser ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                                <User size={11} className="text-slate-500" /> {selectedConv.customerName} (Khách hàng)
                              </span>
                            ) : isBot ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-indigo-800 bg-indigo-100 px-2 py-0.5 rounded-full border border-indigo-200 shadow-2xs">
                                <Bot size={11} className="text-indigo-600" /> 🤖 Trợ lý AI (Bot trả lời)
                              </span>
                            ) : isAgent ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-300 shadow-2xs">
                                <Headphones size={11} className="text-emerald-700" /> 👨‍💼 Chuyên viên CSKH (Nhân viên)
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                                Thông báo hệ thống
                              </span>
                            )}

                            {m.isOverridden && (
                              <span className="text-[9px] font-semibold text-amber-800 bg-amber-100/90 px-1.5 py-0.5 rounded border border-amber-300 inline-flex items-center gap-0.5">
                                ✏️ Đã ghi đè bởi CSKH
                              </span>
                            )}

                            <span className="text-[9px] text-slate-400">{m.createdAt}</span>
                          </div>

                          {/* Khung nội dung tin nhắn hoặc Ô sửa ghi đè */}
                          {isEditing ? (
                            <div className="w-full max-w-[85%] bg-amber-50/80 p-3.5 rounded-2xl border-2 border-amber-400 shadow-lg space-y-2.5 animate-in fade-in duration-150">
                              <div className="flex items-center justify-between text-xs font-bold text-amber-900 border-b border-amber-200/80 pb-1.5">
                                <span className="flex items-center gap-1.5">
                                  <Edit3 size={13} className="text-amber-600" />
                                  Ghi đè câu trả lời của AI Bot gửi cho khách
                                </span>
                                <span className="text-[10px] text-slate-500 font-normal">
                                  Nội dung sẽ thay thế tức thì trên màn hình khách
                                </span>
                              </div>
                              <textarea
                                value={overrideText}
                                onChange={(e) => setOverrideText(e.target.value)}
                                rows={3}
                                className="w-full text-xs p-2.5 bg-white border border-amber-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 text-slate-900 font-normal shadow-2xs"
                                placeholder="Nhập câu trả lời chính xác từ nhân viên..."
                              />
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={handleCancelOverride}
                                  disabled={isSavingOverride}
                                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-200/60 transition-colors cursor-pointer"
                                >
                                  Hủy bỏ
                                </button>
                                <button
                                  type="button"
                                  onClick={() => m.id && handleSaveOverride(m.id)}
                                  disabled={isSavingOverride || !overrideText.trim()}
                                  className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                                >
                                  {isSavingOverride ? "Đang lưu..." : "💾 Lưu & Ghi đè ngay"}
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div
                              className={`max-w-[78%] p-3.5 rounded-2xl text-xs leading-relaxed whitespace-pre-wrap shadow-xs transition-all ${
                                isUser
                                  ? "bg-white text-slate-800 border border-slate-200 rounded-tl-xs"
                                  : isBot
                                  ? "bg-slate-900 text-slate-100 rounded-tr-xs border border-slate-800 ring-1 ring-slate-800"
                                  : isAgent
                                  ? "bg-blue-600 text-white rounded-tr-xs shadow-blue-500/10"
                                  : "bg-slate-700 text-white rounded-tr-xs"
                              }`}
                            >
                              <div>{m.messageText}</div>

                              {/* Thanh công cụ ghi đè cho tin nhắn Bot */}
                              {(isBot || m.isOverridden) && (
                                <div className="mt-2.5 pt-2 border-t border-white/10 flex items-center justify-between gap-2">
                                  <span className="text-[10px] text-slate-400">
                                    {m.isOverridden ? "Đã hiệu chỉnh bởi CSKH" : "Câu trả lời tự động"}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => handleStartOverride(m)}
                                    className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-400 hover:bg-amber-300 text-slate-950 transition-all flex items-center gap-1 shadow-xs cursor-pointer"
                                    title="Chỉnh sửa câu trả lời này để cập nhật nội dung mới nhất cho khách"
                                  >
                                    <Edit3 size={11} /> Ghi đè tin nhắn Bot
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Thanh thông báo & Ghi đè nhanh nếu tin nhắn cuối là của Bot */}
                {lastBotMessage && editingMessageId !== lastBotMessage.id && (
                  <div className="px-4 py-2 bg-amber-50/90 border-t border-amber-200 flex items-center justify-between gap-3 text-xs text-amber-950">
                    <div className="flex items-center gap-2 truncate">
                      <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0 animate-ping" />
                      <span className="font-bold text-amber-800 shrink-0">Bot vừa trả lời khách:</span>
                      <span className="italic truncate text-slate-600">
                        "{lastBotMessage.messageText}"
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleStartOverride(lastBotMessage)}
                      className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-[11px] font-bold transition-all shrink-0 flex items-center gap-1 shadow-2xs cursor-pointer"
                    >
                      <Edit3 size={12} /> Ghi đè câu trả lời này
                    </button>
                  </div>
                )}

                {/* Ô soạn thảo và gửi phản hồi cho khách hàng */}
                <div className="p-3.5 border-t border-slate-200 bg-white">
                  <form onSubmit={handleSendAdminMessage} className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder={
                        selectedConv.status === "CLOSED"
                          ? "Hội thoại đã đóng. Nhập để mở lại và phản hồi khách..."
                          : `Nhập câu trả lời gửi đến ${selectedConv.customerName}...`
                      }
                      value={adminReplyText}
                      onChange={(e) => setAdminReplyText(e.target.value)}
                      className="flex-1 px-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-slate-900 placeholder:text-slate-400"
                    />
                    <button
                      type="submit"
                      disabled={!adminReplyText.trim() || isSendingReply}
                      className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed"
                    >
                      <Send size={14} className={isSendingReply ? "animate-pulse" : ""} />
                      <span>Gửi cho khách</span>
                    </button>
                  </form>
                  <p className="text-[10px] text-slate-400 mt-1 px-1">
                    💡 Khách hàng sẽ nhận được tin nhắn phản hồi của bạn ngay lập tức trên cửa sổ chat website.
                  </p>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full py-28 text-slate-400 text-xs">
                <Headphones size={44} className="stroke-1 mb-2 text-slate-300" />
                <span>Chọn một cuộc hội thoại từ danh sách bên trái để bắt đầu tư vấn.</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TAB 2: PHIẾU YÊU CẦU (TICKETS) CŨ
          ══════════════════════════════════════════════════════════════════════ */}
      {activeSubTab === "tickets" && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200">
            <div className="relative w-full sm:w-64">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm tên khách, chủ đề, SĐT..."
                value={ticketSearch}
                onChange={(e) => setTicketSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <select
              value={ticketStatusFilter}
              onChange={(e) => setTicketStatusFilter(e.target.value as TicketStatusFilter)}
              className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-700"
            >
              <option value="all">Tất cả ({tickets.length})</option>
              <option value="open">Mới gửi ({tickets.filter((t) => t.status === "open").length})</option>
              <option value="in_progress">Đang xử lý ({tickets.filter((t) => t.status === "in_progress").length})</option>
              <option value="resolved">Đã giải quyết ({tickets.filter((t) => t.status === "resolved").length})</option>
            </select>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Ticket List */}
          <div className="lg:col-span-1 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col justify-between">
            <div>
              <div className="p-3.5 bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-700 uppercase flex items-center justify-between">
                <span>Hộp thư hỗ trợ</span>
                <span className="text-[11px] font-semibold text-blue-600">{filteredTickets.length} yêu cầu</span>
              </div>
              <div className="divide-y divide-slate-100 overflow-y-auto max-h-140">
                {displayedTickets.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400">
                    Không có yêu cầu hỗ trợ nào khớp bộ lọc.
                  </div>
                ) : (
                  displayedTickets.map((t) => (
                    <div
                      key={t.id}
                      onClick={() => setSelectedTicket(t)}
                      className={`p-3.5 cursor-pointer transition-colors ${
                        selectedTicket?.id === t.id ? "bg-blue-50/70 border-l-4 border-l-blue-600" : "hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-slate-900 text-xs truncate max-w-37.5">
                          {t.customerName}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            t.status === "resolved"
                              ? "bg-emerald-100 text-emerald-800"
                              : t.status === "in_progress"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {t.status === "resolved" ? "Đã giải quyết" : t.status === "in_progress" ? "Đang xử lý" : "Mới gửi"}
                        </span>
                      </div>
                      <p className="text-xs font-medium text-slate-700 truncate">{t.subject}</p>
                      <p className="text-[11px] text-slate-400 mt-1">{t.createdAt}</p>
                    </div>
                  ))
                )}
              </div>
            </div>

            <AdminPagination pagination={pagination} compact itemLabel="ticket" />
          </div>

          {/* Ticket Chat / Detail Window */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex flex-col justify-between min-h-125">
            {selectedTicket ? (
              <div className="space-y-5">
                <div className="border-b border-slate-100 pb-3 flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-slate-900 text-base">{selectedTicket.subject}</h3>
                    <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                      <span className="flex items-center gap-1"><User size={12} /> {selectedTicket.customerName}</span>
                      <span className="flex items-center gap-1"><Mail size={12} /> {selectedTicket.email}</span>
                      <span className="flex items-center gap-1"><Phone size={12} /> {selectedTicket.phone}</span>
                    </div>
                  </div>
                  <span className="text-xs text-slate-400">{selectedTicket.createdAt}</span>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs text-slate-700 space-y-1">
                  <span className="font-bold text-slate-900 block mb-1">Nội dung thắc mắc / yêu cầu:</span>
                  <p className="leading-relaxed whitespace-pre-wrap">{selectedTicket.message}</p>
                </div>

                {selectedTicket.reply && (
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-xs text-blue-900 space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-blue-800 mb-1">
                      <CornerDownRight size={14} /> Phản hồi từ Chuyên viên CSKH:
                    </div>
                    <p className="leading-relaxed whitespace-pre-wrap">{selectedTicket.reply}</p>
                  </div>
                )}

                <PermissionGate permission="crm.edit" currentRole={currentRole}>
                  <form onSubmit={handleSendTicketReply} className="pt-4 border-t border-slate-100">
                    <label className="block text-xs font-semibold text-slate-700 mb-2">
                      Soạn câu trả lời gửi đến khách ({selectedTicket.email}):
                    </label>
                    <textarea
                      rows={4}
                      required
                      placeholder="Kính chào quý khách, Nhà Xinh xin phép được hỗ trợ..."
                      value={ticketReplyText}
                      onChange={(e) => setTicketReplyText(e.target.value)}
                      className="w-full p-3 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                    <div className="flex justify-end mt-3">
                      <button
                        type="submit"
                        className="px-5 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 flex items-center gap-1.5 shadow-sm transition-all"
                      >
                        <Send size={14} /> Gửi email phản hồi & Đóng ticket
                      </button>
                    </div>
                  </form>
                </PermissionGate>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full py-20 text-slate-400 text-xs">
                <MessageSquare size={40} className="stroke-1 mb-2 text-slate-300" />
                Chọn một yêu cầu hỗ trợ từ danh sách bên trái để xem nội dung và phản hồi.
              </div>
            )}
          </div>
        </div>
      </div>
      )}
    </div>
  );
}
