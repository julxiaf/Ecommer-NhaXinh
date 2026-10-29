package vn.nhaxinh.chatbot;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ChatbotMessageRepository extends JpaRepository<ChatbotMessage, Long> {

    List<ChatbotMessage> findByConversationIdOrderByCreatedAtAsc(Long conversationId);

    ChatbotMessage findTopByConversationIdOrderByCreatedAtDesc(Long conversationId);
}
