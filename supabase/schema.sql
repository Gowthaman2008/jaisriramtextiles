-- ============================================================================
-- JAI SRI RAM TEXTILES — Database schema (PostgreSQL / Supabase)
-- Run in the Supabase SQL editor. Enable RLS on every table (policies.sql).
-- Money is stored as INTEGER paise (₹1 = 100) to avoid float rounding errors.
-- ============================================================================

create extension if not exists "pgcrypto";

-- ---------- Enums ----------
create type user_role        as enum ('customer', 'staff', 'admin');
create type order_status     as enum ('pending', 'confirmed', 'packed', 'shipped', 'out_for_delivery', 'delivered', 'returned', 'rejected');
create type payment_status   as enum ('created', 'paid', 'failed', 'refunded');
create type coupon_type      as enum ('percent', 'flat');
create type wallet_txn_type  as enum ('cashback_credit', 'redeem', 'expiry', 'admin_adjust');
create type review_status    as enum ('pending', 'approved', 'rejected');
create type auth_provider     as enum ('email', 'google');

-- Helper function to generate a random unique 8-digit numeric ID (no leading zeroes)
create or replace function generate_unique_user_id()
returns text as $$
declare
  new_id text;
  is_unique boolean;
  chars text := '0123456789';
  first_chars text := '123456789';
  i integer;
begin
  loop
    -- First digit from 1-9
    new_id := substr(first_chars, floor(random() * 9 + 1)::integer, 1);
    
    -- Next 7 digits from 0-9
    for i in 2..8 loop
      new_id := new_id || substr(chars, floor(random() * 10 + 1)::integer, 1);
    end loop;
    
    select not exists (
      select 1 from public.profiles where user_id = new_id
    ) into is_unique;
    
    exit when is_unique;
  end loop;
  return new_id;
end;
$$ language plpgsql;

create table profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  user_id       text unique default generate_unique_user_id(),
  full_name     text,
  email         text not null,
  avatar_url    text,
  phone         text,
  role          user_role not null default 'customer',
  provider      auth_provider not null default 'email',
  welcome_email_sent boolean not null default false,
  created_at    timestamptz not null default now()
);

-- Auto-create a profile row when a new auth user signs up.
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url, provider, phone)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url',
    coalesce((new.raw_app_meta_data->>'provider')::auth_provider, 'email'),
    new.raw_user_meta_data->>'phone'
  );
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Prevent users from modifying critical profile fields (role, user_id, id) to elevate privileges.
create or replace function public.check_profile_update()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  -- If auth.uid() is null, the action is run via the service_role client (trusted server code), so allow it.
  if auth.uid() is null then
    return new;
  end if;

  -- Block changing the role unless the executing user is already an admin.
  if new.role <> old.role then
    if not exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    ) then
      raise exception 'Unauthorized: You cannot modify the profile role field.';
    end if;
  end if;

  -- Block changing unique generated user_id
  if new.user_id <> old.user_id then
    raise exception 'Unauthorized: Cannot modify user_id field.';
  end if;

  -- Block changing id
  if new.id <> old.id then
    raise exception 'Unauthorized: Cannot modify id field.';
  end if;

  return new;
end;
$$;

create trigger trg_check_profile_update
  before update on public.profiles
  for each row execute function public.check_profile_update();


create table addresses (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references profiles(id) on delete cascade,
  label        text,                    -- Home / Office
  recipient    text not null,
  line1        text not null,
  line2        text,
  city         text not null,
  district     text,
  state        text not null,
  pincode      text not null,
  phone        text,
  alternate_phone text,
  is_default   boolean not null default false,
  created_at   timestamptz not null default now()
);

-- ============================================================================
-- CATALOGUE
-- ============================================================================
create table categories (
  id          uuid primary key default gen_random_uuid(),
  slug        text unique not null,
  name        text not null,
  tagline     text,
  image_url   text,
  sort_order  int not null default 0,
  is_active   boolean not null default true
);

