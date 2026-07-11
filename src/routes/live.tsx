import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { AlertTriangle, Radio, Truck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useTodayRecords } from "@/lib/wb-queries";
import {
  MATERIAL_LABELS,
  MATERIAL_SHORT,
  SAMPLING_INTERVAL,
  computeSampling,
  fmtMT,
  fmtTime,
  type MaterialType,
} from "@/lib/wb";

export const Route = createFileRoute("/live")({
  component: LiveMonitorPage,
});

const MATERIAL_TONE: Record<MaterialType, string> = {
  COAL: "bg-slate-700 text-white",
  BIOMASS: "bg-emerald-600 text-white",
  FABA: "bg-amber-700 text-white",
  CHEMICAL: "bg-violet-600 text-white",
  FUEL: "bg-orange-600 text-white",
};

function LiveMonitorPage() {
  const { data: records = [], isLoading } = useTodayRecords();

  const sampling = useMemo(() => computeSampling(records), [records]);

  const alerts = useMemo(
    () =>
      records
        .filter((r) => sampling.get(r.id)?.sampling)
        .sort((a, b) => (b.time_in ?? "").localeCompare(a.time_in ?? "")),
    [records, sampling],
  );

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Radio className="h-4 w-4 text-emerald-600" />
            <h1 className="text-2xl font-bold text-foreground">Live Truck Monitor</h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Live weighbridge movements · Coal sampling counter resets daily per vendor · Sampling every{" "}
            <strong>{SAMPLING_INTERVAL}th</strong> coal truck.
          </p>
        </div>
        <div className="flex gap-2">
          <StatChip icon={<Truck className="h-3.5 w-3.5" />} label="Total Trucks" value={records.length} />
          <StatChip
            icon={<AlertTriangle className="h-3.5 w-3.5" />}
            label="Active Alerts"
            value={alerts.length}
            danger
          />
        </div>
      </div>

      {/* Sampling alerts strip */}
      {alerts.length > 0 && (
        <Card className="border-destructive/40 bg-destructive/5 shadow-card">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold text-destructive">
              <AlertTriangle className="h-4 w-4 animate-pulse" />
              SAMPLING MANUAL WAJIB — Hubungi Pihak Terkait (Surveyor · TNI · PLN · Pemasok)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {alerts.map((r) => {
                const s = sampling.get(r.id)!;
                return (
                  <div
                    key={r.id}
                    className="animate-pulse-alert flex items-center gap-2 rounded-md border border-destructive/50 bg-white px-3 py-2 text-xs"
                  >
                    <span className="font-mono font-bold text-destructive">#{s.ordinal}</span>
                    <span className="font-semibold text-foreground">{r.plate_number}</span>
                    <span className="text-muted-foreground">·</span>
                    <span className="text-muted-foreground">{r.vendor_name}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Truck table */}
      <Card className="shadow-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">
            Truck Movements Today ({records.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="px-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-secondary/50">
                  <TableHead className="pl-6">No Polisi</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Material</TableHead>
                  <TableHead className="text-right">Gross</TableHead>
                  <TableHead className="text-right">Tare</TableHead>
                  <TableHead className="text-right">Netto</TableHead>
                  <TableHead>Time In</TableHead>
                  <TableHead>Time Out</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="pr-6">Sampling</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && (
                  <TableRow>
                    <TableCell colSpan={10} className="py-10 text-center text-sm text-muted-foreground">
                      Loading live data...
                    </TableCell>
                  </TableRow>
                )}
                {!isLoading && records.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={10} className="py-10 text-center text-sm text-muted-foreground">
                      No truck movements recorded today.
                    </TableCell>
                  </TableRow>
                )}
                {records.map((r) => {
                  const s = sampling.get(r.id);
                  const isAlert = s?.sampling === true;
                  return (
                    <TableRow
                      key={r.id}
                      className={isAlert ? "bg-destructive/5" : ""}
                    >
                      <TableCell className="pl-6 font-mono font-semibold">{r.plate_number}</TableCell>
                      <TableCell className="max-w-[180px] truncate">{r.vendor_name}</TableCell>
                      <TableCell>
                        <Badge className={MATERIAL_TONE[r.material_type]}>
                          {MATERIAL_SHORT[r.material_type]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs">{fmtMT(r.gross_weight)}</TableCell>
                      <TableCell className="text-right font-mono text-xs">{fmtMT(r.tare_weight)}</TableCell>
                      <TableCell className="text-right font-mono text-sm font-bold text-primary">
                        {fmtMT(r.net_weight)}
                      </TableCell>
                      <TableCell className="text-xs">{fmtTime(r.time_in)}</TableCell>
                      <TableCell className="text-xs">{fmtTime(r.time_out)}</TableCell>
                      <TableCell>
                        <StatusBadge status={r.status} />
                      </TableCell>
                      <TableCell className="pr-6">
                        {r.material_type !== "COAL" ? (
                          <span className="text-xs text-muted-foreground">—</span>
                        ) : isAlert ? (
                          <div className="animate-pulse-alert inline-flex items-center gap-1.5 rounded-md border border-destructive bg-destructive px-2 py-1 text-[11px] font-bold text-destructive-foreground">
                            <AlertTriangle className="h-3 w-3" />
                            WAJIB #{s?.ordinal}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            #{s?.ordinal ?? "-"} of {SAMPLING_INTERVAL}
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Sampling explainer */}
      <Card className="border-accent/40 bg-pln-gold-soft/40">
        <CardContent className="flex gap-3 py-4 text-xs text-foreground">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <p>
            <strong>Coal Sampling Rule:</strong> Setiap load selesai ±1.250 MT (rata-rata 37–40 truk).
            Sampling manual dilakukan setiap truk ke-{SAMPLING_INTERVAL}. Counter direset harian per vendor
            berdasarkan waktu masuk. Ketika alert muncul, hubungi Surveyor, TNI, PLN, dan Pemasok untuk
            koordinasi sampling.
          </p>
        </CardContent>
      </Card>

      {/* Material legend */}
      <div className="flex flex-wrap gap-2 text-[11px] text-muted-foreground">
        {Object.entries(MATERIAL_LABELS).map(([k, v]) => (
          <span key={k} className="flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1">
            <Badge className={MATERIAL_TONE[k as MaterialType]}>{MATERIAL_SHORT[k as MaterialType]}</Badge>
            {v}
          </span>
        ))}
      </div>
    </div>
  );
}

function StatChip({
  icon,
  label,
  value,
  danger,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  danger?: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-2 rounded-lg border px-3 py-2 shadow-card ${
        danger ? "border-destructive/40 bg-destructive/10 text-destructive" : "border-border bg-card"
      }`}
    >
      {icon}
      <div className="flex items-baseline gap-1.5">
        <span className="text-lg font-bold">{value}</span>
        <span className="text-[11px] uppercase tracking-wider opacity-70">{label}</span>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const s = status.toUpperCase();
  if (s === "COMPLETED")
    return <Badge className="bg-emerald-600 text-white">Completed</Badge>;
  if (s === "IN_PROGRESS")
    return <Badge className="bg-amber-500 text-white">In Progress</Badge>;
  return <Badge variant="secondary">{status}</Badge>;
}
