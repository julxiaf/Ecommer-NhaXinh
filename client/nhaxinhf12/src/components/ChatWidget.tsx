import { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import {
  MessageSquare, X, Send, Bot, Headset,
  Sparkles, PhoneCall, ChevronDown
} from "lucide-react";
import { chatbotService, type ChatMessage } from "../services/chatbotService";

export default function ChatWidget() {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<"BOT" | "AGENT">("BOT");
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [showTooltip, setShowTooltip] = useState(true);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 1,
      senderType: "BOT",
      messageText:
        "Xin chào quý khách! Tôi là **Trợ lý ảo AI của Nội thất Nhà Xinh** 🤖✨\nTôi có thể tư vấn mẫu Sofa, Bàn ăn, kích thước phòng, chính sách bảo hành hoặc tra cứu đơn hàng giúp bạn ngay lập tức!",
      createdAt: "Vừa xong",
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Không hiển thị widget chat khi đang ở trong trang quản trị Admin
  const isAdmin = location.pathname.startsWith("/admin");

  // Tự động cuộn xuống tin nhắn cuối
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      setShowTooltip(false);
      inputRef.current?.focus();
    }
  }, [isOpen, messages]);

  // Tải mode đã lưu
  useEffect(() => {
    setMode(chatbotService.getStoredMode());
  }, []);

  // Polling đồng bộ tin nhắn 2 chiều thời gian thực khi cửa sổ chat đang mở
  useEffect(() => {
    if (!isOpen) return;
    const convId = chatbotService.getStoredConversationId();
    if (!convId) return;

    const interval = setInterval(async () => {
      try {
        const remoteMsgs = await chatbotService.getMessages(convId);
        // Đồng bộ mode từ server (ví dụ khi quá 60s không có phản hồi từ CSKH, server tự động đổi về BOT)
        const serverMode = chatbotService.getStoredMode();
        if (serverMode && serverMode !== mode) {
          setMode(serverMode);
        }

        if (remoteMsgs && remoteMsgs.length > 0) {
          setMessages((prev) => {
            if (
              remoteMsgs.length !== prev.length ||
              remoteMsgs[remoteMsgs.length - 1].messageText !== prev[prev.length - 1]?.messageText
            ) {
              return remoteMsgs;
            }
            return prev;
          });
        }
      } catch (e) {
        // ignore
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [isOpen, mode]);

  // Gửi tin nhắn
  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || input).trim();
    if (!text || isTyping) return;

    setInput("");
    const userMsg: ChatMessage = {
      id: Date.now(),
      senderType: "USER",
      messageText: text,
      createdAt: new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsTyping(true);

    try {
      const response = await chatbotService.sendMessage(text, mode);
      if (response.mode) {
        setMode(response.mode);
      }
      if (response.latestReply) {
        setMessages((prev) => [...prev, response.latestReply]);
      }
    } catch (err) {
      console.error("Lỗi khi gửi tin nhắn:", err);
    } finally {
      setIsTyping(false);
    }
  };

  // Chuyển đổi giữa chế độ AI Bot và Chuyên viên tư vấn CSKH
  const handleToggleMode = async () => {
    const newMode = mode === "BOT" ? "AGENT" : "BOT";
    setMode(newMode);
    await chatbotService.switchMode(newMode);
    const convId = chatbotService.getStoredConversationId();
    if (convId) {
      try {
        const msgs = await chatbotService.getMessages(convId);
        if (msgs && msgs.length > 0) {
          setMessages(msgs);
        }
      } catch (e) {
        // ignore
      }
    }
  };

  if (isAdmin) return null;

  const quickPrompts = [
    { label: "💬 Chat Zalo trực tiếp", prompt: "Cho tôi xin liên hệ Zalo tư vấn viên trực tiếp" },
    { label: "🛋️ Tư vấn sofa phòng khách", prompt: "Tư vấn cho tôi mẫu sofa phòng khách hiện đại" },
    { label: "📦 Tra cứu đơn hàng", prompt: "Tôi muốn tra cứu tiến độ đơn hàng" },
    { label: "🛡️ Chính sách bảo hành", prompt: "Chính sách bảo hành và đổi trả của Nhà Xinh như thế nào?" },
    { label: "👨‍💼 Gặp nhân viên tư vấn", prompt: "Tôi muốn gặp chuyên viên tư vấn trực tiếp" },
  ];

  return (
    <div className="fixed bottom-5 right-5 z-[9999] font-sans antialiased">
      {/* ── CỬA SỔ CHAT POPOVER ── */}
      {isOpen && (
        <div className="w-[360px] sm:w-[410px] h-[540px] max-h-[85vh] bg-white rounded-3xl shadow-2xl border border-slate-200/90 flex flex-col overflow-hidden mb-3 animate-in slide-in-from-bottom-5 duration-200">
          {/* Header */}
          <div className="bg-linear-to-r from-slate-900 via-blue-950 to-slate-900 text-white p-4 shrink-0 flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-2xl bg-blue-600/30 border border-blue-400/40 flex items-center justify-center text-white backdrop-blur-xs">
                  {mode === "BOT" ? <Bot size={22} className="text-blue-400" /> : <Headset size={22} className="text-emerald-400" />}
                </div>
                <span
                  className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-slate-900 ${
                    mode === "BOT" ? "bg-blue-400" : "bg-emerald-400"
                  }`}
                />
              </div>

              <div>
                <h3 className="font-bold text-sm leading-tight flex items-center gap-1.5">
                  {mode === "BOT" ? "Trợ lý AI Nhà Xinh" : "Chuyên viên tư vấn"}
                  {mode === "BOT" ? (
                    <Sparkles size={13} className="text-amber-400" />
                  ) : (
                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                      LIVE
                    </span>
                  )}
                </h3>
                <p className="text-[11px] text-slate-300/80">
                  {mode === "BOT" ? "Tự động phản hồi 24/7" : "CSKH trực tuyến 1-1"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {/* Nút mở Zalo trực tiếp trong header */}
              <a
                href="https://zalo.me/0974933486"
                target="_blank"
                rel="noopener noreferrer"
                className="px-2 py-1 rounded-xl text-[11px] font-bold flex items-center gap-1 transition-all bg-sky-500/20 hover:bg-sky-500/30 text-sky-200 border border-sky-400/30 shadow-xs"
                title="Mở ứng dụng Zalo chat trực tiếp (0974.933.486)"
              >
                <img
                  src="https://page.widget.zalo.me/static/images/2.0/Logo.svg"
                  alt="Zalo"
                  className="w-3.5 h-3.5 object-contain"
                />
                <span>Zalo</span>
              </a>

              {/* Nút chuyển đổi vai trò phản hồi (AI Bot <-> Chuyên viên CSKH) */}
              <button
                type="button"
                onClick={handleToggleMode}
                className={`px-2.5 py-1 rounded-xl text-[11px] font-bold flex items-center gap-1 transition-all border ${
                  mode === "BOT"
                    ? "bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-400 shadow-xs"
                    : "bg-blue-600 hover:bg-blue-500 text-white border-blue-400 shadow-xs"
                }`}
                title="Thay đổi người phản hồi giữa AI Chatbot và Chuyên viên tư vấn"
              >
                {mode === "BOT" ? (
                  <>
                    <Headset size={12} /> Gặp nhân viên
                  </>
                ) : (
                  <>
                    <Bot size={12} /> Đổi sang Bot
                  </>
                )}
              </button>

              {/* Nút đóng / thu gọn */}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-slate-300 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
                title="Thu nhỏ cửa sổ chat"
              >
                <ChevronDown size={18} />
              </button>
            </div>
          </div>

          {/* Dòng trạng thái hỗ trợ */}
          <div className="px-4 py-1.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span className="flex items-center gap-1">
              {mode === "BOT" ? (
                <>🤖 Đang trò chuyện với Trợ lý AI</>
              ) : (
                <span className="text-amber-700 font-bold flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
                  👨‍💼 Đang chờ CSKH (Tự về Bot sau 60s)
                </span>
              )}
            </span>
            <div className="flex items-center gap-2 font-semibold">
              <a
                href="https://zalo.me/0974933486"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sky-600 hover:underline flex items-center gap-1"
                title="Nhấn để mở Zalo chat"
              >
                <img
                  src="https://page.widget.zalo.me/static/images/2.0/Logo.svg"
                  alt="Zalo"
                  className="w-3 h-3 object-contain"
                />
                Zalo
              </a>
              <span className="text-slate-300">•</span>
              <a
                href="tel:0974933486"
                className="text-blue-600 hover:underline flex items-center gap-1"
                title="Gọi Hotline tư vấn"
              >
                <PhoneCall size={10} /> 0974.933.486
              </a>
            </div>
          </div>

          {/* Khung tin nhắn */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-slate-50/50">
            {messages.map((m, idx) => {
              const isUser = m.senderType === "USER";
              const isBot = m.senderType === "BOT";
              const isAgent = m.senderType === "AGENT" || m.senderType === "ADMIN";

              return (
                <div
                  key={m.id || idx}
                  className={`flex gap-2 max-w-[88%] ${isUser ? "ml-auto flex-row-reverse" : "mr-auto"}`}
                >
                  {/* Avatar biểu trưng */}
                  {!isUser && (
                    <div
                      className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 text-white text-xs mt-1 ${
                        isBot
                          ? "bg-gradient-to-br from-indigo-500 to-blue-600 shadow-xs"
                          : "bg-gradient-to-br from-emerald-500 to-teal-600 shadow-xs ring-1 ring-emerald-300"
                      }`}
                    >
                      {isBot ? <Bot size={14} /> : <Headset size={14} />}
                    </div>
                  )}

                  {/* Nội dung bóng tin nhắn & Tag định danh người gửi */}
                  <div className="space-y-1 min-w-0">
                    {/* Nhãn định danh rõ ràng Người gửi */}
                    <div className={`flex items-center gap-1.5 px-0.5 ${isUser ? "justify-end" : "justify-start"}`}>
                      {isUser ? (
                        <span className="text-[10px] font-bold text-slate-500">Bạn</span>
                      ) : isBot ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-black px-1.5 py-0.5 rounded-md bg-indigo-100 text-indigo-800 border border-indigo-200">
                          <Bot size={11} className="text-indigo-600" /> Trợ lý AI (Bot)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-black px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-2xs">
                          <Headset size={11} className="text-emerald-700" /> Nhân viên CSKH Nhà Xinh
                        </span>
                      )}

                      {/* Huy hiệu ghi đè nếu tin nhắn Bot đã được nhân viên sửa lại */}
                      {m.isOverridden && (
                        <span className="text-[9px] font-semibold text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 inline-flex items-center gap-0.5">
                          ✏️ Đã được CSKH hiệu chỉnh
                        </span>
                      )}
                    </div>

                    <div
                      className={`p-3 rounded-2xl text-xs leading-relaxed shadow-xs whitespace-pre-wrap ${
                        isUser
                          ? "bg-blue-600 text-white rounded-tr-xs"
                          : isAgent
                          ? "bg-emerald-50/90 text-emerald-950 border border-emerald-300 rounded-tl-xs ring-1 ring-emerald-100"
                          : "bg-white text-slate-800 border border-indigo-100/90 rounded-tl-xs"
                      }`}
                    >
                      {m.messageText}
                    </div>

                    {m.createdAt && (
                      <span
                        className={`text-[9px] text-slate-400 block px-1 ${
                          isUser ? "text-right" : "text-left"
                        }`}
                      >
                        {m.createdAt}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Hiệu ứng gõ chữ (Typing Indicator) */}
            {isTyping && (
              <div className="flex items-center gap-2 max-w-[80%]">
                <div className="w-7 h-7 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0">
                  <Bot size={14} />
                </div>
                <div className="bg-white border border-slate-200 p-3 rounded-2xl rounded-tl-xs flex items-center gap-1.5 shadow-xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-bounce" />
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-bounce [animation-delay:0.2s]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-bounce [animation-delay:0.4s]" />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Gợi ý câu hỏi nhanh (Quick Chips) */}
          <div className="px-3 py-2 bg-white border-t border-slate-100 flex gap-1.5 overflow-x-auto no-scrollbar">
            {quickPrompts.map((qp, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSendMessage(qp.prompt)}
                disabled={isTyping}
                className="whitespace-nowrap px-2.5 py-1 rounded-full bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 text-[11px] font-medium border border-slate-200/80 transition-all shadow-2xs shrink-0 disabled:opacity-50"
              >
                {qp.label}
              </button>
            ))}
          </div>

          {/* Ô nhập tin nhắn */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="p-3 bg-white border-t border-slate-100 flex items-center gap-2"
          >
            <input
              ref={inputRef}
              type="text"
              placeholder={
                mode === "BOT"
                  ? "Nhập câu hỏi cho Trợ lý AI..."
                  : "Nhắn tin cho chuyên viên tư vấn..."
              }
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={isTyping}
              className="flex-1 p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all font-medium text-slate-800 disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={!input.trim() || isTyping}
              className="p-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all shadow-xs disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
              title="Gửi tin nhắn"
            >
              <Send size={15} />
            </button>
          </form>
        </div>
      )}

      {/* ── NÚT NỔI LIÊN HỆ & CHAT (TRIGGER BUTTONS) ── */}
      <div className="flex flex-col items-end gap-2.5">
        {/* Nút Zalo nổi (Luôn xuất hiện phía trên nút Chat khi cửa sổ chat thu nhỏ) */}
        {!isOpen && (
          <div className="relative group flex items-center">
            {/* Tooltip khi hover vào nút Zalo */}
            <div className="absolute right-16 px-3 py-1.5 bg-slate-900/95 text-white text-xs font-medium rounded-xl shadow-xl whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none border border-slate-700/60 flex items-center gap-1.5">
              <span>Chat Zalo tư vấn (0974.933.486)</span>
            </div>
            <a
              href="https://zalo.me/0974933486"
              target="_blank"
              rel="noopener noreferrer"
              className="w-13 h-13 rounded-full bg-[#0068ff] hover:bg-[#0058db] shadow-lg shadow-blue-500/30 flex items-center justify-center transition-all transform hover:scale-110 active:scale-95 border-2 border-white ring-2 ring-blue-400/40"
              title="Mở Zalo tư vấn trực tiếp: 0974.933.486"
            >
              <img
                src="https://page.widget.zalo.me/static/images/2.0/Logo.svg"
                alt="Zalo"
                className="w-7 h-7 object-contain"
              />
            </a>
          </div>
        )}

        {/* Nút Chat AI / Nhân viên tư vấn */}
        <div className="flex items-center gap-3 justify-end">
          {/* Tooltip gợi ý nổi ban đầu */}
          {showTooltip && !isOpen && (
            <div
              onClick={() => setIsOpen(true)}
              className="bg-white px-3.5 py-2 rounded-2xl shadow-xl border border-slate-200 text-xs font-semibold text-slate-800 flex items-center gap-2 cursor-pointer hover:bg-slate-50 transition-all animate-bounce"
            >
              <Sparkles size={14} className="text-amber-500" />
              <span>Chat tư vấn Nhà Xinh ngay!</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowTooltip(false);
                }}
                className="text-slate-400 hover:text-slate-600 p-0.5 ml-1"
              >
                <X size={12} />
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={() => setIsOpen((prev) => !prev)}
            className={`w-14 h-14 rounded-full shadow-2xl flex items-center justify-center text-white transition-all transform active:scale-90 relative ${
              isOpen
                ? "bg-slate-800 hover:bg-slate-900 rotate-90"
                : "bg-linear-to-tr from-blue-700 via-blue-600 to-sky-500 hover:shadow-blue-500/30 hover:scale-105"
            }`}
            title="Trò chuyện với Nhà Xinh"
          >
            {isOpen ? (
              <X size={24} />
            ) : (
              <>
                <MessageSquare size={24} />
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 border-2 border-white flex items-center justify-center text-[9px] font-bold">
                  1
                </span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