create table products (
  id                uuid primary key default gen_random_uuid(),
  slug              text unique not null,
  name              text not null,
  description       text,
  category_id       uuid references categories(id) on delete set null,
  price_paise       int  not null check (price_paise >= 0),
  compare_at_paise  int  check (compare_at_paise >= 0),
  cashback_paise    int  not null default 0 check (cashback_paise >= 0), -- admin-configurable
  stock             int  not null default 0 check (stock >= 0),
  is_active         boolean not null default true,
  is_on_sale        boolean not null default false,
  show_size         boolean not null default false,
  is_featured       boolean not null default false,
  is_bestseller     boolean not null default false,
  is_new            boolean not null default false,
  is_trending       boolean not null default false,
  pieces_per_pack   int  not null default 1 check (pieces_per_pack >= 1),
  -- denormalised rating cache, maintained by trigger from reviews
  rating_avg        numeric(2,1) not null default 0,
  rating_count      int not null default 0,
  created_at        timestamptz not null default now()
);

create table product_images (
  id          uuid primary key default gen_random_uuid(),
  product_id  uuid not null references products(id) on delete cascade,
  url         text not null,             -- Cloudinary secure_url
  alt         text,
  sort_order  int not null default 0
);

create table product_variants (
  id          uuid primary key default gen_random_uuid(),
  product_id  uuid not null references products(id) on delete cascade,
  size        text,
  color       text,
  sku         text unique,
  stock       int not null default 0
);

-- ============================================================================
-- COUPONS
-- ============================================================================
create table coupons (
  id                 uuid primary key default gen_random_uuid(),
  code               text unique not null,
  type               coupon_type not null,
  value              int not null,        -- percent (e.g. 10) or flat paise
  min_order_paise    int not null default 0,
  max_discount_paise int,                 -- cap for percent coupons
  first_order_only   boolean not null default false, -- e.g. WELCOME10
  usage_limit        int,                 -- null = unlimited
  used_count         int not null default 0,
  starts_at          timestamptz,
  expires_at         timestamptz,
  is_active          boolean not null default true
);

-- Seed the first-order welcome coupon
insert into coupons (code, type, value, first_order_only)
values ('WELCOME10', 'percent', 10, true);

-- ============================================================================
-- ORDERS
-- ============================================================================
create table orders (
  id                  uuid primary key default gen_random_uuid(),
  order_number        text unique not null,      -- human-friendly, e.g. JSRT-2026-000123
  tracking_id         text unique,               -- courier tracking number
  courier_tracking_url text,                     -- admin-configurable base URL for "Copy Tracking ID"
  user_id             uuid not null references profiles(id) on delete restrict,
  status              order_status not null default 'pending',
  payment_status      payment_status not null default 'created',

  subtotal_paise      int not null,
  discount_paise      int not null default 0,
  shipping_paise      int not null default 0,     -- 9900, or 0 when subtotal > 69900
  wallet_used_paise   int not null default 0,     -- capped at 20% of order value (enforced server-side)
  tax_paise           int not null default 0,
  total_paise         int not null,
  cashback_earned_paise int not null default 0,   -- credited only after delivery

  coupon_id           uuid references coupons(id),
  shipping_address    jsonb not null,             -- snapshot at purchase time

  razorpay_order_id   text,
  razorpay_payment_id text,

  placed_at           timestamptz not null default now(),
  delivered_at        timestamptz,
  rejection_reason    text,                        -- shown to the customer when status = 'rejected'
  -- Users cannot cancel orders (business rule): no cancel status/path exposed.
  constraint wallet_within_cap check (wallet_used_paise <= (subtotal_paise / 5))
);

create table order_items (
  id             uuid primary key default gen_random_uuid(),
  order_id       uuid not null references orders(id) on delete cascade,
  product_id     uuid references products(id) on delete set null,
  name           text not null,          -- snapshot
  variant        text,
  sku            text,                   -- snapshot
  size           text,                   -- snapshot
  color          text,                   -- snapshot
  image_url      text,                   -- snapshot
  unit_price_paise int not null,
  quantity       int not null check (quantity > 0),
  cashback_paise int not null default 0
);

