export type MaterialType = "COAL" | "REJECT_COAL" | "BIOMASS" | "FABA" | "CHEMICAL" | "FUEL";

export interface WeighbridgeRecord {
  id: string;
  do_number: string | null;
  plate_number: string;
  vendor_name: string;
  material_type: MaterialType;
  gross_weight: number;
  tare_weight: number;
  net_weight: number;
  time_in: string | null;
  time_out: string | null;
  status: string;
  origin_pt: string | null;
  driver_name: string | null;
  created_at: string;
}

export const MATERIAL_LABELS: Record<MaterialType, string> = {
  COAL: "Batubara",
  REJECT_COAL: "Reject Batubara",
  BIOMASS: "Sawdust",
  FABA: "FABA",
  CHEMICAL: "Chemical",
  FUEL: "BBM",
};

export const MATERIAL_SHORT: Record<MaterialType, string> = {
  COAL: "Batubara",
  REJECT_COAL: "Reject Batubara",
  BIOMASS: "Sawdust",
  FABA: "FABA",
  CHEMICAL: "Chemical",
  FUEL: "BBM",
};

export const MATERIAL_COLORS: Record<MaterialType, string> = {
  COAL: "var(--mat-coal)",
  REJECT_COAL: "var(--mat-coal)",
  BIOMASS: "var(--mat-biomass)",
  FABA: "var(--mat-faba)",
  CHEMICAL: "var(--mat-chemical)",
  FUEL: "var(--mat-fuel)",
};

// Only these materials are surfaced in the application UI.
export const ALL_MATERIALS: MaterialType[] = ["COAL", "REJECT_COAL", "BIOMASS", "FABA", "CHEMICAL"];
export const ALLOWED_MATERIALS = ALL_MATERIALS;

export function fmtKg(kg: number | null | undefined) {
  if (kg == null) return "-";
  return `${Number(kg).toLocaleString("id-ID", { maximumFractionDigits: 0 })} Kg`;
}

export function fmtMT(kg: number | null | undefined) {
  if (kg == null) return "-";
  return `${Number(kg).toLocaleString("id-ID", { maximumFractionDigits: 2 })} MT`;
}

export function kgToMT(kg: number) {
  return kg / 1000;
}

export function fmtTime(iso: string | null | undefined) {
  if (!iso) return "-";
  return new Date(iso).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
}

export function fmtDateTime(iso: string | null | undefined) {
  if (!iso) return "-";
  return new Date(iso).toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function todayRange(): { start: string; end: string } {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start: start.toISOString(), end: end.toISOString() };
}

export function monthRange(): { start: string; end: string } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return { start: start.toISOString(), end: end.toISOString() };
}

export function yearRange(): { start: string; end: string } {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const end = new Date(now.getFullYear() + 1, 0, 1);
  return { start: start.toISOString(), end: end.toISOString() };
}

/**
 * Sequential arrival counter per vendor per day, for coal (or any material).
 * Returns a map of record id -> arrival ordinal for its vendor+day.
 */
export function computeVendorArrival(records: WeighbridgeRecord[]) {
  const sorted = records.slice().sort((a, b) =>
    (a.time_in ?? a.created_at).localeCompare(b.time_in ?? b.created_at),
  );
  const counters = new Map<string, number>();
  const result = new Map<string, number>();
  for (const r of sorted) {
    const day = (r.time_in ?? r.created_at).slice(0, 10);
    const key = `${r.vendor_name}::${day}`;
    const next = (counters.get(key) ?? 0) + 1;
    counters.set(key, next);
    result.set(r.id, next);
  }
  return result;
}
