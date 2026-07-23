
CREATE TABLE public.loads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  material_type TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT ALL ON public.loads TO service_role;
ALTER TABLE public.loads ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.load_certificates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  load_id UUID NOT NULL REFERENCES public.loads(id) ON DELETE CASCADE UNIQUE,
  coa_file_url TEXT,
  cow_file_url TEXT,
  calorific_value TEXT,
  moisture TEXT,
  total_weight_verified TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT ALL ON public.load_certificates TO service_role;
ALTER TABLE public.load_certificates ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.weighbridge_records
  ADD COLUMN IF NOT EXISTS do_file_url TEXT,
  ADD COLUMN IF NOT EXISTS load_id UUID REFERENCES public.loads(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS wb_records_load_id_idx ON public.weighbridge_records(load_id);

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER loads_set_updated_at BEFORE UPDATE ON public.loads
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER load_certificates_set_updated_at BEFORE UPDATE ON public.load_certificates
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
