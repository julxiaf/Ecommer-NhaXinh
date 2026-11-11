package vn.nhaxinh.chatbot;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.TimeUnit;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.chat.messages.AssistantMessage;
import org.springframework.ai.chat.messages.Message;
import org.springframework.ai.chat.messages.SystemMessage;
import org.springframework.ai.chat.messages.UserMessage;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.ai.chat.model.ChatResponse;
import org.springframework.ai.chat.prompt.Prompt;
import org.springframework.ai.google.genai.GoogleGenAiChatOptions;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/** Sinh câu trả lời cho chatbot bằng Spring AI (Google GenAI / Gemini), có tự động chuyển model dự phòng. */
@Component
public class GeminiClient {

    private static final Logger log = LoggerFactory.getLogger(GeminiClient.class);

    private static final String SYSTEM_PROMPT = """
            Bạn là Trợ lý ảo AI của cửa hàng Nội thất Nhà Xinh. Trả lời bằng tiếng Việt, thân thiện, ngắn gọn (tối đa ~150 từ),
            có thể dùng markdown đơn giản và emoji. Chỉ hỗ trợ các chủ đề: tư vấn sản phẩm nội thất (sofa, bàn ăn, giường, tủ...),
            phong cách/phối màu/kích thước phòng, chính sách giao hàng - lắp đặt - bảo hành - đổi trả, khuyến mãi, tra cứu đơn hàng.
            Thông tin cửa hàng: bảo hành 2 năm, bảo trì trọn đời, 1 đổi 1 trong 3 ngày nếu lỗi nhà sản xuất,
            miễn phí giao hàng và lắp đặt nội thành cho đơn từ 10.000.000đ, Hotline 24/7: 0974.933.486, Zalo: https://zalo.me/0974933486.
            Tuyệt đối không bịa giá, mã giảm giá hay tình trạng đơn hàng cụ thể; nếu không chắc hãy hướng khách xem trên website
            hoặc đề nghị gặp nhân viên CSKH. Từ chối lịch sự các câu hỏi ngoài phạm vi.
            """;

    /** Model dự phòng khi model chính quá tải (503) hoặc timeout. */
    private static final List<String> FALLBACK_MODELS = List.of("gemini-3.8-flash");

    private final ChatModel chatModel;

    @Value("${gemini.api.key:}")
    private String apiKey;

    @Value("${gemini.api.model:gemini-3.5-flash-lite}")
    private String model;

    public GeminiClient(ObjectProvider<ChatModel> chatModelProvider) {
        this.chatModel = chatModelProvider.getIfAvailable();
    }

    public boolean isEnabled() {
        return chatModel != null && apiKey != null && !apiKey.isBlank();
    }

    /**
     * @param history các tin nhắn trước đó (đã gồm tin hiện tại của khách ở cuối), theo thứ tự thời gian
     */
    public Optional<String> generate(List<ChatbotMessage> history) {
        return generate(history, "");
    }

    /**
     * @param catalogContext danh sách sản phẩm thật (từ database) mà AI được phép gợi ý; rỗng nếu không có
     */
    public Optional<String> generate(List<ChatbotMessage> history, String catalogContext) {
        if (!isEnabled() || history.isEmpty()) {
            return Optional.empty();
        }

        List<Message> messages = buildMessages(history, catalogContext);
        if (messages.size() <= 1) {
            return Optional.empty();
        }

        String primary = (model == null || model.isBlank()) ? "gemini-3.5-flash-lite" : model.trim();
        List<String> candidates = new ArrayList<>();
        candidates.add(primary);
        for (String fb : FALLBACK_MODELS) {
            if (!candidates.contains(fb)) candidates.add(fb);
        }

        for (String m : candidates) {
            try {
                Prompt prompt = new Prompt(messages, GoogleGenAiChatOptions.builder()
                        .model(m)
                        .temperature(0.6)
                        .maxOutputTokens(2048)
                        .build());
                long timeoutSec = m.equals(primary) ? 10 : 15;
                ChatResponse res = CompletableFuture.supplyAsync(() -> chatModel.call(prompt))
                        .get(timeoutSec, TimeUnit.SECONDS);
                String text = res.getResult() != null ? res.getResult().getOutput().getText() : null;
                if (text != null && !text.isBlank()) {
                    return Optional.of(text.trim());
                }
            } catch (InterruptedException ie) {
                Thread.currentThread().interrupt();
                return Optional.empty();
            } catch (Exception ex) {
                log.warn("Spring AI Gemini [{}] thất bại, thử model dự phòng: {}", m, ex.toString());
            }
        }
        return Optional.empty();
    }