create table order_events (                 -- tracking timeline
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid not null references orders(id) on delete cascade,
  status      order_status not null,
  note        text,
  created_at  timestamptz not null default now()
);

-- ============================================================================
-- WALLET & CASHBACK
-- ============================================================================
create table wallets (
  user_id       uuid primary key references profiles(id) on delete cascade,
  balance_paise int not null default 0 check (balance_paise >= 0),
  updated_at    timestamptz not null default now()
);

create table wallet_transactions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references profiles(id) on delete cascade,
  type          wallet_txn_type not null,
  amount_paise  int not null,             -- +credit / -debit
  order_id      uuid references orders(id),
  note          text,
  expires_at    timestamptz,              -- cashback expiry support
  created_at    timestamptz not null default now()
);

-- Credit cashback into the wallet when an order is marked delivered.
create or replace function credit_cashback_on_delivery()
returns trigger language plpgsql as $$
begin
  if new.status = 'delivered' and old.status <> 'delivered'
     and new.cashback_earned_paise > 0 then
     
    -- Only credit if no cashback_credit transaction already exists for this order
    if not exists (
      select 1 from public.wallet_transactions 
      where order_id = new.id and type = 'cashback_credit'
    ) then
      insert into wallet_transactions (user_id, type, amount_paise, order_id, note, expires_at)
      values (new.user_id, 'cashback_credit', new.cashback_earned_paise, new.id,
              'Cashback for order ' || new.order_number, now() + interval '15 days');

      insert into wallets (user_id, balance_paise)
      values (new.user_id, new.cashback_earned_paise)
      on conflict (user_id)
      do update set balance_paise = wallets.balance_paise + excluded.balance_paise,
                    updated_at = now();
    end if;

    new.delivered_at := now();
  end if;
  return new;
end $$;

create trigger trg_cashback_on_delivery
  before update on orders
  for each row execute function credit_cashback_on_delivery();

-- ============================================================================
-- REVIEWS  (only verified purchasers, only after delivery)
-- ============================================================================
create table reviews (
  id            uuid primary key default gen_random_uuid(),
  product_id    uuid not null references products(id) on delete cascade,
  user_id       uuid not null references profiles(id) on delete cascade,
  order_id      uuid not null references orders(id),   -- proves purchase
  rating        int not null check (rating between 1 and 5),
  title         text,
  body          text,
  status        review_status not null default 'pending',
  is_featured   boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (user_id, product_id, order_id)
);

create table review_photos (
  id          uuid primary key default gen_random_uuid(),
  review_id   uuid not null references reviews(id) on delete cascade,
  url         text not null                          -- Cloudinary
);

-- Guard: the referenced order must belong to the user AND be delivered.
create or replace function enforce_verified_review()
returns trigger language plpgsql as $$
begin
  if not exists (
    select 1 from orders o
    where o.id = new.order_id and o.user_id = new.user_id and o.status = 'delivered'
  ) then
    raise exception 'Reviews are allowed only after your order is delivered';
  end if;
  return new;
end $$;

create trigger trg_verified_review
  before insert on reviews
  for each row execute function enforce_verified_review();

-- Recompute product rating cache when approved reviews change.
create or replace function refresh_product_rating()
returns trigger language plpgsql as $$
declare pid uuid := coalesce(new.product_id, old.product_id);
begin
  update products p set
    rating_avg = coalesce((select round(avg(rating)::numeric, 1) from reviews where product_id = pid and status = 'approved'), 0),
    rating_count = (select count(*) from reviews where product_id = pid and status = 'approved')
  where p.id = pid;
  return null;
end $$;

create trigger trg_refresh_rating
  after insert or update or delete on reviews
  for each row execute function refresh_product_rating();

-- ============================================================================
-- BULK ORDER ENQUIRIES
-- ============================================================================
create table bulk_inquiries (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  email        text not null,
  organisation text,
  category     text,          -- temple / hotel / retailer / corporate / wedding
  quantity     text,
  message      text,
  status       text not null default 'new',
  created_at   timestamptz not null default now()
);

