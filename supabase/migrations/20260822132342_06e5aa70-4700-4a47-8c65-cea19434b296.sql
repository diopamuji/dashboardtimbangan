ALTER TABLE public.weighbridge_records
  ADD COLUMN IF NOT EXISTS lot_number text,
  ADD COLUMN IF NOT EXISTS ticket_number text;

CREATE INDEX IF NOT EXISTS weighbridge_records_lot_idx ON public.weighbridge_records (lot_number);