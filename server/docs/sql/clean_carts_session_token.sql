-- ==============================================================================
-- Migration script: Dọn dẹp session_token cho các giỏ hàng cũ đã checkout / không còn ACTIVE.
-- Mục đích: Nhả session_token cho khách mua sắm lần 2, tránh lỗi vi phạm ràng buộc
--           uq_carts_session_token khi thêm sản phẩm mới.
-- ==============================================================================

-- 1. Đảm bảo cột session_token cho phép NULL (MySQL cho phép nhiều giá trị NULL trong Unique Index)
ALTER TABLE carts MODIFY COLUMN session_token VARCHAR(128) NULL;

-- 2. Dọn sạch session_token trên các bản ghi giỏ hàng không còn ACTIVE
UPDATE carts SET session_token = NULL WHERE status <> 'ACTIVE';

-- 3. Kiểm tra kết quả (Không còn dòng nào status <> 'ACTIVE' mà giữ session_token)
-- SELECT id, user_id, session_token, status, updated_at FROM carts WHERE status <> 'ACTIVE' AND session_token IS NOT NULL;

