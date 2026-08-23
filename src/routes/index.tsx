import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { Truck, Users, Radio, Building2, ClipboardEdit } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DoArchiveCell, OperasiTimbanganDialog } from "@/components/DoArchive";
import { useMonthRecords, useTodayRecords, useYearRecords } from "@/lib/wb-queries";
import {
  ALL_MATERIALS,
  MATERIAL_LABELS,
  MATERIAL_SHORT,
  computeVendorArrival,
  fmtDateTimeShort,
  fmtKg,
  kgToMT,
  type MaterialType,
  type WeighbridgeRecord,
} from "@/lib/wb";


export const Route = createFileRoute("/")({
  component: DashboardPage,
});

const MATERIAL_HEX: Record<MaterialType, string> = {
  COAL: "#3d3d4e",
  REJECT_COAL: "#991b1b",
  BIOMASS: "#4ea36b",
  FABA: "#a37a3d",
  CHEMICAL: "#8b4fbf",
  FUEL: "#d97445",
};

const MATERIAL_TONE: Record<MaterialType, string> = {
  COAL: "bg-slate-700 text-white",
  REJECT_COAL: "bg-red-700 text-white",
  BIOMASS: "bg-emerald-600 text-white",
  FABA: "bg-amber-700 text-white",
  CHEMICAL: "bg-violet-600 text-white",
  FUEL: "bg-orange-600 text-white",
};

// A small palette used to color per-vendor slices in donut charts
const VENDOR_PALETTE = [
  "#1e3a8a", "#c8a437", "#4ea36b", "#8b4fbf", "#d97445",
  "#2563eb", "#0ea5e9", "#a3541e", "#ca8a04", "#065f46",
];

