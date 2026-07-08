-- Alter order_items table to link free gifts with campaigns for 'once per user' enforcement
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS campaign_id uuid REFERENCES free_product_campaigns(id) ON DELETE SET NULL;

-- Reload schema cache
NOTIFY pgrst, 'reload schema';