-- ============================================================================
-- SUPPORT & CONTACT MESSAGES
-- ============================================================================
create table support_messages (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references public.profiles(id) on delete set null,
  name        text not null,
  email       text not null,
  subject     text not null,
  message     text not null,
  status      text not null default 'new',
  reply_message text,
  replied_at  timestamptz,
  created_at  timestamptz not null default now()
);

create table support_message_replies (
  id          uuid primary key default gen_random_uuid(),
  message_id  uuid references public.support_messages(id) on delete cascade,
  sender_type text not null check (sender_type in ('user', 'admin')),
  message     text not null,
  created_at  timestamptz not null default now()
);

-- Canned replies admins can pick from when responding to support tickets
create table canned_responses (
  id          uuid primary key default gen_random_uuid(),
  message     text not null,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now()
);

-- Presaved courier partners (name + tracking page URL) admins can pick from
-- when marking an order shipped
create table courier_presets (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  tracking_url  text not null,
  sort_order    int not null default 0,
  created_at    timestamptz not null default now()
);

-- ============================================================================
-- NEWSLETTER SUBSCRIPTIONS
-- ============================================================================
create table newsletter_subscriptions (
  id          uuid primary key default gen_random_uuid(),
  email       text unique not null,
  created_at  timestamptz not null default now()
);

-- ============================================================================
-- CMS: carousel / banners / popups (admin-managed homepage)
-- ============================================================================
create table carousel_slides (
  id          uuid primary key default gen_random_uuid(),
  eyebrow     text, title text not null, subtitle text,
  cta_label   text, cta_href text, image_url text,
  sort_order  int not null default 0, is_active boolean not null default true
);

create table banners (
  id          uuid primary key default gen_random_uuid(),
  placement   text not null,     -- 'announcement' | 'cashback' | 'bulk'
  content     jsonb not null,
  is_active   boolean not null default true
);

-- ============================================================================
-- ANALYTICS (visitor + session)
-- ============================================================================
create table sessions (
  id            uuid primary key default gen_random_uuid(),
  visitor_id    text not null,        -- anon cookie id
  user_id       uuid references profiles(id) on delete set null,
  device        text, browser text, os text, country text, referrer text,
  started_at    timestamptz not null default now(),
  last_seen_at  timestamptz not null default now(),
  page_views    int not null default 1
);

create table page_views (
  id          uuid primary key default gen_random_uuid(),
  session_id  uuid references sessions(id) on delete cascade,
  path        text not null,
  created_at  timestamptz not null default now()
);

-- ============================================================================
-- AUDIT LOG (admin actions)
-- ============================================================================
create table audit_logs (
  id          uuid primary key default gen_random_uuid(),
  actor_id    uuid references profiles(id),
  action      text not null,        -- 'product.update', 'coupon.create', ...
  entity      text, entity_id text,
  meta        jsonb,
  created_at  timestamptz not null default now()
);

-- Helpful indexes
create index idx_products_category on products(category_id);
create index idx_orders_user on orders(user_id);
create index idx_orders_status on orders(status);
create index idx_reviews_product on reviews(product_id, status);
create index idx_wallet_txn_user on wallet_transactions(user_id);
create index idx_sessions_visitor on sessions(visitor_id);

-- ============================================================================
-- STORAGE STATS RPC HELPER
-- ============================================================================
create or replace function get_supabase_storage_stats()
returns json security definer as $$
declare
  db_size bigint;
  storage_size bigint;
begin
  -- Database size in bytes
  db_size := pg_database_size(current_database());
  
  -- Storage objects size in bytes
  begin
    select coalesce(sum(size), 0)
    into storage_size
    from storage.objects;
  exception when others then
    begin
      select coalesce(sum((metadata->>'size')::bigint), 0)
      into storage_size
      from storage.objects;
    exception when others then
      storage_size := 0;
    end;
  end;

  return json_build_object(
    'db_size_bytes', db_size,
    'storage_size_bytes', storage_size
  );
end;
$$ language plpgsql;
