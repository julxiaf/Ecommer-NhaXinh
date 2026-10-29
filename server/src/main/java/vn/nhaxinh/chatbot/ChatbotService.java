package vn.nhaxinh.chatbot;

import java.util.List;
import java.util.Locale;
import java.util.Optional;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.nhaxinh.user.User;

@Service
@Transactional
public class ChatbotService {

    private final ChatbotConversationRepository conversationRepository;
    private final ChatbotMessageRepository messageRepository;

    public ChatbotService(
            ChatbotConversationRepository conversationRepository,
            ChatbotMessageRepository messageRepository
    ) {
        this.conversationRepository = conversationRepository;
        this.messageRepository = messageRepository;
    }

    public ChatbotConversation createConversation(User user, String title) {
        return conversationRepository.save(new ChatbotConversation(user, title));
    }

    public ChatbotConversation createGuestConversation(String title) {
        return conversationRepository.save(new ChatbotConversation(title));
    }

    public ChatbotConversation getOrCreateConversation(Long conversationId, User user) {
        if (conversationId != null) {
            Optional<ChatbotConversation> existing = conversationRepository.findById(conversationId);
            if (existing.isPresent()) {
                ChatbotConversation conv = existing.get();
                if (conv.getUser() == null && user != null) {
                    conv.setUser(user);
                    conversationRepository.save(conv);
                }
                return conv;
            }
        }
        if (user != null) {
            return createConversation(user, "Tư vấn khách hàng: " + (user.getFullName() != null ? user.getFullName() : user.getUsername()));
        }
        return createGuestConversation("Hội thoại tư vấn trực tuyến");
    }

    @Transactional(readOnly = true)
    public List<ChatbotConversation> getUserConversations(Long userId) {
        return conversationRepository.findByUserIdOrderByCreatedAtDesc(userId);
    }

    @Transactional(readOnly = true)
    public List<ChatbotConversation> getAllConversations() {
        return conversationRepository.findAllWithUserOrderByUpdatedAtDesc();
    }

