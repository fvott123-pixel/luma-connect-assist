import { useState, useEffect, useRef, useCallback } from "react";
import * as pdfjsLib from "pdfjs-dist";
import { SA466_FIELDS } from "@/lib/sa466FormFields";

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs`;

interface PdfPreviewProps {
  answers: Record<string, string>;
}

const PDF_PATHS = [
  "/forms/DSP/sa466en.pdf",
  "/forms/CUsersfvottDesktopGovernment%20Forms/Disability%20Support%20Pension/sa466en.pdf",
];

const PdfPreview = ({ answers }: PdfPreviewProps) => {
  const [canvasMode, setCanvasMode] = useState(true);
  const [initialized, setInitialized] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const pdfDocRef = useRef<pdfjsLib.PDFDocumentProxy | null>(null);
  const canvasRefs = useRef<Map<number, HTMLCanvasElement>>(new Map());
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // Load the original PDF once
  useEffect(() => {
    let cancelled = false;
    (async () => {
      for (const path of PDF_PATHS) {
        try {
          const url = `${window.location.origin}${path}`;
          const pdf = await pdfjsLib.getDocument({ url, password: "" }).promise;
          if (!cancelled) {
            pdfDocRef.current = pdf;
            setInitialized(true);
          }
          return;
        } catch (err) {
          console.warn("PDF.js load attempt failed:", err);
        }
      }
      if (!cancelled) setCanvasMode(false);
    })();
    return () => { cancelled = true; };
  }, []);

  const renderPages = useCallback(async () => {
    const pdf = pdfDocRef.current;
    const container = containerRef.current;
    if (!pdf || !container) return;

    try {
      // Normalize answers
      const data = { ...answers };
      if (data.postalAddress?.toLowerCase() === "same" || data.postalAddress?.toLowerCase() === "yes") {
        data.postalAddress = data.permanentAddress || "";
      }

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const containerWidth = container.clientWidth - 16;
        const baseViewport = page.getViewport({ scale: 1 });
        const scale = Math.max(containerWidth / baseViewport.width, 0.5);
        const viewport = page.getViewport({ scale });

        let canvas = canvasRefs.current.get(i);
        if (!canvas) {
          canvas = document.createElement("canvas");
          canvas.className = "w-full rounded-lg shadow-sm border border-border mb-2";
          container.appendChild(canvas);
          canvasRefs.current.set(i, canvas);
        }

        canvas.width = viewport.width;
        canvas.height = viewport.height;

        const ctx = canvas.getContext("2d");
        if (!ctx) continue;

        // Render original PDF page
        await page.render({ canvasContext: ctx, viewport }).promise;

        // Overlay user answers for fields on this page (0-indexed page in field config)
        const pageIndex = i - 1;
        const fieldsOnPage = SA466_FIELDS.filter((f) => f.pdf.page === pageIndex);

        ctx.font = `${10 * scale}px Helvetica, Arial, sans-serif`;
        ctx.fillStyle = "#000000";

        for (const field of fieldsOnPage) {
          const value = data[field.id];
          if (!value || value.toLowerCase() === "none" || value.toLowerCase() === "same") continue;

          // Convert PDF coords (origin bottom-left) to canvas coords (origin top-left)
          const x = field.pdf.x * scale;
          const y = (baseViewport.height - field.pdf.y) * scale;

          if (field.pdf.maxWidth) {
            // Simple word wrap
            const maxW = field.pdf.maxWidth * scale;
            const words = value.split(" ");
            let line = "";
            let lineY = y;
            for (const word of words) {
              const test = line ? `${line} ${word}` : word;
              if (ctx.measureText(test).width > maxW && line) {
                ctx.fillText(line, x, lineY);
                line = word;
                lineY += 12 * scale;
              } else {
                line = test;
              }
            }
            if (line) ctx.fillText(line, x, lineY);
          } else {
            ctx.fillText(value, x, y);
          }
        }
      }
    } catch (err) {
      console.error("Canvas render error:", err);
      setCanvasMode(false);
    }
  }, [answers]);

  // Re-render when answers change
  useEffect(() => {
    if (!canvasMode || !initialized) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => renderPages(), 350);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [answers, canvasMode, initialized, renderPages]);

  const filledFields = SA466_FIELDS.filter(
    (f) => answers[f.id] && answers[f.id].toLowerCase() !== "none" && answers[f.id].toLowerCase() !== "skip"
  );

  // Fallback: table of collected answers
  if (!canvasMode) {
    return (
      <div className="flex h-full flex-col rounded-xl border border-border bg-card p-4 overflow-auto">
        <div className="mb-3 flex items-center gap-2">
          <span className="text-lg">📋</span>
          <h3 className="font-serif text-sm font-bold text-foreground">Collected Answers</h3>
        </div>
        {filledFields.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center mt-8">
            Your answers will appear here as Luma collects them
          </p>
        ) : (
          <div className="space-y-2">
            {filledFields.map((field) => (
              <div key={field.id} className="flex justify-between items-start gap-2 rounded-lg bg-muted/50 px-3 py-2">
                <span className="text-xs font-medium text-muted-foreground shrink-0">{field.label}</span>
                <span className="text-xs text-foreground text-right break-all">{answers[field.id]}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="h-full w-full overflow-auto rounded-xl border border-border bg-white p-2"
    >
      {!initialized && (
        <div className="flex h-full items-center justify-center p-8">
          <div className="text-center">
            <span className="text-4xl">📄</span>
            <p className="mt-2 text-sm text-muted-foreground">
              Your form preview will appear here as Luma fills in each field
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default PdfPreview;
