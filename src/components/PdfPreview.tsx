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
  const [error, setError] = useState<string | null>(null);

  const pdfDocRef = useRef<pdfjsLib.PDFDocumentProxy | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const targetPageRef = useRef<number>(0);
  const renderingRef = useRef(false);

  // When Luma answers a field, jump to its page
  useEffect(() => {
    if (!scrollToField) return;
    const field = SA466_FIELDS.find(f => f.id === scrollToField);
    if (field?.pageNumber !== undefined) {
      targetPageRef.current = field.pageNumber;
      setCurrentPage(field.pageNumber);
    }
  }, [scrollToField]); // eslint-disable-line react-hooks/exhaustive-deps

  // Render a single page to canvas
  const renderPage = useCallback(async (doc: pdfjsLib.PDFDocumentProxy, pageNum: number) => {
    if (renderingRef.current) return;
    renderingRef.current = true;
    try {
      const page = await doc.getPage(pageNum + 1); // pdfjs is 1-indexed
      const scale = 1.5;
      const viewport = page.getViewport({ scale });
      const canvas = document.createElement("canvas");
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext("2d")!;
      await page.render({ canvasContext: ctx, viewport }).promise;
      setPageImage(canvas.toDataURL("image/jpeg", 0.85));
    } catch (err) {
      console.error("Page render error:", err);
    } finally {
      renderingRef.current = false;
    }
  }, []);

  // Regenerate the filled PDF and render current page only
  const generateAndRender = useCallback(async (
    data: Record<string, string>,
    sigDataUrl: string | null | undefined,
    pageNum: number
  ) => {
    try {
      setError(null);
      setLoading(true);

      const pdfBytes = await prefillSA466(data, sigDataUrl);

      // Load the PDF document (reuse if possible)
      const loadingTask = pdfjsLib.getDocument({ data: pdfBytes });
      const doc = await loadingTask.promise;
      pdfDocRef.current = doc;
      setTotalPages(doc.numPages);

      // Render only the current page
      await renderPage(doc, Math.min(pageNum, doc.numPages - 1));
    } catch (err: any) {
      console.error("PDF preview error:", err);
      setError(err?.message || "Failed to generate PDF preview");
    } finally {
      setLoading(false);
    }
  }, [renderPage]);

  // Re-render when page changes (without regenerating PDF)
  useEffect(() => {
    if (!pdfDocRef.current) return;
    renderPage(pdfDocRef.current, currentPage);
  }, [currentPage, renderPage]);

  // Debounced re-generation when answers change
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      generateAndRender(answers, signatureDataUrl, targetPageRef.current);
    }, 1500);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [answers, signatureDataUrl, generateAndRender]);

  return (
    <div className="flex flex-col h-full rounded-xl border border-border bg-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-muted/50 shrink-0">
        <span className="text-xs font-bold text-foreground">📄 SA466 — Live PDF Preview</span>
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
        ) : pageImage ? (
          <div className="flex justify-center p-2">
            <img
              src={pageImage}
              alt={`SA466 Page ${currentPage + 1}`}
              className="max-w-full shadow-md"
            />
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
        <div className="border-t border-border px-4 py-3 bg-muted/30 shrink-0">
          <p className="text-[11px] font-bold text-foreground mb-2">✍️ Your Signature</p>
          <SignaturePad onSignatureChange={onSignatureChange} initialSignature={signatureDataUrl} />
        </div>
      )}
    </div>
  );
};

export default PdfPreview;
