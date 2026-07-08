-- Alter free_product_campaigns table to add display_name column
ALTER TABLE free_product_campaigns ADD COLUMN IF NOT EXISTS display_name TEXT;
