import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Award, Download, FileCheck2, Plus, Upload } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  useCreateLoad, useLoadSummaries, useSignedUrl, useUploadFile, useUpsertCertificate,
} from "@/lib/wb-queries";
import { ALL_MATERIALS, MATERIAL_LABELS, fmtKg, kgToMT, type LoadSummary, type MaterialType } from "@/lib/wb";
import { InlineFilePreview } from "@/components/FilePreview";

export const Route = createFileRoute("/certificates")({
  head: () => ({
    meta: [
      { title: "Sertifikat COA & COW — PLTU Ombilin" },
      { name: "description", content: "Manajemen Load, Certificate of Analysis, dan Certificate of Weight PLTU Ombilin." },
      { property: "og:title", content: "Sertifikat COA & COW — PLTU Ombilin" },
      { property: "og:description", content: "Manajemen Load, Certificate of Analysis, dan Certificate of Weight PLTU Ombilin." },
    ],
  }),
  component: CertificatesPage,
});

function CertificatesPage() {
  const { data: summaries = [], isLoading } = useLoadSummaries();
  const [editing, setEditing] = useState<LoadSummary | null>(null);

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Award className="h-4 w-4 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">Sertifikat COA &amp; COW</h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Kelompokkan truk timbangan ke dalam Load / Batch dan lampirkan Certificate of Analysis &amp; Weight.
          </p>
        </div>
        <NewLoadDialog />
      </div>

      <Card className="shadow-card">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <FileCheck2 className="h-4 w-4" /> Tracking Load &amp; Sertifikat
          </CardTitle>
        </CardHeader>
        <CardContent className="px-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-secondary/50">
                  <TableHead className="pl-6">Nama Load</TableHead>
                  <TableHead>Material</TableHead>
                  <TableHead className="text-right">Total Truk</TableHead>
                  <TableHead className="text-right">Total Netto</TableHead>
                  <TableHead className="text-right">Total (MT)</TableHead>
                  <TableHead>COA</TableHead>
                  <TableHead>COW</TableHead>
                  <TableHead className="pr-6 text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && (
                  <TableRow><TableCell colSpan={8} className="py-10 text-center text-sm text-muted-foreground">Memuat...</TableCell></TableRow>
                )}
                {!isLoading && summaries.length === 0 && (
                  <TableRow><TableCell colSpan={8} className="py-10 text-center text-sm text-muted-foreground">Belum ada Load. Klik “Load Baru” untuk membuat.</TableCell></TableRow>
                )}
                {summaries.map((s) => (
                  <TableRow key={s.load.id}>
                    <TableCell className="pl-6 font-medium">{s.load.name}</TableCell>
                    <TableCell>{MATERIAL_LABELS[s.load.material_type]}</TableCell>
                    <TableCell className="text-right font-mono">{s.truck_count}</TableCell>
                    <TableCell className="text-right font-mono text-xs">{fmtKg(s.total_net_kg)}</TableCell>
                    <TableCell className="text-right font-mono text-xs">{kgToMT(s.total_net_kg).toFixed(2)} MT</TableCell>
                    <TableCell>
                      <Badge className={s.certificate?.coa_file_url ? "bg-emerald-600 text-white" : "bg-amber-500 text-white"}>
                        {s.certificate?.coa_file_url ? "Sudah Upload" : "Belum Upload"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={s.certificate?.cow_file_url ? "bg-emerald-600 text-white" : "bg-amber-500 text-white"}>
                        {s.certificate?.cow_file_url ? "Sudah Upload" : "Belum Upload"}
                      </Badge>
                    </TableCell>
                    <TableCell className="pr-6 text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setEditing(s)}>
                          <Upload className="mr-1 h-3.5 w-3.5" /> Upload/Edit
                        </Button>
                        <DownloadPackageButton summary={s} />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <CertificateDialog summary={editing} onOpenChange={(v) => !v && setEditing(null)} />
    </div>
  );
}

function NewLoadDialog() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [material, setMaterial] = useState<MaterialType>("COAL");
  const [notes, setNotes] = useState("");
  const create = useCreateLoad();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-gradient-gold text-primary hover:opacity-90">
          <Plus className="mr-2 h-4 w-4" /> Load Baru
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Buat Load / Batch Baru</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Nama Load</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="mis. Load #12 - Batubara" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Material</Label>
            <Select value={material} onValueChange={(v) => setMaterial(v as MaterialType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ALL_MATERIALS.map((m) => (
                  <SelectItem key={m} value={m}>{MATERIAL_LABELS[m]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Catatan (opsional)</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Batal</Button>
          <Button
            disabled={!name || create.isPending}
            onClick={async () => {
              try {
                await create.mutateAsync({ name, material_type: material, notes });
                toast.success("Load dibuat");
                setOpen(false); setName(""); setNotes("");
              } catch (e: any) { toast.error(e?.message ?? "Gagal membuat load"); }
            }}
          >
            Simpan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CertificateDialog({
  summary,
  onOpenChange,
}: { summary: LoadSummary | null; onOpenChange: (v: boolean) => void }) {
  const [coa, setCoa] = useState<File | null>(null);
  const [cow, setCow] = useState<File | null>(null);
  const [cv, setCv] = useState("");
  const [moist, setMoist] = useState("");
  const [verified, setVerified] = useState("");
  const [notes, setNotes] = useState("");
  const upload = useUploadFile();
  const upsert = useUpsertCertificate();

  const open = !!summary;

  async function submit() {
    if (!summary) return;
    try {
      let coaPath: string | undefined | null;
      let cowPath: string | undefined | null;
      if (coa) coaPath = (await upload.mutateAsync(Object.assign(coa, { bucket: "certificates" as const }))).path;
      if (cow) cowPath = (await upload.mutateAsync(Object.assign(cow, { bucket: "certificates" as const }))).path;
      await upsert.mutateAsync({
        load_id: summary.load.id,
        coa_file_path: coaPath,
        cow_file_path: cowPath,
        calorific_value: cv || undefined,
        moisture: moist || undefined,
        total_weight_verified: verified || undefined,
        notes: notes || undefined,
      });
      toast.success("Sertifikat disimpan");
      onOpenChange(false);
      setCoa(null); setCow(null); setCv(""); setMoist(""); setVerified(""); setNotes("");
    } catch (e: any) {
      toast.error(e?.message ?? "Gagal menyimpan");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Upload COA &amp; COW — {summary?.load.name}</DialogTitle>
        </DialogHeader>
        {summary && (
          <div className="space-y-3">
            <div className="rounded-md border border-border bg-secondary/40 p-3 text-xs">
              <div className="grid grid-cols-2 gap-y-1">
                <span className="text-muted-foreground">Material</span>
                <span>{MATERIAL_LABELS[summary.load.material_type]}</span>
                <span className="text-muted-foreground">Truk Terhubung</span>
                <span>{summary.truck_count}</span>
                <span className="text-muted-foreground">Total Netto</span>
                <span>{fmtKg(summary.total_net_kg)} ({kgToMT(summary.total_net_kg).toFixed(2)} MT)</span>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs">File COA (PDF/Image)</Label>
                <Input type="file" accept="application/pdf,image/*" onChange={(e) => setCoa(e.target.files?.[0] ?? null)} />
                {!coa && <InlineFilePreview bucket="certificates" path={summary.certificate?.coa_file_url} />}
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">File COW (PDF/Image)</Label>
                <Input type="file" accept="application/pdf,image/*" onChange={(e) => setCow(e.target.files?.[0] ?? null)} />
                {!cow && <InlineFilePreview bucket="certificates" path={summary.certificate?.cow_file_url} />}
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Calorific Value</Label>
                <Input placeholder={summary.certificate?.calorific_value ?? "mis. 4200 kcal/kg"} value={cv} onChange={(e) => setCv(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Moisture</Label>
                <Input placeholder={summary.certificate?.moisture ?? "mis. 32%"} value={moist} onChange={(e) => setMoist(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Total Weight Verified</Label>
                <Input placeholder={summary.certificate?.total_weight_verified ?? "mis. 3.750 MT"} value={verified} onChange={(e) => setVerified(e.target.value)} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Catatan</Label>
              <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
          <Button onClick={submit} disabled={upload.isPending || upsert.isPending}>
            <Upload className="mr-2 h-4 w-4" /> Simpan Sertifikat
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DownloadPackageButton({ summary }: { summary: LoadSummary }) {
  const sign = useSignedUrl();
  async function download() {
    const files: { label: string; bucket: "do-scans" | "certificates"; path: string }[] = [];
    if (summary.certificate?.coa_file_url) files.push({ label: "COA", bucket: "certificates", path: summary.certificate.coa_file_url });
    if (summary.certificate?.cow_file_url) files.push({ label: "COW", bucket: "certificates", path: summary.certificate.cow_file_url });
    if (files.length === 0) {
      toast.info("Belum ada sertifikat untuk diunduh");
      return;
    }
    for (const f of files) {
      const { url } = await sign.mutateAsync({ bucket: f.bucket, path: f.path });
      window.open(url, "_blank", "noopener,noreferrer");
    }
  }
  return (
    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={download} disabled={sign.isPending}>
      <Download className="mr-1 h-3.5 w-3.5" /> Package
    </Button>
  );
}
