import { useState } from "react";
import { Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAttachDo, useLoads, useUploadFile } from "@/lib/wb-queries";
import { MATERIAL_LABELS, type WeighbridgeRecord } from "@/lib/wb";
import { InlineFilePreview } from "./FilePreview";

export function AttachDoDialog({
  record,
  open,
  onOpenChange,
}: {
  record: WeighbridgeRecord | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [doNumber, setDoNumber] = useState("");
  const [loadId, setLoadId] = useState<string>("NONE");
  const { data: loads = [] } = useLoads();
  const upload = useUploadFile();
  const attach = useAttachDo();

  if (!record) return null;

  async function submit() {
    if (!record) return;
    try {
      let uploadedPath: string | undefined;
      if (file) {
        const res = await upload.mutateAsync(Object.assign(file, { bucket: "do-scans" as const }));
        uploadedPath = res.path;
      }
      await attach.mutateAsync({
        record_id: record.id,
        do_file_path: uploadedPath,
        do_number: doNumber || record.do_number || undefined,
        load_id: loadId === "NONE" ? null : loadId,
      });
      toast.success("DO berhasil ditempelkan");
      onOpenChange(false);
      setFile(null);
      setDoNumber("");
      setLoadId("NONE");
    } catch (e: any) {
      toast.error(e?.message ?? "Gagal upload DO");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Scan & Upload DO — {record.plate_number}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="rounded-md border border-border bg-secondary/40 p-3 text-xs">
            <div className="grid grid-cols-2 gap-y-1">
              <span className="text-muted-foreground">Pemasok</span>
              <span className="font-medium">{record.vendor_name}</span>
              <span className="text-muted-foreground">Material</span>
              <span className="font-medium">{MATERIAL_LABELS[record.material_type]}</span>
              <span className="text-muted-foreground">Netto</span>
              <span className="font-medium">{Number(record.net_weight).toLocaleString("id-ID")} Kg</span>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Nomor DO</Label>
            <Input
              placeholder={record.do_number ?? "mis. DO-2026-00123"}
              value={doNumber}
              onChange={(e) => setDoNumber(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">File DO (PDF / Gambar)</Label>
            <Input
              type="file"
              accept="application/pdf,image/*"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            {record.do_file_url && !file && (
              <div className="pt-2">
                <p className="mb-1 text-[11px] text-muted-foreground">Preview file terunggah:</p>
                <InlineFilePreview bucket="do-scans" path={record.do_file_url} />
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Tempelkan ke Load / Batch</Label>
            <Select value={loadId} onValueChange={setLoadId}>
              <SelectTrigger>
                <SelectValue placeholder="Pilih load" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="NONE">— Tidak dihubungkan —</SelectItem>
                {loads
                  .filter((l) => l.material_type === record.material_type)
                  .map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            <p className="text-[10px] text-muted-foreground">
              Load dibuat di menu <b>Sertifikat COA &amp; COW</b>.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
          <Button onClick={submit} disabled={upload.isPending || attach.isPending}>
            <Upload className="mr-2 h-4 w-4" /> Simpan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
