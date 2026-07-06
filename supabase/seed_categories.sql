-- Run once in the Supabase SQL editor to seed the five shop categories.
-- Safe to re-run: skips any slug that already exists.
insert into categories (slug, name, tagline, sort_order)
values
  ('white-dhoti',  'White Dhoti',  'Pure combed cotton, temple-ready', 1),
  ('colour-dhoti', 'Colour Dhoti', 'Zari-bordered, festival hues', 2),
  ('towels',       'Towels',       'Soft, absorbent, handloom-woven', 3),
  ('scarfs',       'Scarfs',       'Featherweight everyday elegance', 4),
  ('jute-bags',    'Jute Bags',    'Sustainable, sturdy, reusable', 5)
on conflict (slug) do nothing;
