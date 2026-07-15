import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import type { WeighbridgeRecord } from "./wb";
import { monthRange, todayRange, yearRange } from "./wb";
import { fetchVendorNames, fetchWeighbridgeRecords } from "./wb.functions";

const REFETCH_MS = 10_000;

export function useTodayRecords() {
  const fetchFn = useServerFn(fetchWeighbridgeRecords);
  return useQuery({
    queryKey: ["wb", "today"],
    queryFn: async () => {
      const { start, end } = todayRange();
      const rows = await fetchFn({ data: { from: start, to: end, limit: 2000 } });
      return rows as WeighbridgeRecord[];
    },
    refetchInterval: REFETCH_MS,
    refetchOnWindowFocus: true,
  });
}

export function useMonthRecords() {
  const fetchFn = useServerFn(fetchWeighbridgeRecords);
  return useQuery({
    queryKey: ["wb", "month"],
    queryFn: async () => {
      const { start, end } = monthRange();
      const rows = await fetchFn({ data: { from: start, to: end, limit: 5000 } });
      return rows as WeighbridgeRecord[];
    },
    refetchInterval: 30_000,
  });
}

export function useYearRecords() {
  const fetchFn = useServerFn(fetchWeighbridgeRecords);
  return useQuery({
    queryKey: ["wb", "year"],
    queryFn: async () => {
      const { start, end } = yearRange();
      const rows = await fetchFn({ data: { from: start, to: end, limit: 20000 } });
      return rows as WeighbridgeRecord[];
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
  const fetchFn = useServerFn(fetchWeighbridgeRecords);
  return useQuery({
    queryKey: ["wb", "history", filters],
    queryFn: async () => {
      const rows = await fetchFn({
        data: {
          from: filters.from ? `${filters.from}T00:00:00` : undefined,
          to: filters.to ? `${filters.to}T23:59:59` : undefined,
          material: filters.material,
          vendor: filters.vendor,
          plate: filters.plate,
          spk: filters.spk,
          limit: 2000,
        },
      });
      return rows as WeighbridgeRecord[];
    },
    refetchInterval: REFETCH_MS,
  });
}

export function useVendors() {
  const fetchFn = useServerFn(fetchVendorNames);
  return useQuery({
    queryKey: ["wb", "vendors"],
    queryFn: async () => {
      return (await fetchFn()) as string[];
    },
    staleTime: 60_000,
  });
}
