-- Manually-entered product reviews per company.
ALTER TABLE companies ADD COLUMN product_likes TEXT;
ALTER TABLE companies ADD COLUMN product_dislikes TEXT;
