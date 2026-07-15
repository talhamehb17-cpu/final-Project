-- Add promo_code and discount_percentage columns to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS promo_code VARCHAR(50);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount_percentage DECIMAL(5, 2);

-- Add comments to document the new columns
COMMENT ON COLUMN orders.promo_code IS 'The promo code applied to this order, if any';
COMMENT ON COLUMN orders.discount_percentage IS 'The discount percentage applied (e.g., 10.00 for 10%)';
