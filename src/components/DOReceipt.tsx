import { useMemo } from "react";
import { QRCodeSVG } from "./QRCodeSVG";
import type { WeighbridgeRecord } from "@/lib/wb";
import { MATERIAL_LABELS, fmtDateTime } from "@/lib/wb";
import { Zap } from "lucide-react";

interface Props {
  record: WeighbridgeRecord;
}

export function DOReceipt({ record }: Props) {
  const qrValue = useMemo(
    () =>
      JSON.stringify({
        do: record.do_number,
        plate: record.plate_number,
        net: record.net_weight,
        t: record.time_out ?? record.time_in,
      }),
    [record],
  );

  return (
    <div className="rounded-lg border-2 border-primary bg-white p-6 font-mono text-[13px] text-foreground">
      {/* Header */}
      <div className="flex items-start justify-between border-b-2 border-primary pb-3">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-md bg-gradient-hero">
            <Zap className="h-5 w-5 text-pln-gold" strokeWidth={2.5} />
          </div>
          <div>
            <div className="font-sans text-sm font-bold text-primary">PT PLN NUSANTARA POWER</div>
            <div className="font-sans text-[10px] uppercase tracking-wider text-muted-foreground">
              UBP Ombilin — Digital Delivery Order
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-[10px] uppercase text-muted-foreground">DO Number</div>
          <div className="font-bold text-primary">{record.do_number ?? "-"}</div>
        </div>
      </div>

      {/* Body */}
      <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3">
        <Field label="Pemasok (Vendor)" value={record.vendor_name} />
        <Field label="PT Asal" value={record.origin_pt ?? record.vendor_name} />
        <Field label="No Polisi" value={record.plate_number} />
        <Field label="Driver" value={record.driver_name ?? "-"} />
        <Field label="Material" value={MATERIAL_LABELS[record.material_type]} />
        <Field label="Status" value={record.status} />
        <Field label="Time In (Timb. Bawah)" value={fmtDateTime(record.time_in)} />
        <Field label="Time Out (Timb. Atas)" value={fmtDateTime(record.time_out)} />
      </div>

      {/* Weights */}
      <div className="mt-4 grid grid-cols-3 gap-3 rounded-md bg-secondary p-3">
        <Weight label="BRUTO" value={record.gross_weight} />
        <Weight label="TARA" value={record.tare_weight} />
        <Weight label="NETTO" value={record.net_weight} highlight />

      </div>

      {/* Footer with QR */}
      <div className="mt-4 flex items-end justify-between border-t border-dashed border-border pt-3">
        <div className="max-w-[60%] font-sans text-[10px] leading-relaxed text-muted-foreground">
          Dokumen digital ini sah sebagai pengganti DO fisik.
          Verifikasi keaslian dengan scan QR di samping.
          <div className="mt-1 font-semibold text-foreground">
            Verified · Weighbridge Digital System
          </div>
        </div>
        <div className="rounded-md border border-border bg-white p-2">
          <QRCodeSVG value={qrValue} size={90} />
        </div>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="font-sans text-sm font-medium text-foreground">{value}</div>
    </div>
  );
}

function Weight({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div
      className={`rounded p-2 text-center ${
        highlight ? "bg-gradient-gold text-primary" : "bg-white text-foreground"
      }`}
    >
      <div className="text-[10px] uppercase tracking-wider opacity-80">{label}</div>
      <div className="text-lg font-bold">
        {Number(value).toLocaleString("id-ID", { maximumFractionDigits: 0 })}
      </div>
      <div className="text-[10px] opacity-80">Kg</div>
    </div>

  );
}
