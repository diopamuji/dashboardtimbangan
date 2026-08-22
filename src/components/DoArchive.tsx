import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { FileCheck2, FileClock, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { resolveDoUrl, saveWeighbridgeMeta, uploadDoScan } from "@/lib/wb.functions";
import type { WeighbridgeRecord } from "@/lib/wb";

function isPdf(url: string) {
  return url.toLowerCase().includes(".pdf");
}

/** Badge status arsip DO — klik untuk melihat preview dokumen. */
export function DoArchiveCell({ record }: { record: WeighbridgeRecord }) {
  const [open, setOpen] = useState(false);
  const uploaded = !!record.do_file_url;

  return (
    <>
      <button
        type="button"
        onClick={() => uploaded && setOpen(true)}
        className={uploaded ? "cursor-pointer" : "cursor-default"}
        title={uploaded ? "Lihat arsip DO" : "Arsip DO belum diunggah"}
      >
        {uploaded ? (
          <Badge className="gap-1 bg-emerald-600 text-white hover:bg-emerald-700">
            <FileCheck2 className="h-3.5 w-3.5" />
            Uploaded
          </Badge>
        ) : (
          <Badge variant="outline" className="gap-1 border-amber-500 text-amber-600">
            <FileClock className="h-3.5 w-3.5" />
            Pending
          </Badge>
        )}
      </button>
      {open && <DoPreviewDialog record={record} open={open} onOpenChange={setOpen} />}
    </>
  );
}

function DoPreviewDialog({
  record,
  open,
  onOpenChange,
}: {
  record: WeighbridgeRecord;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const resolveFn = useServerFn(resolveDoUrl);
  const { data, isLoading } = useQuery({
    queryKey: ["do-url", record.do_file_url],
    queryFn: async () => (await resolveFn({ data: { url: record.do_file_url! } })) as { url: string | null },
    enabled: !!record.do_file_url,
  });
  const url = data?.url ?? null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-auto">
        <DialogHeader>
          <DialogTitle>Arsip DO — {record.do_number ?? "Tanpa Nomor DO"}</DialogTitle>
          <DialogDescription>
            {record.plate_number} · {record.vendor_name} · {record.lot_number ?? "Lot belum diisi"}
          </DialogDescription>
        </DialogHeader>
        {isLoading && (
          <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Memuat dokumen...
          </div>
        )}
        {!isLoading && !url && (
          <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
            Dokumen tidak dapat dibuka.
          </div>
        )}
        {url &&
          (isPdf(url) ? (
            <iframe src={url} title="Arsip DO" className="h-[70vh] w-full rounded-md border border-border" />
          ) : (
            <img
              src={url}
              alt={`Scan DO ${record.do_number ?? record.plate_number}`}
              loading="lazy"
              className="w-full rounded-md border border-border bg-white"
            />
          ))}
        {url && (
          <div className="flex justify-end">
            <Button asChild variant="outline" size="sm">
              <a href={url} target="_blank" rel="noreferrer">Buka di tab baru</a>
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/** Dialog operasi timbangan: isi Lot ke-, Nomor Tiket, dan scan/upload berkas DO. */
export function OperasiTimbanganDialog({
  record,
  open,
  onOpenChange,
}: {
  record: WeighbridgeRecord;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const qc = useQueryClient();
  const saveFn = useServerFn(saveWeighbridgeMeta);
  const uploadFn = useServerFn(uploadDoScan);
  const [lot, setLot] = useState(record.lot_number ?? "");
  const [ticket, setTicket] = useState(record.ticket_number ?? "");
  const [file, setFile] = useState<File | null>(null);

  const mutation = useMutation({
    mutationFn: async () => {
      await saveFn({ data: { id: record.id, lot_number: lot.trim(), ticket_number: ticket.trim() } });
      if (file) {
        const buf = new Uint8Array(await file.arrayBuffer());
        let bin = "";
        for (let i = 0; i < buf.length; i += 8192) {
          bin += String.fromCharCode(...buf.subarray(i, i + 8192));
        }
        await uploadFn({
          data: {
            id: record.id,
            filename: file.name,
            contentType: file.type || "application/octet-stream",
            base64: btoa(bin),
          },
        });
      }
    },
    onSuccess: () => {
      toast.success("Data timbangan & arsip DO tersimpan");
      qc.invalidateQueries({ queryKey: ["wb"] });
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message || "Gagal menyimpan data"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Operasi Timbangan</DialogTitle>
          <DialogDescription>
            {record.plate_number} · {record.vendor_name} · {record.do_number ?? "Tanpa Nomor DO"}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Lot ke- <span className="text-destructive">*</span></Label>
              <Input value={lot} onChange={(e) => setLot(e.target.value)} placeholder="mis. Lot 82" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Nomor Tiket (NOTRANS)</Label>
              <Input
                value={ticket}
                maxLength={6}
                onChange={(e) => setTicket(e.target.value)}
                placeholder="mis. 000182"
              />
            </div>
          </div>
          <div className="space-y-1.5 rounded-lg border border-dashed border-border p-3">
            <Label className="flex items-center gap-2 text-xs font-semibold">
              <Upload className="h-3.5 w-3.5" /> Scan / Upload File DO (gambar atau PDF)
            </Label>
            <Input
              type="file"
              accept="image/*,application/pdf"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            <p className="text-[11px] text-muted-foreground">
              Wajib diunggah setelah proses timbang &amp; cetak tiket selesai. Maksimal 15 MB.
            </p>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
          <Button
            onClick={() => {
              if (!lot.trim()) {
                toast.error('Kolom "Lot ke-" wajib diisi');
                return;
              }
              mutation.mutate();
            }}
            disabled={mutation.isPending}
          >
            {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Simpan
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
