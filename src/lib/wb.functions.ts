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
  lot: z.string().optional(),
  limit: z.number().int().positive().max(20000).optional(),
  order: z.enum(["asc", "desc"]).optional(),
});

const STORAGE_PREFIX = "storage:";
const DO_BUCKET = "do-archive";

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
    if (data.lot && data.lot !== "ALL") q = q.eq("lot_number", data.lot);
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

export const fetchLotNumbers = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("weighbridge_records")
    .select("lot_number")
    .not("lot_number", "is", null)
    .limit(5000);
  if (error) throw new Error(error.message);
  const set = new Set<string>();
  (data ?? []).forEach((r) => r.lot_number && set.add(r.lot_number));
  return Array.from(set).sort((a, b) => a.localeCompare(b, "id", { numeric: true }));
});

/** Simpan nomor Lot & nomor tiket untuk satu transaksi timbangan. */
export const saveWeighbridgeMeta = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        lot_number: z.string().max(40).nullable().optional(),
        ticket_number: z.string().max(20).nullable().optional(),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const patch: Record<string, string | null> = {};
    if (data.lot_number !== undefined) patch.lot_number = data.lot_number || null;
    if (data.ticket_number !== undefined) patch.ticket_number = data.ticket_number || null;
    const { error } = await supabaseAdmin
      .from("weighbridge_records")
      .update(patch)
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Unggah hasil scan berkas DO fisik (gambar / PDF) untuk satu truk. */
export const uploadDoScan = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        filename: z.string().min(1).max(200),
        contentType: z.string().min(1).max(100),
        base64: z.string().min(1),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const bytes = Uint8Array.from(atob(data.base64), (c) => c.charCodeAt(0));
    if (bytes.byteLength > 15 * 1024 * 1024) throw new Error("Ukuran berkas maksimal 15 MB");
    const safe = data.filename.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `${data.id}/${Date.now()}-${safe}`;
    const { error: upErr } = await supabaseAdmin.storage
      .from(DO_BUCKET)
      .upload(path, bytes, { contentType: data.contentType, upsert: true });
    if (upErr) throw new Error(upErr.message);
    const { error } = await supabaseAdmin
      .from("weighbridge_records")
      .update({ do_file_url: `${STORAGE_PREFIX}${path}` })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true, path };
  });

async function signOne(raw: string): Promise<string | null> {
  if (!raw.startsWith(STORAGE_PREFIX)) return raw;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.storage
    .from(DO_BUCKET)
    .createSignedUrl(raw.slice(STORAGE_PREFIX.length), 3600);
  if (error) return null;
  return data?.signedUrl ?? null;
}

/** Ubah referensi berkas DO menjadi URL yang bisa dibuka di browser. */
export const resolveDoUrl = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => z.object({ url: z.string().min(1) }).parse(data))
  .handler(async ({ data }) => ({ url: await signOne(data.url) }));

/** Semua berkas DO pada satu Lot, siap digabung menjadi satu PDF. */
export const resolveLotDoUrls = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => z.object({ lot: z.string().min(1) }).parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("weighbridge_records")
      .select("id, do_number, plate_number, vendor_name, do_file_url, time_in")
      .eq("lot_number", data.lot)
      .order("time_in", { ascending: true })
      .limit(1000);
    if (error) throw new Error(error.message);
    const out: { id: string; label: string; url: string }[] = [];
    for (const r of rows ?? []) {
      if (!r.do_file_url) continue;
      const url = await signOne(r.do_file_url);
      if (!url) continue;
      out.push({
        id: r.id,
        label: `${r.do_number ?? "DO"} · ${r.plate_number} · ${r.vendor_name}`,
        url,
      });
    }
    return out;
  });
