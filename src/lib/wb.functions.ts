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
  load_id: z.string().optional(),
  cert_status: z.enum(["ALL", "COMPLETE", "MISSING"]).optional(),
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
    if (data.load_id && data.load_id !== "ALL") q = q.eq("load_id", data.load_id);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    let result = rows ?? [];
    if (data.cert_status && data.cert_status !== "ALL") {
      const loadIds = Array.from(new Set(result.map((r) => r.load_id).filter(Boolean))) as string[];
      const certMap = new Map<string, { coa: boolean; cow: boolean }>();
      if (loadIds.length) {
        const { data: certs } = await supabaseAdmin
          .from("load_certificates")
          .select("load_id, coa_file_url, cow_file_url")
          .in("load_id", loadIds);
        (certs ?? []).forEach((c) =>
          certMap.set(c.load_id, { coa: !!c.coa_file_url, cow: !!c.cow_file_url }),
        );
      }
      result = result.filter((r) => {
        const c = r.load_id ? certMap.get(r.load_id) : undefined;
        const complete = !!c && c.coa && c.cow;
        return data.cert_status === "COMPLETE" ? complete : !complete;
      });
    }
    return result;
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

/* ---------- Loads ---------- */

export const fetchLoads = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("loads")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
});

export const fetchLoadSummaries = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const [loadsRes, certsRes, recordsRes] = await Promise.all([
    supabaseAdmin.from("loads").select("*").order("created_at", { ascending: false }),
    supabaseAdmin.from("load_certificates").select("*"),
    supabaseAdmin.from("weighbridge_records").select("load_id, net_weight").not("load_id", "is", null),
  ]);
  if (loadsRes.error) throw new Error(loadsRes.error.message);
  const certMap = new Map<string, any>();
  (certsRes.data ?? []).forEach((c) => certMap.set(c.load_id, c));
  const aggMap = new Map<string, { count: number; total: number }>();
  (recordsRes.data ?? []).forEach((r) => {
    if (!r.load_id) return;
    const cur = aggMap.get(r.load_id) ?? { count: 0, total: 0 };
    cur.count += 1;
    cur.total += Number(r.net_weight) || 0;
    aggMap.set(r.load_id, cur);
  });
  return (loadsRes.data ?? []).map((l) => ({
    load: l,
    truck_count: aggMap.get(l.id)?.count ?? 0,
    total_net_kg: aggMap.get(l.id)?.total ?? 0,
    certificate: certMap.get(l.id) ?? null,
  }));
});

const createLoadSchema = z.object({
  name: z.string().trim().min(1).max(120),
  material_type: z.string(),
  notes: z.string().max(500).optional(),
});

export const createLoad = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => createLoadSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("loads")
      .insert({ name: data.name, material_type: data.material_type, notes: data.notes ?? null })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

/* ---------- File uploads (base64) ---------- */

const uploadSchema = z.object({
  bucket: z.enum(["do-scans", "certificates"]),
  filename: z.string().min(1).max(200),
  content_type: z.string().min(1),
  data_base64: z.string().min(1),
});

export const uploadFile = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => uploadSchema.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const buffer = Buffer.from(data.data_base64, "base64");
    const safeName = data.filename.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safeName}`;
    const { error } = await supabaseAdmin.storage
      .from(data.bucket)
      .upload(path, buffer, { contentType: data.content_type, upsert: false });
    if (error) throw new Error(error.message);
    return { path, bucket: data.bucket };
  });

const signSchema = z.object({
  bucket: z.enum(["do-scans", "certificates"]),
  path: z.string().min(1),
  expires_in: z.number().int().positive().max(3600).optional(),
});

export const getSignedUrl = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => signSchema.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: signed, error } = await supabaseAdmin.storage
      .from(data.bucket)
      .createSignedUrl(data.path, data.expires_in ?? 600);
    if (error) throw new Error(error.message);
    return { url: signed.signedUrl };
  });

/* ---------- Attach DO / Load to weighbridge record ---------- */

const attachDoSchema = z.object({
  record_id: z.string().uuid(),
  do_file_path: z.string().optional(),
  do_number: z.string().max(120).optional(),
  load_id: z.string().uuid().nullable().optional(),
});

export const attachDoToRecord = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => attachDoSchema.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const patch: Record<string, unknown> = {};
    if (data.do_file_path !== undefined) patch.do_file_url = data.do_file_path;
    if (data.do_number !== undefined) patch.do_number = data.do_number;
    if (data.load_id !== undefined) patch.load_id = data.load_id;
    const { error } = await supabaseAdmin
      .from("weighbridge_records")
      .update(patch)
      .eq("id", data.record_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ---------- Certificates ---------- */

const upsertCertSchema = z.object({
  load_id: z.string().uuid(),
  coa_file_path: z.string().nullable().optional(),
  cow_file_path: z.string().nullable().optional(),
  calorific_value: z.string().max(120).optional(),
  moisture: z.string().max(120).optional(),
  total_weight_verified: z.string().max(120).optional(),
  notes: z.string().max(500).optional(),
});

export const upsertLoadCertificate = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => upsertCertSchema.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: existing } = await supabaseAdmin
      .from("load_certificates")
      .select("id, coa_file_url, cow_file_url")
      .eq("load_id", data.load_id)
      .maybeSingle();
    const payload: Record<string, unknown> = {
      load_id: data.load_id,
      calorific_value: data.calorific_value ?? existing?.calorific_value ?? null,
      moisture: data.moisture ?? null,
      total_weight_verified: data.total_weight_verified ?? null,
      notes: data.notes ?? null,
    };
    if (data.coa_file_path !== undefined) payload.coa_file_url = data.coa_file_path;
    else if (existing) payload.coa_file_url = existing.coa_file_url;
    if (data.cow_file_path !== undefined) payload.cow_file_url = data.cow_file_path;
    else if (existing) payload.cow_file_url = existing.cow_file_url;

    if (existing) {
      const { error } = await supabaseAdmin
        .from("load_certificates")
        .update(payload)
        .eq("id", existing.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabaseAdmin.from("load_certificates").insert(payload);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const fetchRecordDetail = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rec, error } = await supabaseAdmin
      .from("weighbridge_records")
      .select("*")
      .eq("id", data.id)
      .single();
    if (error) throw new Error(error.message);
    let load = null as any;
    let cert = null as any;
    if (rec.load_id) {
      const [{ data: l }, { data: c }] = await Promise.all([
        supabaseAdmin.from("loads").select("*").eq("id", rec.load_id).maybeSingle(),
        supabaseAdmin.from("load_certificates").select("*").eq("load_id", rec.load_id).maybeSingle(),
      ]);
      load = l;
      cert = c;
    }
    return { record: rec, load, certificate: cert };
  });
