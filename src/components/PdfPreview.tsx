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
  const targetPageRef = useRef<number>(0);
  const renderingRef = useRef(false);
  const lastAnswersRef = useRef<string>("");

  // When Luma answers a field, record the page to jump to
  useEffect(() => {
    if (!scrollToField) return;
    const field = SA466_FIELDS.find(f => f.id === scrollToField);
    if (field?.pageNumber !== undefined) {
      targetPageRef.current = field.pageNumber;
      if (pdfDocRef.current) {
        const target = Math.min(field.pageNumber, (pdfDocRef.current.numPages || 37) - 1);
        setCurrentPage(target);
      }
    }
  }, [scrollToField]); // eslint-disable-line

  // Render a single page
  const renderPage = useCallback(async (doc: pdfjsLib.PDFDocumentProxy, pageNum: number) => {
    if (renderingRef.current) return;
    renderingRef.current = true;
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
    }
  }, []);

  // Re-render current page when user manually flips pages
  useEffect(() => {
    if (!pdfDocRef.current) return;
    renderPage(pdfDocRef.current, currentPage);
  }, [currentPage, renderPage]);

  // Generate filled PDF and render — debounced, skip if answers haven't changed
  const generateAndRender = useCallback(async (
    data: Record<string, string>,
    sigDataUrl: string | null | undefined,
    pageNum: number
  ) => {
    const answersKey = JSON.stringify(data) + (sigDataUrl || "");
    if (answersKey === lastAnswersRef.current && pdfDocRef.current) {
      // Answers unchanged — just re-render current page
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
      setTotalPages(doc.numPages);
      await renderPage(doc, Math.min(pageNum, doc.numPages - 1));
    } catch (err: any) {
      console.error("PDF preview error:", err);
      setError(err?.message || "Failed to generate preview");
    } finally {
      setLoading(false);
    }
  }, [renderPage]);

  // Trigger on answers change — 3 second debounce so it doesn't fire mid-sentence
  useEffect(() => {
    setPending(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setPending(false);
      generateAndRender(answers, signatureDataUrl, targetPageRef.current);
    }, 5000);
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
          {pending && !loading && <span className="text-[10px] text-muted-foreground">updating…</span>}
          {loading && <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-primary border-t-transparent" />}
        </div>
      </div>

      {/* PDF page */}
      <div className="flex-1 min-h-0 overflow-auto bg-muted/20">
        {error ? (
          <div className="flex items-center justify-center h-full p-4 text-center">
            <p className="text-xs text-muted-foreground">PDF preview updating…<br/>Your answers are saved.</p>
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
