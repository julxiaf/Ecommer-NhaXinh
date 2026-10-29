package vn.nhaxinh.chatbot;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

@Repository
public interface ChatbotConversationRepository extends JpaRepository<ChatbotConversation, Long> {

    List<ChatbotConversation> findByUserIdOrderByCreatedAtDesc(Long userId);

    @Query("SELECT c FROM ChatbotConversation c LEFT JOIN FETCH c.user ORDER BY c.updatedAt DESC")
    List<ChatbotConversation> findAllWithUserOrderByUpdatedAtDesc();

    List<ChatbotConversation> findByModeOrderByUpdatedAtDesc(String mode);
}
