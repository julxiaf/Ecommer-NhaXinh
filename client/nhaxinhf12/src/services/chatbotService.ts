import { ENDPOINTS } from "./apiEndpoints";

export interface ChatMessage {
  id?: number;
  senderType: "USER" | "BOT" | "AGENT" | "ADMIN" | "SYSTEM";
  messageText: string;
  createdAt?: string;
  isOverridden?: boolean;
}

export interface ChatResponse {
  conversationId: number;
  mode: "BOT" | "AGENT";
  latestReply: ChatMessage;
  messages: ChatMessage[];
}

export interface AdminConversation {
  id: number;
  title: string;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  mode: "BOT" | "AGENT";
  status: "ACTIVE" | "CLOSED";
  lastMessage: string;
  lastSender: "USER" | "BOT" | "AGENT";
  updatedAt: string;
}

const STORAGE_CONV_KEY = "nhaxinh_chatbot_conv_id";
const STORAGE_MODE_KEY = "nhaxinh_chatbot_mode";

export const chatbotService = {
  getStoredConversationId(): number | null {
    const stored = localStorage.getItem(STORAGE_CONV_KEY);
    return stored ? Number(stored) : null;
  },

  setStoredConversationId(id: number) {
    localStorage.setItem(STORAGE_CONV_KEY, String(id));
  },

  getStoredMode(): "BOT" | "AGENT" {
    const m = localStorage.getItem(STORAGE_MODE_KEY);
    return m === "AGENT" ? "AGENT" : "BOT";
  },

  setStoredMode(mode: "BOT" | "AGENT") {
    localStorage.setItem(STORAGE_MODE_KEY, mode);
  },

  async sendMessage(messageText: string, requestedMode?: "BOT" | "AGENT"): Promise<ChatResponse> {
    const convId = this.getStoredConversationId();
    const mode = requestedMode || this.getStoredMode();

    try {
      const res = await fetch(ENDPOINTS.CHATBOT.MESSAGE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId: convId,
          messageText,
          mode,
        }),
      });

      if (!res.ok) {
        throw new Error(`Gửi tin nhắn thất bại (${res.status})`);
      }

      const data: ChatResponse = await res.json();
      if (data.conversationId) {
        this.setStoredConversationId(data.conversationId);
      }
      if (data.mode) {
        this.setStoredMode(data.mode);
      }
      return data;
    } catch (e) {
      console.warn("Lỗi kết nối API Chatbot, dùng phản hồi offline:", e);
      // Fallback offline nếu server đang khởi động
      const fallbackMode = requestedMode || mode;
      const isAgent = fallbackMode === "AGENT" || messageText.toLowerCase().includes("nhân viên");
      return {
        conversationId: convId || Date.now(),
        mode: isAgent ? "AGENT" : "BOT",
        latestReply: {
          id: Date.now(),
          senderType: isAgent ? "AGENT" : "BOT",
          messageText: isAgent
            ? "Chuyên viên tư vấn Nhà Xinh đã nhận được yêu cầu của bạn và sẽ liên hệ hỗ trợ bạn sớm nhất! Hotline tư vấn: 0974.933.486."
            : "Cảm ơn bạn đã nhắn tin cho Nhà Xinh! Trợ lý ảo AI có thể giúp bạn tìm kiếm nội thất, tư vấn kích thước và tra cứu đơn hàng.",
          createdAt: new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
        },
        messages: [],
      };
    }
  },

  async switchMode(mode: "BOT" | "AGENT"): Promise<void> {
    this.setStoredMode(mode);
    const convId = this.getStoredConversationId();
    if (convId) {
      try {
        await fetch(ENDPOINTS.CHATBOT.SWITCH_MODE, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            conversationId: convId,
            mode,
          }),
        });
      } catch (e) {
        console.warn("Không thể đổi mode trên server:", e);
      }
    }
  },

  async getMessages(conversationId: number): Promise<ChatMessage[]> {
    try {
      const res = await fetch(ENDPOINTS.CHATBOT.CONVERSATION_MESSAGES(conversationId));
      if (!res.ok) return [];
      const modeHeader = res.headers.get("X-Conversation-Mode");
      if (modeHeader === "BOT" || modeHeader === "AGENT") {
        this.setStoredMode(modeHeader);
      }
      return await res.json();
    } catch {
      return [];
    }
  },

  async getAdminConversations(): Promise<AdminConversation[]> {
    try {
      const res = await fetch(ENDPOINTS.CHATBOT.ADMIN_CONVERSATIONS);
      if (!res.ok) return [];
      return await res.json();
    } catch (e) {
      console.warn("Lỗi tải danh sách hội thoại admin:", e);
      return [];
    }
  },

  async sendAdminReply(conversationId: number, messageText: string): Promise<ChatMessage | null> {
    try {
      const res = await fetch(ENDPOINTS.CHATBOT.ADMIN_REPLY(conversationId), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageText }),
      });
      if (!res.ok) return null;
      return await res.json();
    } catch (e) {
      console.warn("Lỗi gửi phản hồi CSKH:", e);
      return null;
    }
  },

  async overrideMessage(messageId: number, messageText: string): Promise<ChatMessage | null> {
    try {
      const res = await fetch(ENDPOINTS.CHATBOT.ADMIN_OVERRIDE(messageId), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageText }),
      });
      if (!res.ok) return null;
      return await res.json();
    } catch (e) {
      console.warn("Lỗi khi ghi đè tin nhắn của bot:", e);
      return null;
    }
  },

  async closeConversation(conversationId: number): Promise<boolean> {
    try {
      const res = await fetch(ENDPOINTS.CHATBOT.ADMIN_CLOSE(conversationId), {
        method: "POST",
      });
      return res.ok;
    } catch {
      return false;
    }
  },
};

