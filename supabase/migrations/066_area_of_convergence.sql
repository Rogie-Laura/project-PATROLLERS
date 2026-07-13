-- Dedicated table for Smart Locator Area of Convergence
CREATE TABLE IF NOT EXISTS public.area_of_convergence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL,
  type_key text NOT NULL,
  unit text NOT NULL DEFAULT '',
  office text NOT NULL DEFAULT '',
  address_location text NOT NULL DEFAULT '',
  estimated_crowd text NOT NULL DEFAULT '',
  personnel jsonb NOT NULL DEFAULT '[]'::jsonb,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  created_by uuid REFERENCES public."user"(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT area_of_convergence_lat_check CHECK (latitude >= -90 AND latitude <= 90),
  CONSTRAINT area_of_convergence_lng_check CHECK (longitude >= -180 AND longitude <= 180),
  CONSTRAINT area_of_convergence_type_key_check CHECK (
    type_key IN (
      'public_park',
      'freedom_park',
      'cemetery',
      'memorial_park',
      'town_plaza'
    )
  )
);

CREATE INDEX IF NOT EXISTS area_of_convergence_office_unit_idx
  ON public.area_of_convergence (office, unit);
CREATE INDEX IF NOT EXISTS area_of_convergence_type_key_idx
  ON public.area_of_convergence (type_key);
ALTER TABLE public.area_of_convergence ENABLE ROW LEVEL SECURITY;
