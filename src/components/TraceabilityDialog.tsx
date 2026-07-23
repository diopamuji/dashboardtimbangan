import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useRecordDetail } from "@/lib/wb-queries";
import { MATERIAL_LABELS, fmtDateTimeShort, fmtKg } from "@/lib/wb";
import { InlineFilePreview } from "./FilePreview";

export function TraceabilityDialog({
  recordId,
  open,
  onOpenChange,
}: {
  recordId: string | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { data, isLoading } = useRecordDetail(recordId);
  const r = data?.record;
  const load = data?.load;
  const cert = data?.certificate;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Traceability Truk {r?.plate_number ?? ""}</DialogTitle>
        </DialogHeader>

        {isLoading || !r ? (
          <div className="py-10 text-center text-sm text-muted-foreground">Memuat detail...</div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            <section className="rounded-lg border border-border bg-card p-3">
              <h4 className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
                Detail Timbangan
              </h4>
              <div className="grid grid-cols-2 gap-y-1 text-xs">
                <span className="text-muted-foreground">Nomor DO</span>
                <span className="font-mono">{r.do_number ?? "—"}</span>
                <span className="text-muted-foreground">No Polisi</span>
                <span className="font-mono font-semibold">{r.plate_number}</span>
                <span className="text-muted-foreground">Pemasok</span>
                <span>{r.vendor_name}</span>
                <span className="text-muted-foreground">Material</span>
                <span>{MATERIAL_LABELS[r.material_type as keyof typeof MATERIAL_LABELS]}</span>
                <span className="text-muted-foreground">Bruto</span>
                <span className="font-mono">{fmtKg(r.gross_weight)}</span>
                <span className="text-muted-foreground">Tara</span>
                <span className="font-mono">{fmtKg(r.tare_weight)}</span>
                <span className="text-muted-foreground">Netto</span>
                <span className="font-mono font-bold text-primary">{fmtKg(r.net_weight)}</span>
                <span className="text-muted-foreground">Jam Masuk</span>
                <span>{fmtDateTimeShort(r.time_in)}</span>
                <span className="text-muted-foreground">Jam Keluar</span>
                <span>{fmtDateTimeShort(r.time_out)}</span>
              </div>
            </section>

            <section className="rounded-lg border border-border bg-card p-3">
              <h4 className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
                Scan DO
              </h4>
              <InlineFilePreview bucket="do-scans" path={r.do_file_url} />
            </section>

            <section className="rounded-lg border border-border bg-card p-3">
              <h4 className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
                Grouping Load
              </h4>
              {load ? (
                <div className="space-y-1 text-xs">
                  <div className="text-sm font-semibold">{load.name}</div>
                  <div className="text-muted-foreground">
                    Material: {MATERIAL_LABELS[load.material_type as keyof typeof MATERIAL_LABELS]}
                  </div>
                  <div className="flex gap-2 pt-1">
                    <Badge className={cert?.coa_file_url ? "bg-emerald-600 text-white" : "bg-amber-500 text-white"}>
                      COA {cert?.coa_file_url ? "Uploaded" : "Pending"}
                    </Badge>
                    <Badge className={cert?.cow_file_url ? "bg-emerald-600 text-white" : "bg-amber-500 text-white"}>
                      COW {cert?.cow_file_url ? "Uploaded" : "Pending"}
                    </Badge>
                  </div>
                  {cert && (
                    <div className="mt-2 grid grid-cols-2 gap-y-0.5 text-[11px]">
                      {cert.calorific_value && (<><span className="text-muted-foreground">Calorific</span><span>{cert.calorific_value}</span></>)}
                      {cert.moisture && (<><span className="text-muted-foreground">Moisture</span><span>{cert.moisture}</span></>)}
                      {cert.total_weight_verified && (<><span className="text-muted-foreground">Verified Weight</span><span>{cert.total_weight_verified}</span></>)}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-xs text-muted-foreground">Belum ditempelkan ke Load.</div>
              )}
            </section>

            <section className="grid grid-cols-1 gap-3 rounded-lg border border-border bg-card p-3">
              <div>
                <h4 className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Sertifikat COA</h4>
                <InlineFilePreview bucket="certificates" path={cert?.coa_file_url} />
              </div>
              <div>
                <h4 className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Sertifikat COW</h4>
                <InlineFilePreview bucket="certificates" path={cert?.cow_file_url} />
              </div>
            </section>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
