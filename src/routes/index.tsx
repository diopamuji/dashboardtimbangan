import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { Truck, Users, Package, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTodayRecords } from "@/lib/wb-queries";
import {
  ALL_MATERIALS,
  MATERIAL_LABELS,
  MATERIAL_SHORT,
  type MaterialType,
} from "@/lib/wb";

export const Route = createFileRoute("/")({
  component: DashboardPage,
});

const MATERIAL_HEX: Record<MaterialType, string> = {
  COAL: "#3d3d4e",
  BIOMASS: "#4ea36b",
  FABA: "#a37a3d",
  CHEMICAL: "#8b4fbf",
  FUEL: "#d97445",
};

function DashboardPage() {
  const { data: records = [], isLoading } = useTodayRecords();

  const totals = useMemo(() => {
    const byMaterial: Record<MaterialType, number> = {
      COAL: 0, BIOMASS: 0, FABA: 0, CHEMICAL: 0, FUEL: 0,
    };
    const vendors = new Set<string>();
    for (const r of records) {
      byMaterial[r.material_type] += Number(r.net_weight);
      vendors.add(r.vendor_name);
    }
    const totalNet = Object.values(byMaterial).reduce((a, b) => a + b, 0);
    return { byMaterial, totalTrucks: records.length, vendors: vendors.size, totalNet };
  }, [records]);

  const perVendor = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of records) {
      map.set(r.vendor_name, (map.get(r.vendor_name) ?? 0) + Number(r.net_weight));
    }
    return Array.from(map, ([vendor, mt]) => ({ vendor, mt: Number(mt.toFixed(2)) }))
      .sort((a, b) => b.mt - a.mt);
  }, [records]);

  const hourly = useMemo(() => {
    const arr = Array.from({ length: 24 }, (_, h) => ({ hour: `${String(h).padStart(2, "0")}:00`, trucks: 0 }));
    for (const r of records) {
      const t = r.time_in ?? r.created_at;
      const h = new Date(t).getHours();
      arr[h].trucks += 1;
    }
    return arr;
  }, [records]);

  const materialRatio = useMemo(
    () =>
      ALL_MATERIALS.map((m) => ({
        name: MATERIAL_SHORT[m],
        value: Number(totals.byMaterial[m].toFixed(2)),
        material: m,
      })).filter((d) => d.value > 0),
    [totals],
  );

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Hero */}
      <div className="rounded-xl bg-gradient-hero p-5 text-white shadow-elevated md:p-7">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-widest text-pln-gold">Real-Time Overview</p>
            <h1 className="mt-1 text-2xl font-bold md:text-3xl">
              Weighbridge Dashboard —{" "}
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
          <div className="rounded-lg bg-white/10 px-4 py-3 backdrop-blur">
            <div className="text-xs uppercase tracking-wider text-white/70">Total Netto Today</div>
            <div className="text-3xl font-bold text-pln-gold">
              {totals.totalNet.toLocaleString("id-ID", { maximumFractionDigits: 2 })}{" "}
              <span className="text-lg font-medium text-white/80">MT</span>
            </div>
          </div>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Trucks Arrived" value={totals.totalTrucks.toString()} icon={<Truck className="h-4 w-4" />} accent />
        <Kpi label="Active Vendors" value={totals.vendors.toString()} icon={<Users className="h-4 w-4" />} />
        <Kpi
          label="Total Coal (MT)"
          value={totals.byMaterial.COAL.toLocaleString("id-ID", { maximumFractionDigits: 1 })}
          icon={<Package className="h-4 w-4" />}
        />
        <Kpi
          label="Total Biomass (MT)"
          value={totals.byMaterial.BIOMASS.toLocaleString("id-ID", { maximumFractionDigits: 1 })}
          icon={<TrendingUp className="h-4 w-4" />}
        />
      </div>

      {/* Material breakdown mini-cards */}
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
              {totals.byMaterial[m].toLocaleString("id-ID", { maximumFractionDigits: 1 })}
              <span className="ml-1 text-xs font-medium text-muted-foreground">MT</span>
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Volume per Vendor (Netto MT)</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            {perVendor.length === 0 ? (
              <EmptyChart loading={isLoading} />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={perVendor} layout="vertical" margin={{ left: 20, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" horizontal={false} />
                  <XAxis type="number" fontSize={11} stroke="var(--color-muted-foreground)" />
                  <YAxis dataKey="vendor" type="category" width={140} fontSize={11} stroke="var(--color-muted-foreground)" />
                  <Tooltip
                    contentStyle={{ borderRadius: 8, border: "1px solid var(--color-border)" }}
                    formatter={(v: number) => [`${v} MT`, "Netto"]}
                  />
                  <Bar dataKey="mt" fill="var(--pln-blue)" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Material Ratio Today</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            {materialRatio.length === 0 ? (
              <EmptyChart loading={isLoading} />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={materialRatio}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={55}
                    outerRadius={95}
                    paddingAngle={2}
                  >
                    {materialRatio.map((d) => (
                      <Cell key={d.material} fill={MATERIAL_HEX[d.material]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => [`${v} MT`, "Netto"]} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="text-sm font-semibold">
            Hourly Truck Arrivals — Peak Load Monitor
          </CardTitle>
        </CardHeader>
        <CardContent className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={hourly}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="hour" fontSize={11} stroke="var(--color-muted-foreground)" />
              <YAxis fontSize={11} stroke="var(--color-muted-foreground)" allowDecimals={false} />
              <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid var(--color-border)" }} />
              <Line
                type="monotone"
                dataKey="trucks"
                stroke="var(--pln-gold)"
                strokeWidth={3}
                dot={{ r: 3, fill: "var(--pln-navy)" }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
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
      <div className={`mt-2 text-3xl font-bold ${accent ? "text-primary" : "text-foreground"}`}>
        {value}
      </div>
    </div>
  );
}

function EmptyChart({ loading }: { loading: boolean }) {
  return (
    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
      {loading ? "Loading data..." : "No data yet today"}
    </div>
  );
}