    @Transactional
    public ChatbotMessage overrideBotMessage(Long messageId, String newText) {
        ChatbotMessage message = messageRepository.findById(messageId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy tin nhắn với ID: " + messageId));

        message.setMessageText(newText);
        message.setSenderType("AGENT");
        message.setMetadata("{\"overridden\":true,\"overriddenBy\":\"CSKH\",\"updatedAt\":\"" + java.time.LocalDateTime.now() + "\"}");

        ChatbotMessage saved = messageRepository.save(message);

        ChatbotConversation conv = saved.getConversation();
        if (conv != null) {
            conv.setUpdatedAt(java.time.LocalDateTime.now());
            conversationRepository.save(conv);
        }

        return saved;
    }

    public ChatbotMessage adminReply(Long conversationId, String replyText) {
        ChatbotConversation conv = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy cuộc hội thoại với ID: " + conversationId));
        conv.setUpdatedAt(java.time.LocalDateTime.now());
        conv.setMode("AGENT");
        conversationRepository.save(conv);
        ChatbotMessage agentMsg = new ChatbotMessage(conv, "AGENT", replyText);
        agentMsg.setMetadata("{\"adminReply\":true,\"createdAt\":\"" + java.time.LocalDateTime.now() + "\"}");
        return messageRepository.save(agentMsg);
    }

    @Transactional(readOnly = true)
    public ChatbotMessage getLastMessage(Long conversationId) {
        return messageRepository.findTopByConversationIdOrderByCreatedAtDesc(conversationId);
    }

    public ChatbotConversation closeConversation(Long conversationId) {
        ChatbotConversation conv = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy cuộc hội thoại với ID: " + conversationId));
        conv.setStatus("ARCHIVED");
        conv.setUpdatedAt(java.time.LocalDateTime.now());
        return conversationRepository.save(conv);
    }

    @Transactional(readOnly = true)
    public Optional<ChatbotConversation> getConversation(Long id) {
        return conversationRepository.findById(id);
    }

    public ChatbotMessage addMessage(ChatbotConversation conversation, String senderType, String text) {
        return messageRepository.save(new ChatbotMessage(conversation, senderType, text));
    }

    public static final long AGENT_TIMEOUT_SECONDS = 60; // 60 giây chờ phản hồi từ CSKH

    @Transactional
    public boolean checkAndHandleAgentTimeout(Long conversationId) {
        if (conversationId == null) return false;
        Optional<ChatbotConversation> opt = conversationRepository.findById(conversationId);
        if (opt.isEmpty()) return false;

        ChatbotConversation conv = opt.get();
        if (!"AGENT".equalsIgnoreCase(conv.getMode())) {
            return false;
        }

        ChatbotMessage lastMsg = messageRepository.findTopByConversationIdOrderByCreatedAtDesc(conversationId);
        if (lastMsg == null || lastMsg.getCreatedAt() == null) {
            return false;
        }

        // Kiểm tra xem tin nhắn cuối cùng có phải là trạng thái khách đang chờ CSKH không:
        // 1. Khách gửi tin (USER)
        // 2. Hoặc tin chuyển giao handoff (requestAgent: true)
        // 3. Hoặc tin nhắn chờ tự động
        boolean isWaitingForAgent = "USER".equalsIgnoreCase(lastMsg.getSenderType())
                || "SYSTEM".equalsIgnoreCase(lastMsg.getSenderType())
                || (lastMsg.getMetadata() != null && lastMsg.getMetadata().contains("\"requestAgent\":true"))
                || lastMsg.getMessageText().contains("chuyển kết nối sang **Chuyên viên tư vấn CSKH");

        if (!isWaitingForAgent) {
            // Đã có phản hồi thực tế từ CSKH (adminReply) nên không tính là quá hạn
            return false;
        }

        long secondsElapsed = java.time.Duration.between(lastMsg.getCreatedAt(), java.time.LocalDateTime.now()).getSeconds();
        if (secondsElapsed >= AGENT_TIMEOUT_SECONDS) {
            // Quá thời gian quy định mà nhân viên CSKH chưa phản hồi -> Tự động thông báo và chuyển về mode=BOT
            conv.setMode("BOT");
            conv.setUpdatedAt(java.time.LocalDateTime.now());
            conversationRepository.save(conv);

            String timeoutNotice = "⏰ **Thông báo từ Nhà Xinh:**\n"
                    + "Hiện tại tất cả các chuyên viên tư vấn CSKH đều đang bận hỗ trợ khách hàng khác nên chưa thể phản hồi bạn ngay.\n\n"
                    + "Nhà Xinh xin phép chuyển bạn quay lại với **Trợ lý ảo AI** để tiếp tục hỗ trợ bạn không bị gián đoạn! 🤖\n"
                    + "👉 Nếu bạn cần giải đáp gấp hoặc nhận báo giá trực tiếp, vui lòng kết nối qua:\n"
                    + "• **Zalo CSKH:** https://zalo.me/0974933486\n"
                    + "• **Hotline 24/7:** **0974.933.486** (Tư vấn miễn phí)";

            ChatbotMessage noticeMsg = new ChatbotMessage(conv, "BOT", timeoutNotice);
            noticeMsg.setMetadata("{\"agentTimeout\":true,\"switchedToBot\":true}");
            messageRepository.save(noticeMsg);
            return true;
        }

        return false;
    }

    @Transactional(readOnly = true)
    public List<ChatbotMessage> getMessages(Long conversationId) {
        checkAndHandleAgentTimeout(conversationId);
        return messageRepository.findByConversationIdOrderByCreatedAtAsc(conversationId);
    }

    public ChatbotConversation switchMode(Long conversationId, String newMode) {
        ChatbotConversation conv = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy cuộc hội thoại với ID: " + conversationId));
        String targetMode = "AGENT".equalsIgnoreCase(newMode) ? "AGENT" : "BOT";
        conv.setMode(targetMode);
        conv.setUpdatedAt(java.time.LocalDateTime.now());
        ChatbotConversation saved = conversationRepository.save(conv);

        if ("AGENT".equalsIgnoreCase(targetMode)) {
            ChatbotMessage handoff = new ChatbotMessage(saved, "SYSTEM",
                    "Dạ Nhà Xinh đã chuyển kết nối sang **Chuyên viên tư vấn CSKH trực tiếp (Live Agent)**! 👨‍💼\n\n"
                    + "Chuyên viên của Nhà Xinh đã nhận được yêu cầu và sẽ phản hồi bạn ngay tại đây trong ít phút.\n"
                    + "👉 **Kết nối Zalo tư vấn viên ngay:** https://zalo.me/0974933486\n"
                    + "📞 **Hotline tư vấn 24/7:** 0974.933.486");
            handoff.setMetadata("{\"requestAgent\":true,\"createdAt\":\"" + java.time.LocalDateTime.now() + "\"}");
            messageRepository.save(handoff);
        } else {
            ChatbotMessage botNotice = new ChatbotMessage(saved, "BOT",
                    "Đã chuyển lại kết nối với **Trợ lý ảo AI Nhà Xinh**! 🤖 Tôi có thể hỗ trợ bạn tìm mẫu nội thất, gợi ý chất liệu và tra cứu đơn hàng!");
            messageRepository.save(botNotice);
        }

        return saved;
    }

    /**
     * Xử lý tin nhắn từ người dùng, tự động phân tích ý định và phản hồi theo chế độ (AI Bot hoặc Chuyên viên CSKH)
     */
    public ChatbotMessage processUserMessage(ChatbotConversation conversation, String userText, String requestedMode) {
        // Lưu tin nhắn của khách
        addMessage(conversation, "USER", userText);

        String lowerText = userText.trim().toLowerCase(Locale.ROOT);

        // Kiểm tra ý định chuyển sang nhân viên tư vấn trực tiếp (Live Agent)
        boolean wantsAgent = "AGENT".equalsIgnoreCase(requestedMode)
                || lowerText.contains("nhân viên")
                || lowerText.contains("tư vấn viên")
                || lowerText.contains("gặp người")
                || lowerText.contains("người thật")
                || lowerText.contains("chăm sóc khách hàng")
                || lowerText.contains("cskh")
                || lowerText.contains("live agent")
                || lowerText.contains("hotline")
                || lowerText.contains("zalo");

        if (wantsAgent && !"AGENT".equalsIgnoreCase(conversation.getMode())) {
            conversation.setMode("AGENT");
            conversation.setUpdatedAt(java.time.LocalDateTime.now());
            conversationRepository.save(conversation);

            String handoffReply = "Dạ Nhà Xinh đã chuyển kết nối sang **Chuyên viên tư vấn CSKH trực tiếp (Live Agent)**! 👨‍💼\n\n"
                    + "Chuyên viên của Nhà Xinh đã nhận được yêu cầu và sẽ phản hồi bạn ngay tại đây trong ít phút.\n"
                    + "👉 **Kết nối Zalo tư vấn viên ngay:** https://zalo.me/0974933486\n"
                    + "📞 **Hotline tư vấn 24/7:** 0974.933.486";
            ChatbotMessage handoffMsg = new ChatbotMessage(conversation, "AGENT", handoffReply);
            handoffMsg.setMetadata("{\"requestAgent\":true,\"createdAt\":\"" + java.time.LocalDateTime.now() + "\"}");
            return messageRepository.save(handoffMsg);
        }

        // Nếu cuộc hội thoại đang ở chế độ CHUYÊN VIÊN CSKH
        if ("AGENT".equalsIgnoreCase(conversation.getMode())) {
            // Kiểm tra xem khách có muốn chuyển lại về Bot không
            if (lowerText.contains("quay lại bot") || lowerText.contains("chat với bot") || lowerText.contains("trợ lý ảo")) {
                conversation.setMode("BOT");
                conversationRepository.save(conversation);
                String botBackReply = "Dạ, đã chuyển lại kết nối với **Trợ lý ảo AI Nhà Xinh**! Tôi có thể giúp gì thêm cho bạn về sản phẩm, chính sách hoặc tra cứu đơn hàng?";
                return addMessage(conversation, "BOT", botBackReply);
            }

            // Nếu khách hỏi về Zalo / Hotline / Liên hệ khi đang ở chế độ AGENT
            if (lowerText.contains("zalo") || lowerText.contains("hotline") || lowerText.contains("liên hệ") || lowerText.contains("sđt") || lowerText.contains("số điện thoại")) {
                String contactReply = "Dạ, bạn có thể kết nối ngay với chuyên viên tư vấn Nhà Xinh qua:\n"
                        + "• **Zalo CSKH:** https://zalo.me/0974933486\n"
                        + "• **Hotline tư vấn:** 0974.933.486\n"
                        + "Chuyên viên cũng đang hỗ trợ bạn ngay trong khung chat này ạ!";
                return addMessage(conversation, "AGENT", contactReply);
            }

            // Ghi nhận tin nhắn đang chờ chuyên viên phản hồi
            String agentWaitingReply = "Chuyên viên tư vấn Nhà Xinh đã nhận được tin nhắn: *\"" + userText + "\"* và đang soạn câu trả lời cho bạn. Bạn vui lòng chờ trong giây lát nhé!";
            ChatbotMessage waitingMsg = new ChatbotMessage(conversation, "AGENT", agentWaitingReply);
            waitingMsg.setMetadata("{\"requestAgent\":true,\"createdAt\":\"" + java.time.LocalDateTime.now() + "\"}");
            return messageRepository.save(waitingMsg);
        }

        // Chế độ TRỢ LÝ ẢO AI (BOT) - Tự động phân tích kiến thức nội thất
        String botReply = generateBotKnowledgeReply(lowerText);
        return addMessage(conversation, "BOT", botReply);
    }

    /**
     * Bộ máy tri thức AI tự động giải đáp về nội thất, đơn hàng, bảo hành Nhà Xinh
     */
    private String generateBotKnowledgeReply(String text) {
        // 0. Tư vấn Zalo & Hotline
        if (text.contains("zalo") || text.contains("hotline") || text.contains("liên hệ") || text.contains("sđt") || text.contains("số điện thoại")) {
            return "💬 **Kênh tư vấn & Liên hệ Nhà Xinh:**\n"
                    + "• **Chat Zalo trực tiếp:** https://zalo.me/0974933486\n"
                    + "• **Hotline 24/7:** **0974.933.486** (Tư vấn miễn phí)\n"
                    + "• Bạn cũng có thể bấm nút **\"Gặp nhân viên\"** ở góc trên khung chat để trò chuyện 1-1 với nhân viên CSKH!";
        }
        // 1. Tra cứu đơn hàng
        if (text.contains("đơn hàng") || text.contains("tra cứu") || text.contains("mã đơn") || text.contains("nx-") || text.matches(".*\\d{4,}.*")) {
            return "📦 **Tra cứu đơn hàng Nhà Xinh:**\n"
                    + "Để kiểm tra tiến độ đơn hàng, bạn có thể:\n"
                    + "1. Nhập trực tiếp Mã đơn hàng (VD: `NX-89421`) hoặc Số điện thoại đặt hàng.\n"
                    + "2. Vào trang **\"Tài khoản > Đơn mua\"** trên website để xem lộ trình giao nhận.\n"
                    + "Đơn hàng nội thất sẽ được nhân viên gọi điện xác nhận trước 2 tiếng khi giao hàng.";
        }

        // 2. Tư vấn Sofa phòng khách
        if (text.contains("sofa") || text.contains("phòng khách") || text.contains("ghế") || text.contains("bàn trà")) {
            return "🛋️ **Tư vấn Sofa & Phòng khách Nhà Xinh:**\n"
                    + "Nhà Xinh nổi tiếng với các dòng Sofa cao cấp:\n"
                    + "• **Sofa Da Thật (Ý):** Da bò tự nhiên 100%, êm ái, thoáng khí và càng dùng càng bóng đẹp.\n"
                    + "• **Sofa Vải / Nỉ Cao Cấp:** Thiết kế Bắc Âu (Scandinavian) thanh lịch, chống bám bụi và dễ vệ sinh.\n"
                    + "• **Sofa Góc Chữ L / Băng:** Tối ưu hóa không gian phòng khách căn hộ và biệt thự.\n\n"
                    + "👉 Bạn có thể xem ngay tại mục **\"Phòng khách > Sofa\"** trên thanh menu website nhé!";
        }

        // 3. Tư vấn Bàn ăn & Phòng bếp
        if (text.contains("bàn ăn") || text.contains("bếp") || text.contains("phòng ăn") || text.contains("ghế ăn")) {
            return "🍽️ **Bộ bàn ăn & Không gian bếp:**\n"
                    + "Nhà Xinh cung cấp các bộ bàn ăn 4 - 6 - 8 ghế từ gỗ sồi tự nhiên, mặt đá ceramic chống trầy xước và chịu nhiệt vượt trội. Mời bạn tham khảo bộ sưu tập tại danh mục **\"Phòng ăn\"** trên website!";
        }

        // 4. Tư vấn Giường ngủ & Phòng ngủ
        if (text.contains("giường") || text.contains("phòng ngủ") || text.contains("tủ áo") || text.contains("nệm")) {
            return "🛏️ **Nội thất Phòng ngủ:**\n"
                    + "Các mẫu giường ngủ bọc da, bọc nỉ và gỗ tự nhiên của Nhà Xinh được nghiên cứu công thái học, mang đến giấc ngủ sâu và không gian thư giãn sang trọng.";
        }

        // 5. Chính sách bảo hành & bảo trì
        if (text.contains("bảo hành") || text.contains("đổi trả") || text.contains("bảo trì") || text.contains("hỏng")) {
            return "🛡️ **Chính sách Bảo hành & Đổi trả:**\n"
                    + "• **Bảo hành 2 năm** cho toàn bộ phần khung gỗ, đệm mút và kết cấu sản phẩm.\n"
                    + "• **Bảo trì trọn đời:** Hỗ trợ kiểm tra, vệ sinh da và làm mới định kỳ.\n"
                    + "• **1 đổi 1 trong 3 ngày:** Nếu phát hiện lỗi kỹ thuật từ nhà sản xuất.";
        }

        // 6. Giao hàng & Lắp đặt
        if (text.contains("giao hàng") || text.contains("vận chuyển") || text.contains("ship") || text.contains("lắp đặt")) {
            return "🚚 **Chính sách Giao hàng & Lắp đặt:**\n"
                    + "• **Miễn phí 100%** phí giao hàng và công lắp đặt hoàn thiện cho đơn từ 10.000.000₫ trong nội thành.\n"
                    + "• Đội ngũ kỹ thuật viên Nhà Xinh sẽ vận chuyển bằng xe chuyên dụng và dọn dẹp sạch sẽ sau khi lắp đặt.";
        }

        // 7. Khuyến mãi / Voucher
        if (text.contains("khuyến mãi") || text.contains("voucher") || text.contains("giảm giá") || text.contains("ưu đãi")) {
            return "🎁 **Ưu đãi & Khuyến mãi hiện có:**\n"
                    + "• Giảm ngay **5% - 15%** cho các bộ sưu tập nội thất mới.\n"
                    + "• Tặng phiếu mua sắm trị giá tới 5.000.000₫ khi hoàn thiện căn hộ.\n"
                    + "• Hỗ trợ trả góp 0% lãi suất qua thẻ tín dụng.";
        }

        // Mặc định phản hồi thân thiện kèm gợi ý
        return "Chào bạn! Tôi là **Trợ lý ảo AI của Nội thất Nhà Xinh** 🤖✨\n\n"
                + "Tôi có thể hỗ trợ bạn ngay tức thì về:\n"
                + "• Tư vấn mẫu Sofa, Bàn ăn, Giường ngủ theo kích thước phòng\n"
                + "• Hướng dẫn tra cứu tiến độ đơn hàng\n"
                + "• Chính sách giao hàng, lắp đặt và bảo hành 2 năm\n\n"
                + "👉 Bạn có câu hỏi nào hoặc muốn **\"Gặp nhân viên tư vấn trực tiếp\"** không ạ?";
    }
}
