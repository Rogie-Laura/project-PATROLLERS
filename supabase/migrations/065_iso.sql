-- Dedicated table for Smart Locator ISO markers
CREATE TABLE IF NOT EXISTS public.iso (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL,
  type_key text NOT NULL,
  unit text NOT NULL DEFAULT '',
  office text NOT NULL DEFAULT '',
  address_location text NOT NULL DEFAULT '',
  remarks text,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  created_by uuid REFERENCES public."user"(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT iso_lat_check CHECK (latitude >= -90 AND latitude <= 90),
  CONSTRAINT iso_lng_check CHECK (longitude >= -180 AND longitude <= 180),
  CONSTRAINT iso_type_key_check CHECK (
    type_key IN ('white_area', 'red_area', 'gidas')
  )
);

CREATE INDEX IF NOT EXISTS iso_office_unit_idx ON public.iso (office, unit);
CREATE INDEX IF NOT EXISTS iso_type_key_idx ON public.iso (type_key);
ALTER TABLE public.iso ENABLE ROW LEVEL SECURITY;
