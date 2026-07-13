-- Name fields for Friendly Forces and Area of Convergence markers
ALTER TABLE public.friendly_forces
  ADD COLUMN IF NOT EXISTS office_camp_name text NOT NULL DEFAULT '';

ALTER TABLE public.area_of_convergence
  ADD COLUMN IF NOT EXISTS place_name text NOT NULL DEFAULT '';
