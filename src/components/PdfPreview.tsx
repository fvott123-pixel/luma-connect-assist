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
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(37);
  const [pageImage, setPageImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pdfDocRef = useRef<pdfjsLib.PDFDocumentProxy | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // targetPageRef tracks the page to show after the next PDF regeneration
  const targetPageRef = useRef<number>(0);
  // pendingRenderRef: if a render was dropped while busy, re-run with latest args
  const renderingRef = useRef(false);
  const pendingRenderRef = useRef<{ doc: pdfjsLib.PDFDocumentProxy; page: number } | null>(null);
  const lastAnswersRef = useRef<string>("");

  // When Luma answers a field, just record which page to jump to.
  // DO NOT call setCurrentPage here — that would trigger a stale-PDF re-render.
  // The page jump happens inside generateAndRender after the fresh PDF is ready.
  useEffect(() => {
    if (!scrollToField) return;
    const field = SA466_FIELDS.find(f => f.id === scrollToField);
    if (field?.pageNumber !== undefined) {
      targetPageRef.current = field.pageNumber;
    }
  }, [scrollToField]); // eslint-disable-line

  // Render a single page — queue if already rendering so we never miss the latest
  const renderPage = useCallback(async (doc: pdfjsLib.PDFDocumentProxy, pageNum: number) => {
    if (renderingRef.current) {
      // Already rendering — queue this call so it runs when the current one finishes
      pendingRenderRef.current = { doc, page: pageNum };
      return;
    }
    renderingRef.current = true;
    pendingRenderRef.current = null;
    try {
      const page = await doc.getPage(pageNum + 1);
      const scale = 1.5;
      const viewport = page.getViewport({ scale });
      const canvas = document.createElement("canvas");
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      await page.render({ canvasContext: canvas.getContext("2d")!, viewport }).promise;
      setPageImage(canvas.toDataURL("image/jpeg", 0.85));
    } finally {
      renderingRef.current = false;
      // If a newer render was queued while we were busy, run it now
      if (pendingRenderRef.current) {
        const { doc: d, page: p } = pendingRenderRef.current;
        pendingRenderRef.current = null;
        renderPage(d, p);
      }
    }
  }, []);

  // Re-render current page when user manually flips pages with the arrow buttons
  useEffect(() => {
    if (!pdfDocRef.current) return;
    renderPage(pdfDocRef.current, currentPage);
  }, [currentPage, renderPage]);

  // Generate a fresh filled PDF and render the target page
  const generateAndRender = useCallback(async (
    data: Record<string, string>,
    sigDataUrl: string | null | undefined,
    pageNum: number
  ) => {
    const answersKey = JSON.stringify(data) + (sigDataUrl || "");
    if (answersKey === lastAnswersRef.current && pdfDocRef.current) {
      // Answers unchanged — just re-render the target page
      setCurrentPage(pageNum);
      renderPage(pdfDocRef.current, pageNum);
      return;
    }
    lastAnswersRef.current = answersKey;

    try {
      setError(null);
      setLoading(true);
      const pdfBytes = await prefillSA466(data, sigDataUrl);
      const doc = await pdfjsLib.getDocument({ data: pdfBytes }).promise;
      pdfDocRef.current = doc;
      const safePage = Math.min(pageNum, doc.numPages - 1);
      setTotalPages(doc.numPages);
      setCurrentPage(safePage);            // ← jump to the right page NOW (fresh PDF is ready)
      await renderPage(doc, safePage);
    } catch (err: any) {
      console.error("PDF preview error:", err);
      setError(err?.message || "Failed to generate preview");
    } finally {
      setLoading(false);
    }
  }, [renderPage]);

  // Trigger on answers/signature change — 1.5 s debounce keeps it snappy
  useEffect(() => {
    setPending(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setPending(false);
      generateAndRender(answers, signatureDataUrl, targetPageRef.current);
    }, 1500);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [answers, signatureDataUrl, generateAndRender]);

  return (
    <div className="flex flex-col h-full rounded-xl border border-border bg-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-muted/50 shrink-0">
        <span className="text-xs font-bold text-foreground">📄 SA466 — Live Preview</span>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
              disabled={currentPage === 0}
              className="px-1.5 py-0.5 text-xs rounded border border-border bg-background disabled:opacity-30"
            >‹</button>
            <span className="text-[10px] text-muted-foreground">{currentPage + 1} / {totalPages}</span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={currentPage === totalPages - 1}
              className="px-1.5 py-0.5 text-xs rounded border border-border bg-background disabled:opacity-30"
            >›</button>
          </div>
          {pending && !loading && <span className="text-[10px] text-muted-foreground animate-pulse">✏️ filling…</span>}
          {loading && <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-primary border-t-transparent" />}
        </div>
      </div>

      {/* PDF page */}
      <div className="flex-1 min-h-0 overflow-auto bg-muted/20 relative">
        {/* Subtle overlay while a fresh PDF is generating */}
        {(pending || loading) && pageImage && (
          <div className="absolute inset-0 bg-background/30 z-10 pointer-events-none transition-opacity" />
        )}
        {error ? (
          <div className="flex items-center justify-center h-full p-4 text-center">
            <div>
              <p className="text-xs text-muted-foreground">PDF preview updating…<br/>Your answers are saved.</p>
              <button
                onClick={() => { setError(null); generateAndRender(answers, signatureDataUrl, targetPageRef.current); }}
                className="mt-3 rounded-lg bg-primary px-3 py-1.5 text-[10px] font-bold text-primary-foreground"
              >
                Retry
              </button>
            </div>
          </div>
        ) : pageImage ? (
          <div className="flex justify-center p-2">
            <img src={pageImage} alt={`Page ${currentPage + 1}`} className="max-w-full shadow-md" />
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <span className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <p className="mt-2 text-xs text-muted-foreground">Loading form…</p>
            </div>
          </div>
        )}
      </div>

      {/* Signature */}
      {onSignatureChange && (
        <div className="border-t border-border px-3 py-1.5 bg-muted/30 shrink-0">
          <p className="text-[10px] font-bold text-foreground mb-1">✍️ Signature</p>
          <SignaturePad onSignatureChange={onSignatureChange} initialSignature={signatureDataUrl} />
        </div>
      )}
    </div>
  );
};

export default PdfPreview;
