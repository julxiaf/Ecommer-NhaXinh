package vn.nhaxinh.chatbot;

import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import vn.nhaxinh.controller.BaseController;
import vn.nhaxinh.user.User;
import vn.nhaxinh.user.UserRepository;

@RestController
@RequestMapping(BaseController.API_V1 + "/chatbot")
public class ChatbotController extends BaseController {

    private final ChatbotService chatbotService;
    private final UserRepository userRepository;
    private final DateTimeFormatter formatter = DateTimeFormatter.ofPattern("HH:mm dd/MM/yyyy");

    public ChatbotController(ChatbotService chatbotService, UserRepository userRepository) {
        this.chatbotService = chatbotService;
        this.userRepository = userRepository;
    }

    public record SendMessageRequest(
            Long conversationId,
            String messageText,
            String mode
    ) {}

    public record SwitchModeRequest(
            Long conversationId,
            String mode
    ) {}

    public record MessageDto(
            Long id,
            String senderType,
            String messageText,
            String createdAt,
            Boolean isOverridden
    ) {
        public static MessageDto of(ChatbotMessage m, DateTimeFormatter formatter) {
            String time = m.getCreatedAt() != null ? m.getCreatedAt().format(formatter) : "";
            boolean overridden = m.getMetadata() != null && m.getMetadata().contains("\"overridden\":true");
            return new MessageDto(m.getId(), m.getSenderType(), m.getMessageText(), time, overridden);
        }
    }

    public record ChatResponse(
            Long conversationId,
            String mode,
            MessageDto latestReply,
            List<MessageDto> messages
    ) {}

    @PostMapping("/message")
    public ResponseEntity<ChatResponse> sendMessage(
            @RequestBody SendMessageRequest request,
            @AuthenticationPrincipal UserDetails principal
    ) {
        if (request.messageText() == null || request.messageText().trim().isEmpty()) {
            return ResponseEntity.badRequest().build();
        }

        User user = null;
        if (principal != null) {
            user = userRepository.findByUsername(principal.getUsername()).orElse(null);
        }

        ChatbotConversation conversation = chatbotService.getOrCreateConversation(request.conversationId(), user);
        ChatbotMessage reply = chatbotService.processUserMessage(conversation, request.messageText(), request.mode());

        List<ChatbotMessage> allMessages = chatbotService.getMessages(conversation.getId());
        List<MessageDto> messageDtos = allMessages.stream()
                .map(m -> MessageDto.of(m, formatter))
                .toList();

        return ResponseEntity.ok(new ChatResponse(
                conversation.getId(),
                conversation.getMode(),
                MessageDto.of(reply, formatter),
                messageDtos
        ));
    }

    @GetMapping("/conversations/{id}/messages")
    public ResponseEntity<List<MessageDto>> getMessages(@PathVariable Long id) {
        chatbotService.checkAndHandleAgentTimeout(id);
        ChatbotConversation conv = chatbotService.getConversation(id).orElse(null);
        String currentMode = (conv != null && conv.getMode() != null) ? conv.getMode() : "BOT";

        List<ChatbotMessage> messages = chatbotService.getMessages(id);
        List<MessageDto> dtos = messages.stream()
                .map(m -> MessageDto.of(m, formatter))
                .toList();
        return ResponseEntity.ok()
                .header("X-Conversation-Mode", currentMode)
                .body(dtos);
    }

    @PostMapping("/switch-mode")
    public ResponseEntity<Map<String, Object>> switchMode(@RequestBody SwitchModeRequest request) {
        if (request.conversationId() == null || request.mode() == null) {
            return ResponseEntity.badRequest().build();
        }
        ChatbotConversation conv = chatbotService.switchMode(request.conversationId(), request.mode());
        return ResponseEntity.ok(Map.of(
                "conversationId", conv.getId(),
                "mode", conv.getMode(),
                "message", "AGENT".equalsIgnoreCase(conv.getMode())
                        ? "Đã chuyển sang chế độ Chuyên viên tư vấn CSKH trực tiếp."
                        : "Đã chuyển sang chế độ Trợ lý ảo AI Nhà Xinh."
        ));
    }

    public record AdminConversationDto(
            Long id,
            String title,
            String customerName,
            String customerPhone,
            String customerEmail,
            String mode,
            String status,
            String lastMessage,
            String lastSender,
            String updatedAt
    ) {}

    public record AdminReplyRequest(
            String messageText
    ) {}

    @GetMapping("/admin/conversations")
    @Transactional
    public ResponseEntity<List<AdminConversationDto>> getAdminConversations() {
        List<ChatbotConversation> conversations = chatbotService.getAllConversations();
        for (ChatbotConversation c : conversations) {
            if ("AGENT".equalsIgnoreCase(c.getMode())) {
                chatbotService.checkAndHandleAgentTimeout(c.getId());
            }
        }
        List<AdminConversationDto> dtos = conversations.stream().map(c -> {
            ChatbotMessage lastMsg = chatbotService.getLastMessage(c.getId());
            String customerName = "Khách vãng lai #" + c.getId();
            String customerPhone = "";
            String customerEmail = "";

            if (c.getUser() != null) {
                try {
                    String fn = c.getUser().getFullName();
                    customerName = (fn != null && !fn.isBlank()) ? fn : c.getUser().getUsername();
                    customerPhone = c.getUser().getPhone() != null ? c.getUser().getPhone() : "";
                    customerEmail = c.getUser().getEmail() != null ? c.getUser().getEmail() : "";
                } catch (Exception ex) {
                    customerName = "Khách hàng #" + c.getId();
                }
            }

            String lastText = lastMsg != null ? lastMsg.getMessageText() : "Bắt đầu cuộc trò chuyện";
            String lastSender = lastMsg != null ? lastMsg.getSenderType() : "";
            String time = c.getUpdatedAt() != null ? c.getUpdatedAt().format(formatter) : "";

            return new AdminConversationDto(
                    c.getId(),
                    c.getTitle(),
                    customerName,
                    customerPhone,
                    customerEmail,
                    c.getMode(),
                    c.getStatus(),
                    lastText,
                    lastSender,
                    time
            );
        }).toList();
        return ResponseEntity.ok(dtos);
    }

    public record OverrideMessageRequest(
            String messageText
    ) {}

    @PutMapping("/admin/messages/{id}/override")
    public ResponseEntity<MessageDto> overrideMessage(
            @PathVariable Long id,
            @RequestBody OverrideMessageRequest request
    ) {
        if (request.messageText() == null || request.messageText().trim().isEmpty()) {
            return ResponseEntity.badRequest().build();
        }
        ChatbotMessage updated = chatbotService.overrideBotMessage(id, request.messageText().trim());
        return ResponseEntity.ok(MessageDto.of(updated, formatter));
    }

    @PostMapping("/admin/conversations/{id}/reply")
    public ResponseEntity<MessageDto> sendAdminReply(
            @PathVariable Long id,
            @RequestBody AdminReplyRequest request
    ) {
        if (request.messageText() == null || request.messageText().trim().isEmpty()) {
            return ResponseEntity.badRequest().build();
        }
        ChatbotMessage reply = chatbotService.adminReply(id, request.messageText().trim());
        return ResponseEntity.ok(MessageDto.of(reply, formatter));
    }

    @PostMapping("/admin/conversations/{id}/close")
    public ResponseEntity<Map<String, Object>> closeConversation(@PathVariable Long id) {
        ChatbotConversation conv = chatbotService.closeConversation(id);
        return ResponseEntity.ok(Map.of(
                "conversationId", conv.getId(),
                "status", conv.getStatus()
        ));
    }
}

