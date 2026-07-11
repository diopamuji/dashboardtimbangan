
CREATE TABLE public.weighbridge_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  do_number TEXT,
  plate_number TEXT NOT NULL,
  vendor_name TEXT NOT NULL,
  material_type TEXT NOT NULL CHECK (material_type IN ('COAL','BIOMASS','FABA','CHEMICAL','FUEL')),
  gross_weight NUMERIC(10,2) NOT NULL DEFAULT 0,
  tare_weight NUMERIC(10,2) NOT NULL DEFAULT 0,
  net_weight NUMERIC(10,2) NOT NULL DEFAULT 0,
  time_in TIMESTAMPTZ,
  time_out TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'COMPLETED',
  origin_pt TEXT,
  driver_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_wb_time_in ON public.weighbridge_records(time_in DESC);
CREATE INDEX idx_wb_material ON public.weighbridge_records(material_type);
CREATE INDEX idx_wb_vendor ON public.weighbridge_records(vendor_name);
CREATE INDEX idx_wb_plate ON public.weighbridge_records(plate_number);

GRANT SELECT ON public.weighbridge_records TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.weighbridge_records TO authenticated;
GRANT ALL ON public.weighbridge_records TO service_role;

ALTER TABLE public.weighbridge_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view weighbridge records"
  ON public.weighbridge_records FOR SELECT
  USING (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.weighbridge_records;
