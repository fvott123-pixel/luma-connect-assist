import { useEffect, useRef, useState, useCallback } from "react";
import { prefillSA466 } from "@/lib/prefillSA466";
import SignaturePad from "./SignaturePad";
import { SA466_FIELDS } from "@/lib/formMaps/sa466Fields";
import * as pdfjsLib from "pdfjs-dist";

import workerSrc from "pdfjs-dist/build/pdf.worker.min.mjs?url";
pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;

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

  // ── Track which page the latest answered field lives on ──
  // Use a ref so the value survives PDF re-renders without causing extra effects
  const targetPageRef = useRef<number>(0);

  // When Luma answers a field, record its page number
  useEffect(() => {
    if (!scrollToField) return;
    const field = SA466_FIELDS.find(f => f.id === scrollToField);
    if (field !== undefined && field.pageNumber !== undefined) {
      targetPageRef.current = field.pageNumber;
      // If pages are already loaded, jump immediately
      if (pages.length > 0) {
        setCurrentPage(Math.min(field.pageNumber, pages.length - 1));
      }
    }
  }, [scrollToField]); // eslint-disable-line react-hooks/exhaustive-deps

  // After PDF re-renders and pages update, jump to tracked target page
  useEffect(() => {
    if (pages.length > 0) {
      setCurrentPage(Math.min(targetPageRef.current, pages.length - 1));
    }
  }, [pages]);

  const generatePreview = useCallback(async (data: Record<string, string>, sigDataUrl?: string | null) => {
    try {
      setError(null);
      setLoading(true);
      const pdfBytes = await prefillSA466(data, sigDataUrl);
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
    }, 2000);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [answers, signatureDataUrl, generatePreview]);

  return (
    <div className="flex flex-col h-full rounded-xl border border-border bg-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-muted/50 shrink-0">
        <span className="text-xs font-bold text-foreground">📄 SA466 — Live PDF Preview</span>
        <div className="flex items-center gap-2">
          {pages.length > 0 && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
                disabled={currentPage === 0}
                className="px-1.5 py-0.5 text-xs rounded border border-border bg-background disabled:opacity-30"
              >‹</button>
              <span className="text-[10px] text-muted-foreground">{currentPage + 1} / {pages.length}</span>
              <button
                onClick={() => setCurrentPage(p => Math.min(pages.length - 1, p + 1))}
                disabled={currentPage === pages.length - 1}
                className="px-1.5 py-0.5 text-xs rounded border border-border bg-background disabled:opacity-30"
              >›</button>
            </div>
          )}
          {loading && <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-primary border-t-transparent" />}
        </div>
      </div>

      {/* PDF display */}
      <div className="flex-1 min-h-0 overflow-auto bg-muted/20">
        {error ? (
          <div className="flex items-center justify-center h-full p-6 text-center">
            <div>
              <p className="text-sm font-medium text-muted-foreground">📄 Preparing PDF…</p>
              <p className="mt-1 text-xs text-muted-foreground">Your answers are saved. Download will work when complete.</p>
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

      {/* Signature */}
      {onSignatureChange && (
        <div className="border-t border-border px-4 py-3 bg-muted/30 shrink-0">
          <p className="text-[11px] font-bold text-foreground mb-2">✍️ Your Signature</p>
          <SignaturePad onSignatureChange={onSignatureChange} initialSignature={signatureDataUrl} />
        </div>
      )}
    </div>
  );
};

export default PdfPreview;
