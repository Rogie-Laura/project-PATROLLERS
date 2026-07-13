-- Dedicated table for Smart Locator Friendly Forces / Friendly Units
CREATE TABLE IF NOT EXISTS public.friendly_forces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL,
  type_key text NOT NULL,
  unit text NOT NULL DEFAULT '',
  office text NOT NULL DEFAULT '',
  commanding_officer text NOT NULL DEFAULT '',
  contact_number text NOT NULL DEFAULT '',
  address_location text NOT NULL DEFAULT '',
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  created_by uuid REFERENCES public."user"(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT friendly_forces_lat_check CHECK (latitude >= -90 AND latitude <= 90),
  CONSTRAINT friendly_forces_lng_check CHECK (longitude >= -180 AND longitude <= 180),
  CONSTRAINT friendly_forces_type_key_check CHECK (
    type_key IN (
      'phil_army',
      'phil_navy',
      'phil_airforce',
      'phil_marines',
      'pcg',
      'bfp',
      'bjmp'
    )
  )
);

CREATE INDEX IF NOT EXISTS friendly_forces_office_unit_idx
  ON public.friendly_forces (office, unit);

CREATE INDEX IF NOT EXISTS friendly_forces_type_key_idx
  ON public.friendly_forces (type_key);

ALTER TABLE public.friendly_forces ENABLE ROW LEVEL SECURITY;
