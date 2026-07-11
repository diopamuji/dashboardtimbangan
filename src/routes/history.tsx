import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Download, Eye, FileSearch, Filter, Search, X } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useHistory, useVendors, type HistoryFilters } from "@/lib/wb-queries";
import {
  ALL_MATERIALS,
  MATERIAL_LABELS,
  MATERIAL_SHORT,
  fmtDateTime,
  fmtMT,
  type MaterialType,
  type WeighbridgeRecord,
} from "@/lib/wb";
import { DOReceipt } from "@/components/DOReceipt";

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

function HistoryPage() {
  const [filters, setFilters] = useState<HistoryFilters>({
    from: weekAgoStr(),
    to: todayStr(),
    material: "ALL",
    vendor: "",
    plate: "",
  });
  const [selected, setSelected] = useState<WeighbridgeRecord | null>(null);

  const { data: records = [], isLoading } = useHistory(filters);
  const { data: vendors = [] } = useVendors();

  const stats = useMemo(() => {
    const totalNet = records.reduce((a, r) => a + Number(r.net_weight), 0);
    return { count: records.length, totalNet };
  }, [records]);

  function exportCSV() {
    if (records.length === 0) {
      toast.error("No data to export");
      return;
    }
    const headers = [
      "DO Number",
      "Plate Number",
      "Vendor",
      "Material",
      "Gross (MT)",
      "Tare (MT)",
      "Netto (MT)",
      "Time In",
      "Time Out",
      "Status",
      "Origin PT",
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
    toast.success(`Exported ${records.length} records to CSV`);
  }

  function resetFilters() {
    setFilters({ from: weekAgoStr(), to: todayStr(), material: "ALL", vendor: "", plate: "" });
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <FileSearch className="h-4 w-4 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">Digital Archive & DO Search</h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Audit-ready weighbridge history · filter, export, and view digital DO receipts.
          </p>
        </div>
        <Button onClick={exportCSV} className="bg-gradient-gold text-primary hover:opacity-90">
          <Download className="mr-2 h-4 w-4" />
          Export to CSV / Excel
        </Button>
      </div>

      {/* Filters */}
      <Card className="shadow-card">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <Filter className="h-4 w-4" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 md:grid-cols-6">
          <div className="space-y-1.5">
            <Label className="text-xs">From</Label>
            <Input
              type="date"
              value={filters.from ?? ""}
              onChange={(e) => setFilters((f) => ({ ...f, from: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">To</Label>
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
                <SelectItem value="ALL">All materials</SelectItem>
                {ALL_MATERIALS.map((m) => (
                  <SelectItem key={m} value={m}>{MATERIAL_LABELS[m]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Vendor</Label>
            <Select
              value={filters.vendor || "ALL"}
              onValueChange={(v) => setFilters((f) => ({ ...f, vendor: v === "ALL" ? "" : v }))}
            >
              <SelectTrigger><SelectValue placeholder="All vendors" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All vendors</SelectItem>
                {vendors.map((v) => (
                  <SelectItem key={v} value={v}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5 md:col-span-1">
            <Label className="text-xs">Plate Number</Label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-8"
                placeholder="e.g. BA 1234"
                value={filters.plate ?? ""}
                onChange={(e) => setFilters((f) => ({ ...f, plate: e.target.value }))}
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

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Records" value={stats.count.toString()} />
        <StatCard
          label="Total Netto"
          value={`${stats.totalNet.toLocaleString("id-ID", { maximumFractionDigits: 2 })} MT`}
        />
        <StatCard label="Date From" value={filters.from ?? "—"} />
        <StatCard label="Date To" value={filters.to ?? "—"} />
      </div>

      {/* Table */}
      <Card className="shadow-card">
        <CardContent className="px-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-secondary/50">
                  <TableHead className="pl-6">DO Number</TableHead>
                  <TableHead>Plate</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Material</TableHead>
                  <TableHead className="text-right">Netto</TableHead>
                  <TableHead>Time In</TableHead>
                  <TableHead>Time Out</TableHead>
                  <TableHead className="pr-6 text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && (
                  <TableRow>
                    <TableCell colSpan={8} className="py-10 text-center text-sm text-muted-foreground">
                      Loading...
                    </TableCell>
                  </TableRow>
                )}
                {!isLoading && records.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="py-10 text-center text-sm text-muted-foreground">
                      No records match the current filters.
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
                      {fmtMT(r.net_weight)}
                    </TableCell>
                    <TableCell className="text-xs">{fmtDateTime(r.time_in)}</TableCell>
                    <TableCell className="text-xs">{fmtDateTime(r.time_out)}</TableCell>
                    <TableCell className="pr-6 text-right">
                      <Button size="sm" variant="outline" onClick={() => setSelected(r)}>
                        <Eye className="mr-1 h-3.5 w-3.5" />
                        View DO
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Digital Delivery Order</DialogTitle>
            <DialogDescription>
              Sah sebagai pengganti DO fisik untuk audit digital.
            </DialogDescription>
          </DialogHeader>
          {selected && <DOReceipt record={selected} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-3 shadow-card">
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-lg font-bold text-foreground">{value}</div>
    </div>
  );
}

const MATERIAL_TONE: Record<MaterialType, string> = {
  COAL: "bg-slate-700 text-white",
  BIOMASS: "bg-emerald-600 text-white",
  FABA: "bg-amber-700 text-white",
  CHEMICAL: "bg-violet-600 text-white",
  FUEL: "bg-orange-600 text-white",
};

function MaterialBadge({ m }: { m: MaterialType }) {
  return <Badge className={MATERIAL_TONE[m]}>{MATERIAL_SHORT[m]}</Badge>;
}