    /** System prompt + lịch sử hội thoại; gộp các lượt liên tiếp cùng vai trò và bắt đầu bằng lượt của khách. */
    private List<Message> buildMessages(List<ChatbotMessage> history, String catalogContext) {
        List<String> roles = new ArrayList<>();
        List<StringBuilder> texts = new ArrayList<>();
        for (ChatbotMessage m : history) {
            String type = m.getSenderType();
            boolean isUser = "USER".equalsIgnoreCase(type);
            boolean isBot = "BOT".equalsIgnoreCase(type) || "AGENT".equalsIgnoreCase(type);
            if (!isUser && !isBot) continue;
            String role = isUser ? "user" : "model";
            int last = roles.size() - 1;
            if (last >= 0 && roles.get(last).equals(role)) {
                texts.get(last).append('\n').append(m.getMessageText());
            } else {
                roles.add(role);
                texts.add(new StringBuilder(m.getMessageText()));
            }
        }
        List<Message> out = new ArrayList<>();
        String systemPrompt = SYSTEM_PROMPT;
        if (catalogContext != null && !catalogContext.isBlank()) {
            systemPrompt += """

                    DANH SÁCH SẢN PHẨM THẬT ĐANG BÁN (nguồn: database của Nhà Xinh):
                    """ + catalogContext + """

                    QUY TẮC GỢI Ý SẢN PHẨM TRỌNG TÂM & HIỂN THỊ THẺ SẢN PHẨM:
                    1. Khi khách mới hỏi chung chung (VD: "tư vấn sofa") mà chưa rõ diện tích phòng, chất liệu/màu sắc hoặc phong cách, hãy hỏi ngắn gọn 1-2 câu để nắm nhu cầu.
                    2. Ngay khi khách đã chia sẻ nhu cầu (diện tích phòng, màu sắc, chất liệu, phong cách...) HOẶC yêu cầu gợi ý mẫu cụ thể:
                       - Chọn ra 2 đến 3 sản phẩm PHÙ HỢP NHẤT từ danh sách trên.
                       - Với mỗi sản phẩm gợi ý, giải thích ngắn gọn 1 câu vì sao hợp với không gian của khách, sau đó BẮT BUỘC chèn nguyên vẹn chuỗi `[[PRODUCT|...]]` (Thẻ nhúng) của sản phẩm đó trên một dòng riêng để giao diện hiển thị ảnh, giá bán và nút xem chi tiết sản phẩm.
                       - Tuyệt đối giữ nguyên cú pháp `[[PRODUCT|Tên|Giá|Ảnh|Link]]` từ danh sách, không tự sửa đổi đường dẫn ảnh hay link.
                       - Không bịa tên sản phẩm, giá bán hay đường dẫn ngoài danh sách.
                    """;
        }
        out.add(new SystemMessage(systemPrompt));
        boolean started = false;
        for (int i = 0; i < roles.size(); i++) {
            boolean user = "user".equals(roles.get(i));
            if (!started && !user) continue;
            started = true;
            out.add(user ? new UserMessage(texts.get(i).toString()) : new AssistantMessage(texts.get(i).toString()));
        }
        return out;
    }
}
