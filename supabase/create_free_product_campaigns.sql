-- Create free_product_campaigns table for storing free product campaign details
CREATE TABLE IF NOT EXISTS free_product_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  variant_id uuid REFERENCES product_variants(id) ON DELETE CASCADE,
  target_amount_paise integer NOT NULL CHECK (target_amount_paise >= 0),
  starts_at timestamptz,
  expires_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  enable_announcement boolean NOT NULL DEFAULT true,
  custom_announcement_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Disable Row Level Security since it's fully managed via service role (admin API)
ALTER TABLE free_product_campaigns DISABLE ROW LEVEL SECURITY;