function DashboardPage() {
  const { data: todayRecords = [], isLoading } = useTodayRecords();
  const { data: monthRecords = [] } = useMonthRecords();
  const { data: yearRecords = [] } = useYearRecords();

  const totals = useMemo(() => {
    const byMaterial: Record<MaterialType, number> = {
      COAL: 0, REJECT_COAL: 0, BIOMASS: 0, FABA: 0, CHEMICAL: 0, FUEL: 0,
    };
    const vendors = new Set<string>();
    for (const r of todayRecords) {
      byMaterial[r.material_type] += Number(r.net_weight);
      vendors.add(r.vendor_name);
    }
    return { byMaterial, totalTrucks: todayRecords.length, vendors: vendors.size };
  }, [todayRecords]);

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Hero */}
      <div className="rounded-xl bg-gradient-hero p-5 text-white shadow-elevated md:p-7">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-widest text-pln-gold">Ringkasan Real-Time</p>
            <h1 className="mt-1 text-2xl font-bold md:text-3xl">
              Dashboard Jembatan Timbang —{" "}
              <span className="text-pln-gold">PLTU Ombilin</span>
            </h1>
            <p className="mt-1 text-sm text-white/70">
              {new Date().toLocaleDateString("id-ID", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-white/10 px-4 py-3 text-sm backdrop-blur">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-70" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
            </span>
            Live sync · tiap 10 detik
          </div>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Kpi label="Truk Datang Hari Ini" value={totals.totalTrucks.toString()} icon={<Truck className="h-4 w-4" />} accent />
        <Kpi label="Pemasok Aktif" value={totals.vendors.toString()} icon={<Users className="h-4 w-4" />} />
      </div>


      {/* Material breakdown mini-cards (only 4 allowed materials) */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {ALL_MATERIALS.map((m) => (
          <div key={m} className="rounded-lg border border-border bg-card p-3 shadow-card">
            <div className="flex items-center gap-2">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: MATERIAL_HEX[m] }}
              />
              <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                {MATERIAL_LABELS[m]}
              </span>
            </div>
            <div className="mt-1 text-xl font-bold text-foreground">
              {fmtKg(totals.byMaterial[m])}
            </div>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <VolumePerVendorCard
          todayRecords={todayRecords}
          monthRecords={monthRecords}
          yearRecords={yearRecords}
          loading={isLoading}
        />
        <RatioPerPemasokCard
          todayRecords={todayRecords}
          monthRecords={monthRecords}
        />
      </div>

      {/* Vehicle counter per PT (immediately after Timbangan 1) */}
      <VehicleCounterCard records={todayRecords} />

      {/* Live truck movements table (merged into dashboard) */}
      <TruckMovementsCard records={todayRecords} loading={isLoading} />
    </div>
  );
}

/* ---------- Volume per Vendor (MT) with time-period toggle ---------- */

function VolumePerVendorCard({
  todayRecords,
  monthRecords,
  yearRecords,
  loading,
}: {
  todayRecords: WeighbridgeRecord[];
  monthRecords: WeighbridgeRecord[];
  yearRecords: WeighbridgeRecord[];
  loading: boolean;
}) {
  const [range, setRange] = useState<"today" | "month" | "year">("today");
  const source =
    range === "today" ? todayRecords : range === "month" ? monthRecords : yearRecords;

  const data = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of source) {
      map.set(r.vendor_name, (map.get(r.vendor_name) ?? 0) + Number(r.net_weight));
    }
    return Array.from(map, ([vendor, kg]) => ({
      vendor,
      mt: Number(kgToMT(kg).toFixed(2)),
    })).sort((a, b) => b.mt - a.mt);
  }, [source]);

  return (
    <Card className="shadow-card">
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-3">
        <CardTitle className="text-sm font-semibold">Volume per Pemasok (Netto MT)</CardTitle>
        <Tabs value={range} onValueChange={(v) => setRange(v as typeof range)}>
          <TabsList className="h-8">
            <TabsTrigger value="today" className="h-6 text-xs">Hari Ini</TabsTrigger>
            <TabsTrigger value="month" className="h-6 text-xs">Bulan Ini</TabsTrigger>
            <TabsTrigger value="year" className="h-6 text-xs">Tahun Ini</TabsTrigger>
          </TabsList>
        </Tabs>
      </CardHeader>
      <CardContent className="h-80">
        {data.length === 0 ? (
          <EmptyChart loading={loading} />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ left: 20, right: 40 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" horizontal={false} />
              <XAxis type="number" fontSize={11} stroke="var(--color-muted-foreground)" />
              <YAxis dataKey="vendor" type="category" width={140} fontSize={11} stroke="var(--color-muted-foreground)" />
              <Tooltip
                contentStyle={{ borderRadius: 8, border: "1px solid var(--color-border)" }}
                formatter={(v: number) => [`${v} MT`, "Netto"]}
              />
              <Bar dataKey="mt" fill="var(--pln-blue)" radius={[0, 6, 6, 0]}
                label={{ position: "right", fontSize: 10, formatter: (v: number) => `${v} MT` }}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

/* ---------- Rasio per Pemasok donut (Bara vs Biomassa, Harian Kg / Bulanan MT) ---------- */

function RatioPerPemasokCard({
  todayRecords,
  monthRecords,
}: {
  todayRecords: WeighbridgeRecord[];
  monthRecords: WeighbridgeRecord[];
}) {
  const [material, setMaterial] = useState<"COAL" | "BIOMASS">("COAL");
  const [period, setPeriod] = useState<"day" | "month">("day");

  const { data, unit } = useMemo(() => {
    const src = period === "day" ? todayRecords : monthRecords;
    const filtered = src.filter((r) => r.material_type === material);
    const map = new Map<string, number>();
    for (const r of filtered) {
      map.set(r.vendor_name, (map.get(r.vendor_name) ?? 0) + Number(r.net_weight));
    }
    const rows = Array.from(map, ([vendor, kg]) => {
      const val = period === "day" ? kg : kgToMT(kg);
      return {
        name: vendor,
        value: Number(val.toFixed(period === "day" ? 0 : 2)),
      };
    })
      .filter((d) => d.value > 0)
      .sort((a, b) => b.value - a.value);
    return { data: rows, unit: period === "day" ? "Kg" : "MT" };
  }, [material, period, todayRecords, monthRecords]);

  return (
    <Card className="shadow-card">
      <CardHeader className="space-y-2 pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm font-semibold">
            Rasio {material === "COAL" ? "Batubara" : "Biomassa"} per Pemasok
          </CardTitle>
          <Tabs value={period} onValueChange={(v) => setPeriod(v as typeof period)}>
            <TabsList className="h-8">
              <TabsTrigger value="day" className="h-6 text-xs">Harian (Kg)</TabsTrigger>
              <TabsTrigger value="month" className="h-6 text-xs">Bulanan (MT)</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        <Tabs value={material} onValueChange={(v) => setMaterial(v as typeof material)}>
          <TabsList className="h-8">
            <TabsTrigger value="COAL" className="h-6 text-xs">Bara</TabsTrigger>
            <TabsTrigger value="BIOMASS" className="h-6 text-xs">Biomassa</TabsTrigger>
          </TabsList>
        </Tabs>
      </CardHeader>
      <CardContent className="h-80">
        {data.length === 0 ? (
          <EmptyChart loading={false} />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                innerRadius={55}
                outerRadius={100}
                paddingAngle={2}
                label={({ value }) =>
                  `${Number(value).toLocaleString("id-ID")} ${unit}`
                }
                labelLine={false}
                fontSize={10}
              >
                {data.map((_d, i) => (
                  <Cell key={i} fill={VENDOR_PALETTE[i % VENDOR_PALETTE.length]} />
                ))}
              </Pie>
              <Tooltip
                formatter={(v: number) => [`${Number(v).toLocaleString("id-ID")} ${unit}`, "Netto"]}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

/* ---------- Vehicle counter per PT/CV ---------- */

function VehicleCounterCard({ records }: { records: WeighbridgeRecord[] }) {
  const counters = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of records) {
      const key = r.origin_pt ?? r.vendor_name;
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return Array.from(map, ([name, count]) => ({ name, count })).sort(
      (a, b) => b.count - a.count,
    );
  }, [records]);

  return (
    <Card className="shadow-card">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <Building2 className="h-4 w-4 text-primary" />
          Nama PT/CV & Jumlah Kedatangan Truk Hari Ini
        </CardTitle>
      </CardHeader>
      <CardContent>
        {counters.length === 0 ? (
          <div className="py-6 text-center text-sm text-muted-foreground">
            Belum ada kedatangan truk hari ini.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {counters.map((c) => (
              <div
                key={c.name}
                className="flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2.5"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="truncate text-sm font-medium text-foreground">
                    {c.name}
                  </span>
                </div>
                <span className="ml-3 flex h-7 min-w-[2.25rem] items-center justify-center rounded-md bg-gradient-gold px-2 text-sm font-bold text-primary">
                  {c.count}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ---------- Truck Movements Today (merged live monitor) ---------- */

function TruckMovementsCard({
  records,
  loading,
}: {
  records: WeighbridgeRecord[];
  loading: boolean;
}) {
  const arrival = useMemo(() => computeVendorArrival(records), [records]);

  return (
    <Card className="shadow-card">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <Radio className="h-4 w-4 text-emerald-600" />
          Live Time Monitor — Pergerakan Truk Hari Ini ({records.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="px-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-secondary/50">
                <TableHead className="pl-6">Nomor DO</TableHead>
                <TableHead>Lot ke-</TableHead>
                <TableHead>No Polisi</TableHead>
                <TableHead>Pemasok</TableHead>
                <TableHead>Material</TableHead>
                <TableHead className="text-right">Bruto</TableHead>
                <TableHead className="text-right">Tara</TableHead>
                <TableHead className="text-right">Netto</TableHead>
                <TableHead>Jam Masuk</TableHead>
                <TableHead>Jam Keluar</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Arsip DO</TableHead>
                <TableHead>Urutan Kedatangan</TableHead>
                <TableHead className="pr-6">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && (
                <TableRow>
                  <TableCell colSpan={14} className="py-10 text-center text-sm text-muted-foreground">
                    Memuat data live...
                  </TableCell>
                </TableRow>
              )}
              {!loading && records.length === 0 && (
                <TableRow>
                  <TableCell colSpan={14} className="py-10 text-center text-sm text-muted-foreground">
                    Belum ada pergerakan truk hari ini.
                  </TableCell>
                </TableRow>
              )}
              {records.map((r) => (
                <TruckRow key={r.id} r={r} ord={arrival.get(r.id)} />
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

function TruckRow({ r, ord }: { r: WeighbridgeRecord; ord?: number }) {
  const [open, setOpen] = useState(false);
  const hasNet = Number(r.net_weight) > 0 && !!r.time_out;

  return (
    <TableRow>
      <TableCell className="pl-6 font-mono text-xs">{r.do_number ?? "—"}</TableCell>
      <TableCell className="whitespace-nowrap text-xs font-semibold">
        {r.lot_number ?? <span className="text-muted-foreground">—</span>}
      </TableCell>
      <TableCell className="font-mono font-semibold">{r.plate_number}</TableCell>
      <TableCell className="max-w-[180px] truncate">{r.vendor_name}</TableCell>
      <TableCell>
        <Badge className={MATERIAL_TONE[r.material_type]}>{MATERIAL_SHORT[r.material_type]}</Badge>
      </TableCell>
      <TableCell className="text-right font-mono text-xs">{fmtKg(r.gross_weight)}</TableCell>
      <TableCell className="text-right font-mono text-xs">{fmtKg(r.tare_weight)}</TableCell>
      <TableCell className="text-right font-mono text-sm font-bold text-primary">
        {fmtKg(r.net_weight)}
      </TableCell>
      <TableCell className="whitespace-nowrap text-xs">{fmtDateTimeShort(r.time_in)}</TableCell>
      <TableCell className="whitespace-nowrap text-xs">{fmtDateTimeShort(r.time_out)}</TableCell>
      <TableCell>
        {hasNet ? (
          <Badge className="bg-emerald-600 text-white">Completed</Badge>
        ) : (
          <Badge className="bg-amber-500 text-white">In Progress</Badge>
        )}
      </TableCell>
      <TableCell>
        <DoArchiveCell record={r} />
      </TableCell>
      <TableCell>
        <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-secondary px-2 py-1 text-[11px] font-semibold text-foreground">
          Truk #{ord ?? "-"}
        </span>
      </TableCell>
      <TableCell className="pr-6">
        <Button variant="outline" size="sm" className="h-7 gap-1 text-[11px]" onClick={() => setOpen(true)}>
          <ClipboardEdit className="h-3.5 w-3.5" />
          Operasi Timbangan
        </Button>
        {open && <OperasiTimbanganDialog record={r} open={open} onOpenChange={setOpen} />}
      </TableCell>
    </TableRow>
  );
}


function Kpi({
  label,
  value,
  icon,
  accent,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-4 shadow-card ${
        accent ? "border-transparent bg-gradient-gold text-primary" : "border-border bg-card"
      }`}
    >
      <div className="flex items-center justify-between">
        <span className={`text-xs font-medium uppercase tracking-wider ${accent ? "text-primary/80" : "text-muted-foreground"}`}>
          {label}
        </span>
        <span
          className={`flex h-8 w-8 items-center justify-center rounded-md ${
            accent ? "bg-primary/10 text-primary" : "bg-secondary text-primary"
          }`}
        >
          {icon}
        </span>
      </div>
      <div className={`mt-2 text-2xl font-bold ${accent ? "text-primary" : "text-foreground"}`}>
        {value}
      </div>
    </div>
  );
}

function EmptyChart({ loading }: { loading: boolean }) {
  return (
    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
      {loading ? "Memuat data..." : "Belum ada data"}
    </div>
  );
}
