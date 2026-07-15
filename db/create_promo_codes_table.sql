-- Create promo_codes table
CREATE TABLE IF NOT EXISTS promo_codes (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    discount_percentage DECIMAL(5, 2) NOT NULL CHECK (discount_percentage > 0 AND discount_percentage <= 100),
    expiry_date TIMESTAMP NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(255) -- Admin email who created the code
);

-- Create index on code for faster lookups
CREATE INDEX IF NOT EXISTS idx_promo_codes_code ON promo_codes(code);

-- Create index on is_active and expiry_date for filtering active codes
CREATE INDEX IF NOT EXISTS idx_promo_codes_active_expiry ON promo_codes(is_active, expiry_date);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_promo_codes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER trigger_update_promo_codes_updated_at
    BEFORE UPDATE ON promo_codes
    FOR EACH ROW
    EXECUTE FUNCTION update_promo_codes_updated_at();

-- Insert sample promo codes for testing
INSERT INTO promo_codes (code, discount_percentage, expiry_date, is_active, created_by) VALUES
    ('WELCOME10', 10.00, CURRENT_TIMESTAMP + INTERVAL '30 days', true, 'admin@nighthowls.com'),
    ('SUMMER20', 20.00, CURRENT_TIMESTAMP + INTERVAL '60 days', true, 'admin@nighthowls.com'),
    ('FLASH15', 15.00, CURRENT_TIMESTAMP + INTERVAL '7 days', true, 'admin@nighthowls.com')
ON CONFLICT (code) DO NOTHING;
