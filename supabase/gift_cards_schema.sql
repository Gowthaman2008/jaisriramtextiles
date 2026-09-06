-- ============================================================================
-- GIFT CARDS & REVIEW REWARDS SCHEMA
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.gift_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) UNIQUE NOT NULL,
  amount_paise INT NOT NULL DEFAULT 10000,          -- ₹100 = 10000 paise
  status VARCHAR(20) NOT NULL DEFAULT 'active',     -- 'active', 'redeemed', 'expired', 'disabled'
  platform VARCHAR(50) DEFAULT 'amazon',            -- 'amazon', 'flipkart', 'google', 'meesho', 'myntra', 'direct', 'other'
  review_screenshot_url TEXT,
  order_reference VARCHAR(100),
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  redeemed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  redeemed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  notes TEXT,
  is_one_time BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast lookup by code and user
CREATE INDEX IF NOT EXISTS idx_gift_cards_code ON public.gift_cards (code);
CREATE INDEX IF NOT EXISTS idx_gift_cards_status ON public.gift_cards (status);
CREATE INDEX IF NOT EXISTS idx_gift_cards_user_id ON public.gift_cards (user_id);
CREATE INDEX IF NOT EXISTS idx_gift_cards_redeemed_by ON public.gift_cards (redeemed_by);

-- Enable RLS
ALTER TABLE public.gift_cards ENABLE ROW LEVEL SECURITY;

-- Policies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'gift_cards' AND policyname = 'Admins can manage gift cards'
  ) THEN
    CREATE POLICY "Admins can manage gift cards" ON public.gift_cards
      FOR ALL
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles
          WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'staff')
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'gift_cards' AND policyname = 'Users can view their claimed gift cards'
  ) THEN
    CREATE POLICY "Users can view their claimed gift cards" ON public.gift_cards
      FOR SELECT
      USING (
        auth.uid() = user_id OR auth.uid() = created_by OR auth.uid() = redeemed_by
      );
  END IF;
END $$;
