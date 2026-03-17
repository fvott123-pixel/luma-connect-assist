import { useEffect, useRef, useState, useCallback } from "react";
import { prefillSA466 } from "@/lib/prefillSA466";
import SignaturePad from "./SignaturePad";

interface PdfPreviewProps {
  answers: Record<string, string>;
  scrollToField?: string | null;
  onSignatureChange?: (dataUrl: string | null) => void;
  signatureDataUrl?: string | null;
}

const PdfPreview = ({ answers, scrollToField, onSignatureChange, signatureDataUrl }: PdfPreviewProps) => {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const prevUrlRef = useRef<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const generatePreview = useCallback(async (data: Record<string, string>, sigDataUrl?: string | null) => {
    try {
      setError(null);
      const pdfBytes = await prefillSA466(data, sigDataUrl);
      const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);

      // Revoke previous URL
      if (prevUrlRef.current) {
        URL.revokeObjectURL(prevUrlRef.current);
      }
      prevUrlRef.current = url;
      setPdfUrl(url);
    } catch (err: any) {
      console.error("PDF preview error:", err);
      setError(err?.message || "Failed to generate PDF preview");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Debounce regeneration to avoid hammering pdf-lib on every keystroke
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      generatePreview(answers, signatureDataUrl);
    }, 600);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [answers, signatureDataUrl, generatePreview]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (prevUrlRef.current) {
        URL.revokeObjectURL(prevUrlRef.current);
      }
    };
  }, []);

  return (
    <div className="flex flex-col h-full rounded-xl border border-border bg-card overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-muted/50">
        <span className="text-xs font-bold text-foreground">📄 SA466 — Live PDF Preview</span>
        {loading && (
          <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        )}
      </div>

      <div className="flex-1 min-h-0 relative">
        {error ? (
          <div className="flex items-center justify-center h-full p-6 text-center">
            <div>
              <p className="text-sm font-medium text-destructive">⚠️ {error}</p>
              <p className="mt-2 text-xs text-muted-foreground">
                The PDF template could not be loaded. Check that the file exists in storage.
              </p>
            </div>
          </div>
        ) : pdfUrl ? (
          <iframe
            src={pdfUrl}
            className="w-full h-full border-0"
            title="SA466 PDF Preview"
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <span className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <p className="mt-2 text-xs text-muted-foreground">Loading government form…</p>
            </div>
          </div>
        )}
      </div>

      {/* Signature pad at the bottom */}
      {onSignatureChange && (
        <div className="border-t border-border px-4 py-3 bg-muted/30">
          <p className="text-[11px] font-bold text-foreground mb-2">✍️ Your Signature</p>
          <SignaturePad
            onSignatureChange={onSignatureChange}
            initialSignature={signatureDataUrl}
          />
        </div>
      )}
    </div>
  );
};

export default PdfPreview;
