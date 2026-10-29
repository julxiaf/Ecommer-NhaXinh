-- Thêm cột kiểm tra trạng thái hàng có sẵn, hàng đặt trước (pre-order) hoặc hết hàng
ALTER TABLE `products`
  ADD COLUMN `is_preorder` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '1: Yêu cầu đặt trước, 0: Bình thường' AFTER `status`,
  ADD COLUMN `stock_status` VARCHAR(30) NOT NULL DEFAULT 'IN_STOCK' COMMENT 'IN_STOCK, PRE_ORDER, OUT_OF_STOCK' AFTER `is_preorder`;

-- Cập nhật một số sản phẩm ví dụ làm hàng đặt trước (Pre-order) nếu hết kho
UPDATE `products` SET `is_preorder` = 1, `stock_status` = 'PRE_ORDER' WHERE `id` IN (3, 7);

