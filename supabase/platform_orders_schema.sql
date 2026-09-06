-- ============================================================================
-- PLATFORM ORDERS (Amazon & Flipkart Verified Order IDs for Review Rewards)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.platform_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform VARCHAR(50) NOT NULL DEFAULT 'amazon',  -- 'amazon', 'flipkart'
  order_id VARCHAR(100) NOT NULL UNIQUE,           -- Unique platform order ID (e.g. 402-1234567-8901234)
  status VARCHAR(20) NOT NULL DEFAULT 'available',  -- 'available', 'claimed', 'disabled'
  claimed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  claimed_at TIMESTAMPTZ,
  gift_card_id UUID REFERENCES public.gift_cards(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for lightning fast lookups
CREATE INDEX IF NOT EXISTS idx_platform_orders_order_id ON public.platform_orders (order_id);
CREATE INDEX IF NOT EXISTS idx_platform_orders_platform ON public.platform_orders (platform);
CREATE INDEX IF NOT EXISTS idx_platform_orders_status ON public.platform_orders (status);
CREATE INDEX IF NOT EXISTS idx_platform_orders_claimed_by ON public.platform_orders (claimed_by);

-- Enable RLS
ALTER TABLE public.platform_orders ENABLE ROW LEVEL SECURITY;

-- Policies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'platform_orders' AND policyname = 'Admins can manage platform orders'
  ) THEN
    CREATE POLICY "Admins can manage platform orders" ON public.platform_orders
      FOR ALL
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles
          WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'staff')
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'platform_orders' AND policyname = 'Authenticated users can check order verification'
  ) THEN
    CREATE POLICY "Authenticated users can check order verification" ON public.platform_orders
      FOR SELECT
      USING (auth.uid() IS NOT NULL);
  END IF;
END $$;
