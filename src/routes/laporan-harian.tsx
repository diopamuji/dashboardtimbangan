import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ClipboardList, Printer } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useDayRecords } from "@/lib/wb-queries";
import { ALL_MATERIALS, MATERIAL_LABELS, fmtKg, type MaterialType, type WeighbridgeRecord } from "@/lib/wb";

export const Route = createFileRoute("/laporan-harian")({
  head: () => ({
    meta: [
      { title: "Laporan Penerimaan Harian — PLTU Ombilin" },
      {
        name: "description",
        content:
          "Rekap penutupan timbangan harian PLTU Ombilin per material, pemasok, dan nomor Lot lengkap dengan total truk dan netto.",
      },
      { property: "og:title", content: "Laporan Penerimaan Harian — PLTU Ombilin" },
      {
        property: "og:description",
        content: "Rekap penutupan timbangan harian per material, pemasok, dan Lot.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: LaporanHarianPage,
});

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

interface GroupRow {
  vendor: string;
  lot: string;
  trucks: number;
  netto: number;
}

function buildGroups(records: WeighbridgeRecord[]) {
  const byMaterial = new Map<MaterialType, GroupRow[]>();
  for (const m of ALL_MATERIALS) byMaterial.set(m, []);
  const keyed = new Map<string, GroupRow>();
  for (const r of records) {
    const lot = r.lot_number ?? "Tanpa Lot";
    const key = `${r.material_type}::${r.vendor_name}::${lot}`;
    let row = keyed.get(key);
    if (!row) {
      row = { vendor: r.vendor_name, lot, trucks: 0, netto: 0 };
      keyed.set(key, row);
      byMaterial.get(r.material_type)?.push(row);
    }
    row.trucks += 1;
    row.netto += Number(r.net_weight) || 0;
  }
  for (const rows of byMaterial.values()) {
    rows.sort((a, b) => a.vendor.localeCompare(b.vendor) || a.lot.localeCompare(b.lot, "id", { numeric: true }));
  }
  return byMaterial;
}

function LaporanHarianPage() {
  const [day, setDay] = useState(todayStr());
  const { data: records = [], isLoading } = useDayRecords(day);

  const groups = useMemo(() => buildGroups(records), [records]);
  const grandTrucks = records.length;
  const grandNetto = records.reduce((s, r) => s + (Number(r.net_weight) || 0), 0);

  const dayLabel = (() => {
    const [y, m, d] = day.split("-");
    return `${d}-${m}-${y}`;
  })();

  return (
    <div className="space-y-6 p-4 md:p-6 print:p-0">
      <div className="flex flex-wrap items-end justify-between gap-3 print:hidden">
        <div>
          <div className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">Laporan Penerimaan Harian</h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Rekap penutupan timbangan per material, pemasok, dan nomor Lot.
          </p>
        </div>
        <div className="flex items-end gap-2">
          <div className="space-y-1.5">
            <Label className="text-xs">Tanggal Laporan</Label>
            <Input type="date" value={day} onChange={(e) => setDay(e.target.value)} />
          </div>
          <Button onClick={() => window.print()} className="bg-gradient-gold text-primary hover:opacity-90">
            <Printer className="mr-2 h-4 w-4" />
            Cetak Laporan / Export PDF
          </Button>
        </div>
      </div>

      <div className="hidden text-center print:block">
        <h1 className="text-lg font-bold">PLTU OMBILIN — Laporan Penerimaan Harian</h1>
        <p className="text-sm">Rekap Penutupan Timbangan · {dayLabel}</p>
      </div>

      {isLoading && (
        <Card className="shadow-card">
          <CardContent className="py-10 text-center text-sm text-muted-foreground">Memuat laporan...</CardContent>
        </Card>
      )}

      {!isLoading &&
        ALL_MATERIALS.map((m) => {
          const rows = groups.get(m) ?? [];
          if (rows.length === 0) return null;
          const subTrucks = rows.reduce((s, r) => s + r.trucks, 0);
          const subNetto = rows.reduce((s, r) => s + r.netto, 0);
          return (
            <Card key={m} className="shadow-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold uppercase tracking-wide">
                  Material: {MATERIAL_LABELS[m]}
                </CardTitle>
              </CardHeader>
              <CardContent className="px-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-secondary/50">
                      <TableHead className="w-10 pl-6">No</TableHead>
                      <TableHead>Nama Pemasok (PT / CV)</TableHead>
                      <TableHead>Lot ke-</TableHead>
                      <TableHead className="text-center">Jumlah Truk</TableHead>
                      <TableHead className="pr-6 text-right">Total Netto</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((r, i) => (
                      <TableRow key={`${r.vendor}-${r.lot}`}>
                        <TableCell className="pl-6 text-xs text-muted-foreground">{i + 1}</TableCell>
                        <TableCell className="font-medium">{r.vendor}</TableCell>
                        <TableCell className="font-semibold">{r.lot}</TableCell>
                        <TableCell className="text-center">
                          <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-full border border-border bg-secondary px-2 text-xs font-bold">
                            {r.trucks}
                          </span>
                        </TableCell>
                        <TableCell className="pr-6 text-right font-mono text-sm font-bold text-primary">
                          {fmtKg(r.netto)}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-secondary/40">
                      <TableCell colSpan={3} className="pl-6 text-xs font-semibold uppercase">
                        Subtotal {MATERIAL_LABELS[m]}
                      </TableCell>
                      <TableCell className="text-center text-sm font-bold">{subTrucks} Truk</TableCell>
                      <TableCell className="pr-6 text-right font-mono text-sm font-bold">{fmtKg(subNetto)}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          );
        })}

      {!isLoading && records.length === 0 && (
        <Card className="shadow-card">
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Tidak ada penerimaan material pada tanggal {dayLabel}.
          </CardContent>
        </Card>
      )}

      {!isLoading && records.length > 0 && (
        <Card className="border-primary/40 bg-secondary/40 shadow-card">
          <CardContent className="flex flex-wrap items-center justify-between gap-4 py-4">
            <span className="text-sm font-bold uppercase tracking-wide">Grand Total Harian ({dayLabel})</span>
            <div className="flex items-center gap-6">
              <div className="text-right">
                <p className="text-[11px] uppercase text-muted-foreground">Total Mobil</p>
                <p className="text-lg font-bold">{grandTrucks} Truk</p>
              </div>
              <div className="text-right">
                <p className="text-[11px] uppercase text-muted-foreground">Total Netto</p>
                <p className="font-mono text-lg font-bold text-primary">{fmtKg(grandNetto)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
