import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Download, FileSearch, Filter, Search, X } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useHistory, useVendors, type HistoryFilters } from "@/lib/wb-queries";
import {
  ALL_MATERIALS,
  MATERIAL_LABELS,
  MATERIAL_SHORT,
  fmtDateTime,
  fmtKg,
  type MaterialType,
} from "@/lib/wb";

export const Route = createFileRoute("/history")({
  component: HistoryPage,
});

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}
function weekAgoStr() {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  return d.toISOString().slice(0, 10);
}

type ReportView =
  | "harian"
  | "kendaraan"
  | "product"
  | "customer"
  | "spk"
  | "daftar_product"
  | "daftar_customer"
  | "daftar_transporter";

function HistoryPage() {
  const [filters, setFilters] = useState<HistoryFilters>({
    from: weekAgoStr(),
    to: todayStr(),
    material: "ALL",
    vendor: "",
    plate: "",
    spk: "",
  });
  const [view, setView] = useState<ReportView>("harian");

  const { data: records = [], isLoading } = useHistory(filters);
  const { data: vendors = [] } = useVendors();

  function exportCSV() {
    if (records.length === 0) {
      toast.error("Tidak ada data untuk diekspor");
      return;
    }
    const headers = [
      "Nomor SPK/DO",
      "No Polisi",
      "Pemasok",
      "Material",
      "Bruto (Kg)",
      "Tara (Kg)",
      "Netto (Kg)",
      "Jam Masuk",
      "Jam Keluar",
      "Status",
      "PT Asal",
      "Driver",
    ];
    const rows = records.map((r) => [
      r.do_number ?? "",
      r.plate_number,
      r.vendor_name,
      MATERIAL_LABELS[r.material_type],
      r.gross_weight,
      r.tare_weight,
      r.net_weight,
      r.time_in ?? "",
      r.time_out ?? "",
      r.status,
      r.origin_pt ?? "",
      r.driver_name ?? "",
    ]);
    const csv = [headers, ...rows]
      .map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `weighbridge-ombilin-${filters.from ?? ""}_to_${filters.to ?? ""}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${records.length} baris berhasil diekspor`);
  }

  function resetFilters() {
    setFilters({ from: weekAgoStr(), to: todayStr(), material: "ALL", vendor: "", plate: "", spk: "" });
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <FileSearch className="h-4 w-4 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">Data Historis & Arsip Digital</h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Riwayat jembatan timbang siap audit — filter, ekspor, dan lihat arsip digital.
          </p>
        </div>
        <Button onClick={exportCSV} className="bg-gradient-gold text-primary hover:opacity-90">
          <Download className="mr-2 h-4 w-4" />
          Ekspor CSV / Excel
        </Button>
      </div>

      {/* Filters */}
      <Card className="shadow-card">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <Filter className="h-4 w-4" />
            Filter Pencarian
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 md:grid-cols-4 lg:grid-cols-7">
          <div className="space-y-1.5">
            <Label className="text-xs">Dari Tanggal</Label>
            <Input
              type="date"
              value={filters.from ?? ""}
              onChange={(e) => setFilters((f) => ({ ...f, from: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Sampai Tanggal</Label>
            <Input
              type="date"
              value={filters.to ?? ""}
              onChange={(e) => setFilters((f) => ({ ...f, to: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Material</Label>
            <Select
              value={filters.material ?? "ALL"}
              onValueChange={(v) => setFilters((f) => ({ ...f, material: v }))}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Semua material</SelectItem>
                {ALL_MATERIALS.map((m) => (
                  <SelectItem key={m} value={m}>{MATERIAL_LABELS[m]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Pemasok</Label>
            <Select
              value={filters.vendor || "ALL"}
              onValueChange={(v) => setFilters((f) => ({ ...f, vendor: v === "ALL" ? "" : v }))}
            >
              <SelectTrigger><SelectValue placeholder="Semua pemasok" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Semua pemasok</SelectItem>
                {vendors.map((v) => (
                  <SelectItem key={v} value={v}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">No Polisi</Label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-8"
                placeholder="mis. BA 1234"
                value={filters.plate ?? ""}
                onChange={(e) => setFilters((f) => ({ ...f, plate: e.target.value }))}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Nomor SPK</Label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-8"
                placeholder="mis. SPK-2026-001"
                value={filters.spk ?? ""}
                onChange={(e) => setFilters((f) => ({ ...f, spk: e.target.value }))}
              />
            </div>
          </div>
          <div className="flex items-end">
            <Button variant="outline" onClick={resetFilters} className="w-full">
              <X className="mr-1 h-3.5 w-3.5" />
              Reset
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Report sub-tabs */}
      <Tabs value={view} onValueChange={(v) => setView(v as ReportView)}>
        <div className="overflow-x-auto">
          <TabsList className="flex-wrap">
            <TabsTrigger value="harian">Laporan Harian</TabsTrigger>
            <TabsTrigger value="kendaraan">Per No. Kendaraan</TabsTrigger>
            <TabsTrigger value="product">Per Product</TabsTrigger>
            <TabsTrigger value="customer">Per Customer</TabsTrigger>
            <TabsTrigger value="spk">Per Nomor SPK</TabsTrigger>
            <TabsTrigger value="daftar_product">Daftar Product</TabsTrigger>
            <TabsTrigger value="daftar_customer">Daftar Customer/Supplier</TabsTrigger>
            <TabsTrigger value="daftar_transporter">Daftar Transporter</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="harian" className="mt-4">
          <DetailTable records={records} loading={isLoading} />
        </TabsContent>
        <TabsContent value="kendaraan" className="mt-4">
          <GroupedTable
            records={records}
            groupBy={(r) => r.plate_number}
            groupLabel="No. Kendaraan"
          />
        </TabsContent>
        <TabsContent value="product" className="mt-4">
          <GroupedTable
            records={records}
            groupBy={(r) => MATERIAL_LABELS[r.material_type]}
            groupLabel="Product (KODEBRG)"
          />
        </TabsContent>
        <TabsContent value="customer" className="mt-4">
          <GroupedTable
            records={records}
            groupBy={(r) => r.vendor_name}
            groupLabel="Customer (KODECUST)"
          />
        </TabsContent>
        <TabsContent value="spk" className="mt-4">
          <GroupedTable
            records={records}
            groupBy={(r) => r.do_number ?? "(Tanpa SPK)"}
            groupLabel="Nomor SPK"
          />
        </TabsContent>
        <TabsContent value="daftar_product" className="mt-4">
          <MasterList
            title="Daftar Product"
            values={Array.from(new Set(records.map((r) => MATERIAL_LABELS[r.material_type]))).sort()}
          />
        </TabsContent>
        <TabsContent value="daftar_customer" className="mt-4">
          <MasterList
            title="Daftar Customer / Supplier"
            values={Array.from(new Set(records.map((r) => r.vendor_name))).sort()}
          />
        </TabsContent>
        <TabsContent value="daftar_transporter" className="mt-4">
          <MasterList
            title="Daftar Transporter (KODETRSP)"
            values={Array.from(
              new Set(records.map((r) => r.origin_pt ?? r.vendor_name)),
            ).sort()}
          />
        </TabsContent>
      </Tabs>

    </div>
  );
}

/* ---------- Detail table (Laporan Harian) ---------- */

function DetailTable({
  records,
  loading,
  onView,
}: {
  records: WeighbridgeRecord[];
  loading: boolean;
  onView: (r: WeighbridgeRecord) => void;
}) {
  return (
    <Card className="shadow-card">
      <CardContent className="px-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-secondary/50">
                <TableHead className="pl-6">Nomor SPK/DO</TableHead>
                <TableHead>No Polisi</TableHead>
                <TableHead>Pemasok</TableHead>
                <TableHead>Material</TableHead>
                <TableHead className="text-right">Netto</TableHead>
                <TableHead>Jam Masuk</TableHead>
                <TableHead>Jam Keluar</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && (
                <TableRow>
                  <TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                    Memuat...
                  </TableCell>
                </TableRow>
              )}
              {!loading && records.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                    Tidak ada data yang cocok dengan filter.
                  </TableCell>
                </TableRow>
              )}
              {records.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="pl-6 font-mono text-xs">{r.do_number ?? "—"}</TableCell>
                  <TableCell className="font-mono font-semibold">{r.plate_number}</TableCell>
                  <TableCell className="max-w-[200px] truncate">{r.vendor_name}</TableCell>
                  <TableCell>
                    <MaterialBadge m={r.material_type} />
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm font-bold text-primary">
                    {fmtKg(r.net_weight)}
                  </TableCell>
                  <TableCell className="text-xs">{fmtDateTime(r.time_in)}</TableCell>
                  <TableCell className="text-xs">{fmtDateTime(r.time_out)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

/* ---------- Grouped summary table ---------- */

function GroupedTable({
  records,
  groupBy,
  groupLabel,
}: {
  records: WeighbridgeRecord[];
  groupBy: (r: WeighbridgeRecord) => string;
  groupLabel: string;
}) {
  const rows = useMemo(() => {
    const map = new Map<string, { count: number; net: number }>();
    for (const r of records) {
      const k = groupBy(r);
      const cur = map.get(k) ?? { count: 0, net: 0 };
      cur.count += 1;
      cur.net += Number(r.net_weight);
      map.set(k, cur);
    }
    return Array.from(map, ([key, v]) => ({ key, ...v })).sort((a, b) => b.net - a.net);
  }, [records, groupBy]);

  return (
    <Card className="shadow-card">
      <CardContent className="px-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-secondary/50">
                <TableHead className="pl-6">{groupLabel}</TableHead>
                <TableHead className="text-right">Jumlah Trip</TableHead>
                <TableHead className="pr-6 text-right">Total Netto</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="py-10 text-center text-sm text-muted-foreground">
                    Tidak ada data.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((r) => (
                  <TableRow key={r.key}>
                    <TableCell className="pl-6 font-medium">{r.key}</TableCell>
                    <TableCell className="text-right font-mono">{r.count}</TableCell>
                    <TableCell className="pr-6 text-right font-mono font-bold text-primary">
                      {fmtKg(r.net)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

/* ---------- Master list (Daftar Product / Customer / Transporter) ---------- */

function MasterList({ title, values }: { title: string; values: string[] }) {
  return (
    <Card className="shadow-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold">
          {title} ({values.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {values.length === 0 ? (
          <div className="py-6 text-center text-sm text-muted-foreground">
            Tidak ada data pada periode terpilih.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {values.map((v) => (
              <div
                key={v}
                className="rounded-md border border-border bg-card px-3 py-2 text-sm font-medium text-foreground"
              >
                {v}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

const MATERIAL_TONE: Record<MaterialType, string> = {
  COAL: "bg-slate-700 text-white",
  REJECT_COAL: "bg-red-700 text-white",
  BIOMASS: "bg-emerald-600 text-white",
  FABA: "bg-amber-700 text-white",
  CHEMICAL: "bg-violet-600 text-white",
  FUEL: "bg-orange-600 text-white",
};

function MaterialBadge({ m }: { m: MaterialType }) {
  return <Badge className={MATERIAL_TONE[m]}>{MATERIAL_SHORT[m]}</Badge>;
}
