import { useEffect, useRef, useState, useCallback } from "react";
import { prefillSA466 } from "@/lib/prefillSA466";
import SignaturePad from "./SignaturePad";
import * as pdfjsLib from "pdfjs-dist";

// Set worker source
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

interface PdfPreviewProps {
  answers: Record<string, string>;
  scrollToField?: string | null;
  onSignatureChange?: (dataUrl: string | null) => void;
  signatureDataUrl?: string | null;
}

const PdfPreview = ({ answers, scrollToField, onSignatureChange, signatureDataUrl }: PdfPreviewProps) => {
  const [pages, setPages] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const generatePreview = useCallback(async (data: Record<string, string>, sigDataUrl?: string | null) => {
    try {
      setError(null);
      const pdfBytes = await prefillSA466(data, sigDataUrl);

      // Use pdf.js to render each page to canvas → dataURL
      const loadingTask = pdfjsLib.getDocument({ data: pdfBytes });
      const pdf = await loadingTask.promise;
      const pageImages: string[] = [];

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const scale = 1.5;
        const viewport = page.getViewport({ scale });

        const canvas = document.createElement("canvas");
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext("2d")!;

        await page.render({ canvasContext: ctx, viewport }).promise;
        pageImages.push(canvas.toDataURL("image/png"));
      }

      setPages(pageImages);
    } catch (err: any) {
      console.error("PDF preview error:", err);
      setError(err?.message || "Failed to generate PDF preview");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      generatePreview(answers, signatureDataUrl);
    }, 600);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [answers, signatureDataUrl, generatePreview]);

  return (
    <div className="flex flex-col h-full rounded-xl border border-border bg-card overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-muted/50">
        <span className="text-xs font-bold text-foreground">📄 SA466 — Live PDF Preview</span>
        <div className="flex items-center gap-2">
          {pages.length > 0 && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
                disabled={currentPage === 0}
                className="px-1.5 py-0.5 text-xs rounded border border-border bg-background text-foreground disabled:opacity-30"
              >
                ‹
              </button>
              <span className="text-[10px] text-muted-foreground">
                {currentPage + 1} / {pages.length}
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.min(pages.length - 1, p + 1))}
                disabled={currentPage === pages.length - 1}
                className="px-1.5 py-0.5 text-xs rounded border border-border bg-background text-foreground disabled:opacity-30"
              >
                ›
              </button>
            </div>
          )}
          {loading && (
            <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          )}
        </div>
      </div>

      <div ref={containerRef} className="flex-1 min-h-0 relative overflow-auto bg-muted/20">
        {error ? (
          <div className="flex items-center justify-center h-full p-6 text-center">
            <div>
              <p className="text-sm font-medium text-destructive">⚠️ {error}</p>
              <p className="mt-2 text-xs text-muted-foreground">
                The PDF template could not be loaded. Check that the file exists in storage.
              </p>
            </div>
          </div>
        ) : pages.length > 0 ? (
          <div className="flex justify-center p-2">
            <img
              src={pages[currentPage]}
              alt={`SA466 Page ${currentPage + 1}`}
              className="max-w-full shadow-md"
            />
          </div>
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
