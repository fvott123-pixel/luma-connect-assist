import { useState, useEffect, useRef, useCallback } from "react";
import * as pdfjsLib from "pdfjs-dist";
import { SA466_FIELDS, type SA466Field } from "@/lib/formMaps/sa466Fields";

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs`;

interface PdfPreviewProps {
  answers: Record<string, string>;
  scrollToField?: string | null;
}

const PDF_PATHS = [
  "/forms/DSP/sa466en.pdf",
  "/forms/CUsersfvottDesktopGovernment%20Forms/Disability%20Support%20Pension/sa466en.pdf",
];

/**
 * Parse a date string like "01/02/1990" or "1 Feb 1990" into { dd, mm, yyyy }.
 */
function parseDateParts(value: string): { dd: string; mm: string; yyyy: string } | null {
  const slashMatch = value.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (slashMatch) {
    return {
      dd: slashMatch[1].padStart(2, "0"),
      mm: slashMatch[2].padStart(2, "0"),
      yyyy: slashMatch[3].length === 2 ? `19${slashMatch[3]}` : slashMatch[3],
    };
  }
  return null;
}

const PdfPreview = ({ answers, scrollToField }: PdfPreviewProps) => {
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
      const data = { ...answers };
      if (data.postalAddress?.toLowerCase() === "same" || data.postalAddress?.toLowerCase() === "yes") {
        data.postalAddress = data.permanentAddress || "";
      }

      // Only render pages that have fields with answers + first page always
      const pagesWithData = new Set<number>([1]);
      for (const field of SA466_FIELDS) {
        const val = data[field.id];
        if (val && val.toLowerCase() !== "none" && val.toLowerCase() !== "skip") {
          pagesWithData.add(field.pageNumber + 1); // 1-indexed
        }
      }

      for (const pageNum of Array.from(pagesWithData).sort((a, b) => a - b)) {
        if (pageNum > pdf.numPages) continue;
        const page = await pdf.getPage(pageNum);
        const containerWidth = container.clientWidth - 16;
        const baseViewport = page.getViewport({ scale: 1 });
        const scale = Math.max(containerWidth / baseViewport.width, 0.5);
        const viewport = page.getViewport({ scale });

        let canvas = canvasRefs.current.get(pageNum);
        if (!canvas) {
          canvas = document.createElement("canvas");
          canvas.className = "w-full rounded-lg shadow-sm border border-border mb-2";
          container.appendChild(canvas);
          canvasRefs.current.set(pageNum, canvas);
        }

        canvas.width = viewport.width;
        canvas.height = viewport.height;

        const ctx = canvas.getContext("2d");
        if (!ctx) continue;

        await page.render({ canvasContext: ctx, viewport }).promise;

        // Overlay user answers
        const pageIndex = pageNum - 1;
        const fieldsOnPage = SA466_FIELDS.filter((f) => f.pageNumber === pageIndex);

        ctx.font = `${10 * scale}px Helvetica, Arial, sans-serif`;
        ctx.fillStyle = "#000000";

        for (const field of fieldsOnPage) {
          const value = data[field.id];
          if (!value || value.toLowerCase() === "none" || value.toLowerCase() === "skip") continue;

          // Handle tick/select fields with tickPositions
          if (field.tickPositions && field.tickPositions[value]) {
            const pos = field.tickPositions[value];
            const x = pos.x * scale;
            const y = (baseViewport.height - pos.y) * scale;
            ctx.font = `bold ${12 * scale}px Helvetica, Arial, sans-serif`;
            ctx.fillText("✓", x, y);
            ctx.font = `${10 * scale}px Helvetica, Arial, sans-serif`;
            continue;
          }

          // Handle date fields with dateBoxes
          if (field.fieldType === "date" && field.dateBoxes) {
            const parts = parseDateParts(value);
            if (parts) {
              const { dd, mm, yyyy } = parts;
              const boxes = field.dateBoxes;
              ctx.fillText(dd, boxes.ddX * scale, (baseViewport.height - boxes.ddY) * scale);
              ctx.fillText(mm, boxes.mmX * scale, (baseViewport.height - boxes.mmY) * scale);
              ctx.fillText(yyyy, boxes.yyyyX * scale, (baseViewport.height - boxes.yyyyY) * scale);
              continue;
            }
          }

          // Regular text
          const x = field.x * scale;
          const y = (baseViewport.height - field.y) * scale;

          if (field.maxWidth) {
            const maxW = field.maxWidth * scale;
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

  useEffect(() => {
    if (!canvasMode || !initialized) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => renderPages(), 350);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [answers, canvasMode, initialized, renderPages]);

  const filledFields = SA466_FIELDS.filter(
    (f) => answers[f.id] && answers[f.id].toLowerCase() !== "none" && answers[f.id].toLowerCase() !== "skip"
  );

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
