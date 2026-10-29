-- Run once against the existing MySQL schema before deploying guest checkout.
-- The Order entity allows a null user for guest orders after this change.
ALTER TABLE orders MODIFY COLUMN user_id BIGINT NULL;
