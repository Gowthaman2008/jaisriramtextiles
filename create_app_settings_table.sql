-- Create app_settings table for storing admin-configurable key-value settings
-- Run this in your Supabase SQL editor

CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed with current default shipping settings
INSERT INTO app_settings (key, value)
VALUES (
  'shipping_settings',
  '{"free_shipping_threshold_paise": 69900, "shipping_charge_paise": 9900}'::jsonb
)
ON CONFLICT (key) DO NOTHING;

-- Disable RLS — this table is only ever accessed via the service role client (admin API)
ALTER TABLE app_settings DISABLE ROW LEVEL SECURITY;
