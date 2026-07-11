import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { WeighbridgeRecord } from "./wb";
import { todayRange } from "./wb";

const REFETCH_MS = 10_000;

export function useTodayRecords() {
  return useQuery({
    queryKey: ["wb", "today"],
    queryFn: async () => {
      const { start, end } = todayRange();
      const { data, error } = await supabase
        .from("weighbridge_records")
        .select("*")
        .gte("time_in", start)
        .lt("time_in", end)
        .order("time_in", { ascending: false });
      if (error) throw error;
      return (data ?? []) as WeighbridgeRecord[];
    },
    refetchInterval: REFETCH_MS,
    refetchOnWindowFocus: true,
  });
}

export interface HistoryFilters {
  from?: string; // ISO date (YYYY-MM-DD)
  to?: string;
  material?: string;
  vendor?: string;
  plate?: string;
}

export function useHistory(filters: HistoryFilters) {
  return useQuery({
    queryKey: ["wb", "history", filters],
    queryFn: async () => {
      let q = supabase
        .from("weighbridge_records")
        .select("*")
        .order("time_in", { ascending: false })
        .limit(1000);
      if (filters.from) q = q.gte("time_in", `${filters.from}T00:00:00`);
      if (filters.to) q = q.lte("time_in", `${filters.to}T23:59:59`);
      if (filters.material && filters.material !== "ALL") q = q.eq("material_type", filters.material);
      if (filters.vendor) q = q.ilike("vendor_name", `%${filters.vendor}%`);
      if (filters.plate) q = q.ilike("plate_number", `%${filters.plate}%`);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as WeighbridgeRecord[];
    },
    refetchInterval: REFETCH_MS,
  });
}

export function useVendors() {
  return useQuery({
    queryKey: ["wb", "vendors"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("weighbridge_records")
        .select("vendor_name")
        .limit(1000);
      if (error) throw error;
      const set = new Set<string>();
      (data ?? []).forEach((r: { vendor_name: string }) => set.add(r.vendor_name));
      return Array.from(set).sort();
    },
    staleTime: 60_000,
  });
}
