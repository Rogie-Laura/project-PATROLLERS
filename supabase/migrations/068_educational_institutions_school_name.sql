-- Add school name to Educational Institutions
ALTER TABLE public.educational_institutions
  ADD COLUMN IF NOT EXISTS school_name text NOT NULL DEFAULT '';
