import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Download, FileSearch, Files, Filter, Loader2, Search, X } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DoArchiveCell } from "@/components/DoArchive";
import { resolveLotDoUrls } from "@/lib/wb.functions";
import { useHistory, useLots, useVendors, type HistoryFilters } from "@/lib/wb-queries";
import {
  ALL_MATERIALS,
  MATERIAL_LABELS,
  MATERIAL_SHORT,
  fmtDateTimeShort,
  fmtKg,
  type MaterialType,
  type WeighbridgeRecord,
} from "@/lib/wb";

export const Route = createFileRoute("/history")({
  component: HistoryPage,
});

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function HistoryPage() {
  const [filters, setFilters] = useState<HistoryFilters>({
    from: "",
    to: todayStr(),
    material: "ALL",
    vendor: "",
    plate: "",
    spk: "",
    lot: "ALL",
  });
  const [merging, setMerging] = useState(false);

  const { data: records = [], isLoading } = useHistory(filters);
  const { data: vendors = [] } = useVendors();
  const { data: lots = [] } = useLots();
  const resolveLot = useServerFn(resolveLotDoUrls);

  async function downloadCombinedDo() {
    const lot = filters.lot;
    if (!lot || lot === "ALL") {
      toast.error('Pilih "Lot ke-" terlebih dahulu');
      return;
    }
    setMerging(true);
    try {
      const files = (await resolveLot({ data: { lot } })) as { id: string; label: string; url: string }[];
      if (files.length === 0) {
        toast.error(`Belum ada arsip DO pada ${lot}`);
        return;
      }
      const { PDFDocument } = await import("pdf-lib");
      const merged = await PDFDocument.create();
      for (const f of files) {
        const bytes = new Uint8Array(await (await fetch(f.url)).arrayBuffer());
        const isPdf = bytes[0] === 0x25 && bytes[1] === 0x50;
        if (isPdf) {
          const src = await PDFDocument.load(bytes);
          const pages = await merged.copyPages(src, src.getPageIndices());
          pages.forEach((p) => merged.addPage(p));
        } else {
          const isPng = bytes[0] === 0x89 && bytes[1] === 0x50;
          const img = isPng ? await merged.embedPng(bytes) : await merged.embedJpg(bytes);
          const page = merged.addPage([595.28, 841.89]);
          const scale = Math.min((595.28 - 40) / img.width, (841.89 - 40) / img.height);
          const w = img.width * scale;
          const h = img.height * scale;
          page.drawImage(img, { x: (595.28 - w) / 2, y: (841.89 - h) / 2, width: w, height: h });
        }
      }
      const out = await merged.save();
      const blob = new Blob([out as BlobPart], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `paket-do-${lot.replace(/\s+/g, "-").toLowerCase()}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`${files.length} dokumen DO digabung untuk ${lot}`);
    } catch (err) {
      console.error(err);
      toast.error("Gagal menggabungkan dokumen DO");
    } finally {
      setMerging(false);
    }
  }

  async function exportExcel() {
    if (records.length === 0) {
      toast.error("Tidak ada data untuk diekspor");
      return;
    }
    try {
      const ExcelJS = (await import("exceljs")).default;
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet("Laporan Penimbangan");

      const lastColLetter = "K";


      // Header kop surat
      ws.getCell("A1").value = "PLTU OMBILIN";
      ws.getCell("A1").font = { bold: true, size: 12 };
      ws.getCell("A2").value = "JI Prof. M Yamin, SH";
      ws.getCell("A3").value = "Talawi";
      // baris 4 kosong

      // Judul utama (baris 5)
      ws.mergeCells(`A5:${lastColLetter}5`);
      const title = ws.getCell("A5");
      title.value = "Laporan Penimbangan";
      title.font = { bold: true, size: 14 };
      title.alignment = { horizontal: "center" };

      // Info filter kiri (mulai baris 7)
      const fmtDMY = (s?: string) => {
        if (!s) return "-";
        const [y, m, d] = s.split("-");
        return `${d}/${m}/${y}`;
      };
      const filterLines: string[] = [
        `Periode ${fmtDMY(filters.from)} s/d ${fmtDMY(filters.to)}`,
      ];
      if (filters.material && filters.material !== "ALL") {
        filterLines.push(`Material: ${filters.material} - ${MATERIAL_LABELS[filters.material as MaterialType] ?? filters.material}`);
      }
      if (filters.vendor) filterLines.push(`Pemasok: ${filters.vendor}`);
      if (filters.plate) filterLines.push(`No Polisi: ${filters.plate}`);
      if (filters.spk) filterLines.push(`Nomor SPK: ${filters.spk}`);

      filterLines.forEach((line, i) => {
        const c = ws.getCell(`A${7 + i}`);
        c.value = line;
        c.alignment = { horizontal: "left" };
      });

      // Tanggal cetak kanan (baris 7)
      const now = new Date();
      const pad = (n: number) => String(n).padStart(2, "0");
      const printDate = `${pad(now.getDate())}-${pad(now.getMonth() + 1)}-${now.getFullYear()}`;
      const tglCell = ws.getCell(`${lastColLetter}7`);
      tglCell.value = `Tanggal: ${printDate}`;
      tglCell.alignment = { horizontal: "right" };

      // Header tabel
      const headerRowIdx = 7 + Math.max(filterLines.length, 1) + 1;
      const headers = [
        "Nomor DO", "No Polisi", "Pemasok", "Material",
        "Bruto", "Tara", "Netto",
        "Jam Masuk", "Jam Keluar", "Status", "Urutan Kedatangan",
      ];
      const headerRow = ws.getRow(headerRowIdx);
      headers.forEach((h, i) => {
        const cell = headerRow.getCell(i + 1);
        cell.value = h;
        cell.font = { bold: true };
        cell.alignment = { horizontal: "center", vertical: "middle" };
        cell.border = {
          top: { style: "thin" }, left: { style: "thin" },
          bottom: { style: "thin" }, right: { style: "thin" },
        };
      });

      // Data rows
      const sorted = records.slice().sort((a, b) =>
        (a.time_in ?? a.created_at).localeCompare(b.time_in ?? b.created_at),
      );
      const vendorCounters = new Map<string, number>();
      sorted.forEach((r, idx) => {
        const day = (r.time_in ?? r.created_at).slice(0, 10);
        const key = `${r.vendor_name}::${day}`;
        const ord = (vendorCounters.get(key) ?? 0) + 1;
        vendorCounters.set(key, ord);
        const row = ws.getRow(headerRowIdx + 1 + idx);
        const values = [
          r.do_number ?? "",
          r.plate_number,
          r.vendor_name,
          MATERIAL_LABELS[r.material_type],
          Number(r.gross_weight),
          Number(r.tare_weight),
          Number(r.net_weight),
          fmtDateTimeShort(r.time_in),
          fmtDateTimeShort(r.time_out),
          r.status,
          `Truk #${ord}`,
        ];
        values.forEach((v, i) => {
          const cell = row.getCell(i + 1);
          cell.value = v as string | number;
          cell.border = {
            top: { style: "thin" }, left: { style: "thin" },
            bottom: { style: "thin" }, right: { style: "thin" },
          };
          if (i >= 4 && i <= 6) {
            cell.numFmt = "#,##0.00";
            cell.alignment = { horizontal: "right" };
          }
        });
      });

      // Column widths
      const widths = [16, 14, 26, 18, 14, 14, 14, 20, 20, 14, 18];
      widths.forEach((w, i) => { ws.getColumn(i + 1).width = w; });

      const buf = await wb.xlsx.writeBuffer();
      const blob = new Blob([buf], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `laporan-penimbangan-${filters.from || "all"}_${filters.to || "all"}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`${records.length} baris berhasil diekspor`);
    } catch (err) {
      console.error(err);
      toast.error("Gagal membuat file Excel");
    }
  }



  function resetFilters() {
    setFilters({ from: "", to: todayStr(), material: "ALL", vendor: "", plate: "", spk: "", lot: "ALL" });
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <FileSearch className="h-4 w-4 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">Data Historis</h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Rekap seluruh transaksi jembatan timbang PLTU Ombilin.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={downloadCombinedDo} disabled={merging}>
            {merging ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Files className="mr-2 h-4 w-4" />}
            Download Combined DO (PDF)
          </Button>
          <Button onClick={exportExcel} className="bg-gradient-gold text-primary hover:opacity-90">
            <Download className="mr-2 h-4 w-4" />
            Export to Excel
          </Button>
        </div>
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

      <DetailTable records={records} loading={isLoading} />
    </div>
  );
}

function DetailTable({
  records,
  loading,
}: {
  records: WeighbridgeRecord[];
  loading: boolean;
}) {
  return (
    <Card className="shadow-card">
      <CardContent className="px-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-secondary/50">
                <TableHead className="pl-6">Nomor DO</TableHead>
                <TableHead>No Polisi</TableHead>
                <TableHead>Pemasok</TableHead>
                <TableHead>Material</TableHead>
                <TableHead className="text-right">Bruto</TableHead>
                <TableHead className="text-right">Tara</TableHead>
                <TableHead className="text-right">Netto</TableHead>
                <TableHead>Jam Masuk</TableHead>
                <TableHead className="pr-6">Jam Keluar</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && (
                <TableRow>
                  <TableCell colSpan={9} className="py-10 text-center text-sm text-muted-foreground">
                    Memuat...
                  </TableCell>
                </TableRow>
              )}
              {!loading && records.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="py-10 text-center text-sm text-muted-foreground">
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
                  <TableCell className="text-right font-mono text-xs">{fmtKg(r.gross_weight)}</TableCell>
                  <TableCell className="text-right font-mono text-xs">{fmtKg(r.tare_weight)}</TableCell>
                  <TableCell className="text-right font-mono text-sm font-bold text-primary">
                    {fmtKg(r.net_weight)}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-xs">{fmtDateTimeShort(r.time_in)}</TableCell>
                  <TableCell className="whitespace-nowrap pr-6 text-xs">{fmtDateTimeShort(r.time_out)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
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
