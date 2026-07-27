import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { ALLOWED_MATERIALS } from "./wb";

const filtersSchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  material: z.string().optional(),
  vendor: z.string().optional(),
  plate: z.string().optional(),
  spk: z.string().optional(),
  limit: z.number().int().positive().max(20000).optional(),
  order: z.enum(["asc", "desc"]).optional(),
});

export const fetchWeighbridgeRecords = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => filtersSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let q = supabaseAdmin
      .from("weighbridge_records")
      .select("*")
      .in("material_type", ALLOWED_MATERIALS)
      .order("time_in", { ascending: data.order === "asc" })
      .limit(data.limit ?? 2000);
    if (data.from) q = q.gte("time_in", data.from);
    if (data.to) q = q.lt("time_in", data.to);
    if (data.material && data.material !== "ALL") q = q.eq("material_type", data.material);
    if (data.vendor) q = q.ilike("vendor_name", `%${data.vendor}%`);
    if (data.plate) q = q.ilike("plate_number", `%${data.plate}%`);
    if (data.spk) q = q.ilike("do_number", `%${data.spk}%`);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const fetchVendorNames = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("weighbridge_records")
    .select("vendor_name")
    .in("material_type", ALLOWED_MATERIALS)
    .limit(2000);
  if (error) throw new Error(error.message);
  const set = new Set<string>();
  (data ?? []).forEach((r) => set.add(r.vendor_name));
  return Array.from(set).sort();
});
