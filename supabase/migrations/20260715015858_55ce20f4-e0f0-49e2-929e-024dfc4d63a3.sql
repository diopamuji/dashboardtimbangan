DROP POLICY IF EXISTS "Public can view weighbridge records" ON public.weighbridge_records;
REVOKE SELECT ON public.weighbridge_records FROM anon;
REVOKE SELECT ON public.weighbridge_records FROM authenticated;
GRANT ALL ON public.weighbridge_records TO service_role;