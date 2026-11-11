package vn.nhaxinh.chatbot;

import java.math.BigDecimal;
import java.text.NumberFormat;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Component;
import vn.nhaxinh.catalog.ProductService;
import vn.nhaxinh.catalog.ProductSummary;

/**
 * Tìm sản phẩm thật trong database (gồm tên, ảnh đại diện, giá bán, link chi tiết)
 * theo nội dung khách đang hỏi để đưa vào prompt của AI.
 */
@Component
public class ChatbotProductContext {

    /** Từ khóa loại sản phẩm -> từ khóa tìm kiếm trong tên/mô tả sản phẩm. Thứ tự = độ ưu tiên khi trùng. */
    private static final String[][] TOPICS = {
            {"sofa", "sofa"},
            {"bàn ăn", "bàn ăn"},
            {"bàn trà", "bàn trà"},
            {"bàn làm việc", "bàn làm việc"},
            {"bàn", "bàn"},
            {"giường", "giường"},
            {"tủ", "tủ"},
            {"kệ", "kệ"},
            {"ghế", "ghế"},
            {"đèn", "đèn"},
            {"nệm", "nệm"},
    };

    private static final int MAX_PER_TOPIC = 12;
    private static final int MAX_TOPICS = 2;

    private final ProductService productService;

    public ChatbotProductContext(ProductService productService) {
        this.productService = productService;
    }

    /** Trả về đoạn văn bản liệt kê sản phẩm phù hợp (có ảnh, giá, link), hoặc chuỗi rỗng nếu không xác định được loại. */
    public String build(List<ChatbotMessage> history) {
        List<String> userTexts = new ArrayList<>();
        for (int i = history.size() - 1; i >= 0 && userTexts.size() < 6; i--) {
            ChatbotMessage m = history.get(i);
            if ("USER".equalsIgnoreCase(m.getSenderType()) && m.getMessageText() != null) {
                userTexts.add(m.getMessageText().toLowerCase(Locale.ROOT));
            }
        }

        Set<String> keywords = new LinkedHashSet<>();
        for (String text : userTexts) {
            for (String[] topic : TOPICS) {
                if (text.contains(topic[0])) {
                    keywords.add(topic[1]);
                    break;
                }
            }
            if (keywords.size() >= MAX_TOPICS) break;
        }

        NumberFormat vnd = NumberFormat.getInstance(Locale.forLanguageTag("vi-VN"));
        StringBuilder sb = new StringBuilder();

        List<ProductSummary> collected = new ArrayList<>();
        Set<Long> seenIds = new LinkedHashSet<>();

        for (String keyword : keywords) {
            try {
                List<ProductSummary> products = productService
                        .searchActiveSummaries(keyword, PageRequest.of(0, MAX_PER_TOPIC))
                        .getContent();
                for (ProductSummary p : products) {
                    if (p.id() != null && seenIds.add(p.id())) {
                        collected.add(p);
                    }
                }
            } catch (Exception ignored) {
            }
        }

        // Nếu khách hỏi chung chung mà chưa rõ từ khóa, hoặc tìm từ khóa không ra -> lấy danh sách sản phẩm đang bán nổi bật
        if (collected.isEmpty() && !userTexts.isEmpty()) {
            String latest = userTexts.get(0);
            if (latest.contains("mẫu") || latest.contains("sản phẩm") || latest.contains("tư vấn")
                    || latest.contains("gợi ý") || latest.contains("phòng khách") || latest.contains("phòng ngủ")
                    || latest.contains("phòng ăn") || latest.contains("hiện đại") || latest.contains("m²") || latest.contains("m2")) {
                try {
                    collected.addAll(productService.findActiveSummaries(PageRequest.of(0, MAX_PER_TOPIC)).getContent());
                } catch (Exception ignored) {
                }
            }
        }

        for (ProductSummary p : collected) {
            BigDecimal price = p.price() != null ? p.price() : p.minPrice();
            String priceStr = price != null ? vnd.format(price) + " ₫" : "Liên hệ";
            String img = p.image() != null && !p.image().isBlank()
                    ? p.image()
                    : (p.thumbnailUrl() != null && !p.thumbnailUrl().isBlank() ? p.thumbnailUrl() : "");
            String url = "/san-pham/" + p.slug();

            sb.append("- Tên: ").append(p.name())
                    .append(" | Giá: ").append(priceStr)
                    .append(" | Link: ").append(url)
                    .append(" | Ảnh: ").append(img.isEmpty() ? "none" : img)
                    .append(" | Thẻ nhúng: [[PRODUCT|").append(cleanPipe(p.name()))
                    .append("|").append(priceStr)
                    .append("|").append(img.isEmpty() ? "none" : img)
                    .append("|").append(url).append("]]");

            if (Boolean.FALSE.equals(p.inStock())) {
                sb.append(" | Trạng thái: Tạm hết hàng");
            }
            String desc = p.shortDescription();
            if (desc != null && !desc.isBlank()) {
                desc = desc.replaceAll("\\s+", " ").trim();
                sb.append(" | Mô tả: ").append(desc.length() > 160 ? desc.substring(0, 160) + "..." : desc);
            }
            sb.append('\n');
        }
        return sb.toString();
    }

    private static String cleanPipe(String s) {
        return s == null ? "" : s.replace("|", "-").replace("]", "").replace("[", "").trim();
    }
}
