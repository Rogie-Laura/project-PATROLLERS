-- Smart Locator: hierarchical plot categories (group + subcategory)

alter table public.smart_locator_points
  add column if not exists subcategory text not null default 'other';

alter table public.smart_locator_points
  drop constraint if exists smart_locator_points_category_check;
