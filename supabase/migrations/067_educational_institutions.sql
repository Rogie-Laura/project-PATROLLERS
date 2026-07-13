-- Dedicated table for Smart Locator Educational Institutions
CREATE TABLE IF NOT EXISTS public.educational_institutions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL,
  type_key text NOT NULL,
  unit text NOT NULL DEFAULT '',
  office text NOT NULL DEFAULT '',
  principal_supervisor text NOT NULL DEFAULT '',
  contact_number text NOT NULL DEFAULT '',
  address_location text NOT NULL DEFAULT '',
  estimated_students text NOT NULL DEFAULT '',
  is_polling_center boolean NOT NULL DEFAULT false,
  number_of_voters text NOT NULL DEFAULT '',
  personnel jsonb NOT NULL DEFAULT '[]'::jsonb,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  created_by uuid REFERENCES public."user"(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT educational_institutions_lat_check CHECK (latitude >= -90 AND latitude <= 90),
  CONSTRAINT educational_institutions_lng_check CHECK (longitude >= -180 AND longitude <= 180),
  CONSTRAINT educational_institutions_type_key_check CHECK (
    type_key IN (
      'daycares',
      'elementary_schools',
      'high_schools',
      'colleges',
      'universities'
    )
  )
);

CREATE INDEX IF NOT EXISTS educational_institutions_office_unit_idx
  ON public.educational_institutions (office, unit);
CREATE INDEX IF NOT EXISTS educational_institutions_type_key_idx
  ON public.educational_institutions (type_key);
ALTER TABLE public.educational_institutions ENABLE ROW LEVEL SECURITY;
