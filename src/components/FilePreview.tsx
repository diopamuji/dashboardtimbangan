import { useEffect, useState } from "react";
import { FileText, ImageIcon, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSignedUrl } from "@/lib/wb-queries";

export function FilePreviewButton({
  bucket,
  path,
  label,
}: {
  bucket: "do-scans" | "certificates";
  path: string | null | undefined;
  label: string;
}) {
  const sign = useSignedUrl();
  if (!path) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        <FileText className="h-3.5 w-3.5" /> Belum ada
      </span>
    );
  }
  return (
    <Button
      size="sm"
      variant="outline"
      className="h-7 gap-1 text-xs"
      disabled={sign.isPending}
      onClick={async () => {
        const { url } = await sign.mutateAsync({ bucket, path });
        window.open(url, "_blank", "noopener,noreferrer");
      }}
    >
      {sign.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImageIcon className="h-3.5 w-3.5" />}
      {label}
    </Button>
  );
}

export function InlineFilePreview({
  bucket,
  path,
}: {
  bucket: "do-scans" | "certificates";
  path: string | null | undefined;
}) {
  const sign = useSignedUrl();
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    setUrl(null);
    if (!path) return;
    sign
      .mutateAsync({ bucket, path })
      .then((r) => setUrl(r.url))
      .catch(() => setUrl(null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bucket, path]);

  if (!path) {
    return (
      <div className="flex h-40 items-center justify-center rounded-md border border-dashed border-border bg-secondary/40 text-xs text-muted-foreground">
        Belum diunggah
      </div>
    );
  }
  if (!url) {
    return (
      <div className="flex h-40 items-center justify-center rounded-md border border-border bg-secondary/40 text-xs text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Memuat preview...
      </div>
    );
  }
  const lower = path.toLowerCase();
  const isPdf = lower.endsWith(".pdf");
  return isPdf ? (
    <iframe src={url} className="h-72 w-full rounded-md border border-border" title="preview" />
  ) : (
    <a href={url} target="_blank" rel="noreferrer">
      <img src={url} alt="preview" className="h-72 w-full rounded-md border border-border object-contain bg-secondary/30" />
    </a>
  );
}
