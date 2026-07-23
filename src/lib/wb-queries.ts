import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import type { Load, LoadSummary, WeighbridgeRecord } from "./wb";
import { monthRange, todayRange, yearRange } from "./wb";
import {
  attachDoToRecord,
  createLoad,
  fetchLoadSummaries,
  fetchLoads,
  fetchRecordDetail,
  fetchVendorNames,
  fetchWeighbridgeRecords,
  getSignedUrl,
  uploadFile,
  upsertLoadCertificate,
} from "./wb.functions";

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
  load_id?: string;
  cert_status?: "ALL" | "COMPLETE" | "MISSING";
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
          load_id: filters.load_id,
          cert_status: filters.cert_status,
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

export function useLoads() {
  const fn = useServerFn(fetchLoads);
  return useQuery({
    queryKey: ["wb", "loads"],
    queryFn: async () => (await fn()) as Load[],
    staleTime: 15_000,
  });
}

export function useLoadSummaries() {
  const fn = useServerFn(fetchLoadSummaries);
  return useQuery({
    queryKey: ["wb", "load-summaries"],
    queryFn: async () => (await fn()) as LoadSummary[],
    refetchInterval: 15_000,
  });
}

export function useCreateLoad() {
  const fn = useServerFn(createLoad);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { name: string; material_type: string; notes?: string }) =>
      fn({ data: v }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["wb", "loads"] });
      qc.invalidateQueries({ queryKey: ["wb", "load-summaries"] });
    },
  });
}

export function useUploadFile() {
  const fn = useServerFn(uploadFile);
  return useMutation({
    mutationFn: async (file: File & { bucket?: "do-scans" | "certificates" }) => {
      const bucket = (file as any).bucket as "do-scans" | "certificates";
      const buf = await file.arrayBuffer();
      const bytes = new Uint8Array(buf);
      let binary = "";
      for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
      const b64 = typeof window !== "undefined" ? window.btoa(binary) : "";
      return fn({
        data: {
          bucket,
          filename: file.name,
          content_type: file.type || "application/octet-stream",
          data_base64: b64,
        },
      }) as Promise<{ path: string; bucket: string }>;
    },
  });
}

export function useAttachDo() {
  const fn = useServerFn(attachDoToRecord);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: {
      record_id: string;
      do_file_path?: string;
      do_number?: string;
      load_id?: string | null;
    }) => fn({ data: v }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["wb"] });
    },
  });
}

export function useUpsertCertificate() {
  const fn = useServerFn(upsertLoadCertificate);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: {
      load_id: string;
      coa_file_path?: string | null;
      cow_file_path?: string | null;
      calorific_value?: string;
      moisture?: string;
      total_weight_verified?: string;
      notes?: string;
    }) => fn({ data: v }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["wb", "load-summaries"] });
      qc.invalidateQueries({ queryKey: ["wb"] });
    },
  });
}

export function useSignedUrl() {
  const fn = useServerFn(getSignedUrl);
  return useMutation({
    mutationFn: (v: { bucket: "do-scans" | "certificates"; path: string }) =>
      fn({ data: v }) as Promise<{ url: string }>,
  });
}

export function useRecordDetail(id: string | null) {
  const fn = useServerFn(fetchRecordDetail);
  return useQuery({
    queryKey: ["wb", "record", id],
    enabled: !!id,
    queryFn: async () => fn({ data: { id: id! } }),
  });
}
