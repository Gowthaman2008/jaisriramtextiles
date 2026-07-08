-- ============================================================================
-- Row-Level Security — run AFTER schema.sql.
-- Principle: catalogue is public-read; user data is owner-scoped; admin uses
-- the service-role key server-side (bypasses RLS) after verifying role.
-- ============================================================================

-- Helper: is the current user an admin/staff?
create or replace function is_staff()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and role in ('admin', 'staff')
  );
$$;

-- Enable RLS everywhere
alter table profiles            enable row level security;
alter table addresses           enable row level security;
alter table categories          enable row level security;
alter table products            enable row level security;
alter table product_images      enable row level security;
alter table product_variants    enable row level security;
alter table coupons             enable row level security;
alter table orders              enable row level security;
alter table order_items         enable row level security;
alter table order_events        enable row level security;
alter table wallets             enable row level security;
alter table wallet_transactions enable row level security;
alter table reviews             enable row level security;
alter table review_photos       enable row level security;
alter table bulk_inquiries      enable row level security;
alter table sessions            enable row level security;
alter table page_views          enable row level security;
alter table audit_logs          enable row level security;

-- ---- Public catalogue (read-only for everyone) ----
create policy "catalogue public read" on categories       for select using (is_active or is_staff());
create policy "products public read"  on products         for select using (is_active or is_staff());
create policy "images public read"    on product_images   for select using (true);
create policy "variants public read"  on product_variants for select using (true);

-- ---- Profiles ----
create policy "own profile read"   on profiles for select using (auth.uid() = id or is_staff());
create policy "own profile update" on profiles for update using (auth.uid() = id);

-- Prevent unauthorized role escalation and user_id modifications via the update policy.
create or replace function public.check_profile_update()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then
    return new;
  end if;

  if new.role <> old.role then
    if not exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    ) then
      raise exception 'Unauthorized: You cannot modify the profile role field.';
    end if;
  end if;

  if new.user_id <> old.user_id then
    raise exception 'Unauthorized: Cannot modify user_id field.';
  end if;

  if new.id <> old.id then
    raise exception 'Unauthorized: Cannot modify id field.';
  end if;

  return new;
end;
$$;

-- Drop trigger if exists to prevent duplicate trigger errors when re-applying policies
drop trigger if exists trg_check_profile_update on profiles;
create trigger trg_check_profile_update
  before update on public.profiles
  for each row execute function public.check_profile_update();


-- ---- Addresses ----
create policy "own addresses" on addresses
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---- Orders ----
create policy "own orders read" on orders
  for select using (auth.uid() = user_id or is_staff());
create policy "own order items read" on order_items
  for select using (exists (select 1 from orders o where o.id = order_id and (o.user_id = auth.uid() or is_staff())));
create policy "own order events read" on order_events
  for select using (exists (select 1 from orders o where o.id = order_id and (o.user_id = auth.uid() or is_staff())));
-- Order creation happens through a server route (service role) that validates
-- money math, wallet cap and coupon eligibility — no direct client INSERT.

-- ---- Wallet ----
create policy "own wallet read" on wallets
  for select using (auth.uid() = user_id or is_staff());
create policy "own wallet txns read" on wallet_transactions
  for select using (auth.uid() = user_id or is_staff());

-- ---- Reviews ----
create policy "approved reviews public read" on reviews
  for select using (status = 'approved' or auth.uid() = user_id or is_staff());
create policy "own review write" on reviews
  for insert with check (auth.uid() = user_id);
create policy "own review edit" on reviews
  for update using (auth.uid() = user_id);   -- app enforces the edit window
create policy "review photos read" on review_photos for select using (true);
create policy "own review photos write" on review_photos
  for insert with check (exists (select 1 from reviews r where r.id = review_id and r.user_id = auth.uid()));

-- ---- Bulk inquiries (anyone may submit) ----
create policy "bulk insert" on bulk_inquiries for insert with check (true);
create policy "bulk staff read" on bulk_inquiries for select using (is_staff());

-- ---- Analytics (write via server; staff read) ----
create policy "sessions staff read" on sessions   for select using (is_staff());
create policy "pageviews staff read" on page_views for select using (is_staff());

-- ---- Audit logs (staff read only) ----
create policy "audit staff read" on audit_logs for select using (is_staff());

-- Coupons: readable so the client can preview a code; writes are staff-only via server.
create policy "coupons read active" on coupons for select using (is_active or is_staff());

-- ---- Support Messages ----
alter table support_messages enable row level security;
create policy "support messages select own or staff" on support_messages
  for select using (auth.uid() = user_id or is_staff());
