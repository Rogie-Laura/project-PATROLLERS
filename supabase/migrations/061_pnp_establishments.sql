-- Dedicated table for Smart Locator PNP Establishments
CREATE TABLE IF NOT EXISTS public.pnp_establishments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL,
  type_key text NOT NULL,
  unit text NOT NULL DEFAULT '',
  office text NOT NULL DEFAULT '',
  station_toc text NOT NULL DEFAULT '',
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  created_by uuid REFERENCES public."user"(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pnp_establishments_lat_check CHECK (latitude >= -90 AND latitude <= 90),
  CONSTRAINT pnp_establishments_lng_check CHECK (longitude >= -180 AND longitude <= 180),
  CONSTRAINT pnp_establishments_type_key_check CHECK (
    type_key IN ('police_station', 'sub_station_pcp', 'pac', 'sscp', 'bcp')
  )
);

CREATE INDEX IF NOT EXISTS pnp_establishments_office_unit_idx
  ON public.pnp_establishments (office, unit);

CREATE INDEX IF NOT EXISTS pnp_establishments_type_key_idx
  ON public.pnp_establishments (type_key);

ALTER TABLE public.pnp_establishments ENABLE ROW LEVEL SECURITY;
