export type MaterialType = "COAL" | "BIOMASS" | "FABA" | "CHEMICAL" | "FUEL";

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
  BIOMASS: "Biomass (Sawdust)",
  FABA: "FABA",
  CHEMICAL: "Chemicals",
  FUEL: "BBM (Fuel)",
};

export const MATERIAL_SHORT: Record<MaterialType, string> = {
  COAL: "Coal",
  BIOMASS: "Biomass",
  FABA: "FABA",
  CHEMICAL: "Chemical",
  FUEL: "Fuel",
};

export const MATERIAL_COLORS: Record<MaterialType, string> = {
  COAL: "var(--mat-coal)",
  BIOMASS: "var(--mat-biomass)",
  FABA: "var(--mat-faba)",
  CHEMICAL: "var(--mat-chemical)",
  FUEL: "var(--mat-fuel)",
};

export const ALL_MATERIALS: MaterialType[] = ["COAL", "BIOMASS", "FABA", "CHEMICAL", "FUEL"];

export const SAMPLING_INTERVAL = 5; // every 5th coal truck per vendor per day

export function fmtMT(kg: number | null | undefined) {
  if (kg == null) return "-";
  return `${Number(kg).toLocaleString("id-ID", { maximumFractionDigits: 2 })} MT`;
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

/**
 * Sampling logic: every SAMPLING_INTERVAL-th COAL truck for the same vendor,
 * counted within the current day, must trigger manual sampling.
 * Given the list of coal records (any date range) it returns a map of id -> sampling index.
 * A record needs sampling if its ordinal (1-based, ordered by time_in within vendor+day) % 5 === 0.
 */
export function computeSampling(records: WeighbridgeRecord[]) {
  const coal = records
    .filter((r) => r.material_type === "COAL")
    .slice()
    .sort((a, b) => (a.time_in ?? a.created_at).localeCompare(b.time_in ?? b.created_at));

  const counters = new Map<string, number>();
  const result = new Map<string, { ordinal: number; sampling: boolean }>();
  for (const r of coal) {
    const day = (r.time_in ?? r.created_at).slice(0, 10);
    const key = `${r.vendor_name}::${day}`;
    const next = (counters.get(key) ?? 0) + 1;
    counters.set(key, next);
    result.set(r.id, { ordinal: next, sampling: next % SAMPLING_INTERVAL === 0 });
  }
  return result;
}
