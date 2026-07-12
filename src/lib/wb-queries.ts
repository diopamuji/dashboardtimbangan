import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { WeighbridgeRecord } from "./wb";
import { ALLOWED_MATERIALS, monthRange, todayRange, yearRange } from "./wb";

const REFETCH_MS = 10_000;

function baseSelect() {
  return supabase
    .from("weighbridge_records")
    .select("*")
    .in("material_type", ALLOWED_MATERIALS);
}

export function useTodayRecords() {
  return useQuery({
    queryKey: ["wb", "today"],
    queryFn: async () => {
      const { start, end } = todayRange();
      const { data, error } = await baseSelect()
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

export function useMonthRecords() {
  return useQuery({
    queryKey: ["wb", "month"],
    queryFn: async () => {
      const { start, end } = monthRange();
      const { data, error } = await baseSelect()
        .gte("time_in", start)
        .lt("time_in", end)
        .order("time_in", { ascending: false })
        .limit(5000);
      if (error) throw error;
      return (data ?? []) as WeighbridgeRecord[];
    },
    refetchInterval: 30_000,
  });
}

export function useYearRecords() {
  return useQuery({
    queryKey: ["wb", "year"],
    queryFn: async () => {
      const { start, end } = yearRange();
      const { data, error } = await baseSelect()
        .gte("time_in", start)
        .lt("time_in", end)
        .order("time_in", { ascending: false })
        .limit(20000);
      if (error) throw error;
      return (data ?? []) as WeighbridgeRecord[];
    },
    refetchInterval: 60_000,
  });
}

export interface HistoryFilters {
  from?: string;
  to?: string;
  material?: string;
  vendor?: string;
  plate?: string;
  spk?: string;
}

export function useHistory(filters: HistoryFilters) {
  return useQuery({
    queryKey: ["wb", "history", filters],
    queryFn: async () => {
      let q = baseSelect()
        .order("time_in", { ascending: false })
        .limit(2000);
      if (filters.from) q = q.gte("time_in", `${filters.from}T00:00:00`);
      if (filters.to) q = q.lte("time_in", `${filters.to}T23:59:59`);
      if (filters.material && filters.material !== "ALL") q = q.eq("material_type", filters.material);
      if (filters.vendor) q = q.ilike("vendor_name", `%${filters.vendor}%`);
      if (filters.plate) q = q.ilike("plate_number", `%${filters.plate}%`);
      if (filters.spk) q = q.ilike("do_number", `%${filters.spk}%`);
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
        .in("material_type", ALLOWED_MATERIALS)
        .limit(2000);
      if (error) throw error;
      const set = new Set<string>();
      (data ?? []).forEach((r: { vendor_name: string }) => set.add(r.vendor_name));
      return Array.from(set).sort();
    },
    staleTime: 60_000,
  });
}
