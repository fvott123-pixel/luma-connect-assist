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

/** Coordinate offset — adjust all Y values down to align with actual form boxes */
const Y_OFFSET = -20;

function parseDateParts(value: string): { dd: string; mm: string; yyyy: string } | null {
  const m = value.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (m) {
    return {
      dd: m[1].padStart(2, "0"),
      mm: m[2].padStart(2, "0"),
      yyyy: m[3].length === 2 ? `19${m[3]}` : m[3],
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
  const renderingRef = useRef(false);
  const pendingRef = useRef(false);
  const highlightFieldRef = useRef<string | null>(null);

  // Load PDF once
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
            console.log("✅ PDF loaded:", path, "Pages:", pdf.numPages);
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
    if (renderingRef.current) {
      pendingRef.current = true;
      return;
    }
    renderingRef.current = true;

    try {
      const data = { ...answers };
      if (data.postalAddress?.toLowerCase() === "same" || data.postalAddress?.toLowerCase() === "yes") {
        data.postalAddress = data.permanentAddress || "";
      }

      const highlightId = highlightFieldRef.current;

      // Always render page 1 + pages with data
      const pagesWithData = new Set<number>([1]);
      for (const field of SA466_FIELDS) {
        const val = data[field.id];
        if (val && val.toLowerCase() !== "none" && val.toLowerCase() !== "skip") {
          pagesWithData.add(field.pageNumber + 1);
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
          canvas.dataset.pageNum = String(pageNum);
          container.appendChild(canvas);
          canvasRefs.current.set(pageNum, canvas);
        }

        canvas.width = viewport.width;
        canvas.height = viewport.height;

        const ctx = canvas.getContext("2d");
        if (!ctx) continue;

        // Clear and re-render base PDF
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        await page.render({ canvasContext: ctx, viewport }).promise;

        // Overlay answers
        const pageIndex = pageNum - 1;
        const fieldsOnPage = SA466_FIELDS.filter((f) => f.pageNumber === pageIndex);

        for (const field of fieldsOnPage) {
          const value = data[field.id];
          if (!value || value.toLowerCase() === "none" || value.toLowerCase() === "skip") continue;

          const isHighlighted = field.id === highlightId;

          // Tick fields
          if (field.tickPositions && field.tickPositions[value]) {
            const pos = field.tickPositions[value];
            const x = pos.x * scale;
            const y = (baseViewport.height - (pos.y + Y_OFFSET)) * scale;
            console.log(`Placing tick [${value}] at page ${pageNum}, x=${pos.x}, y=${pos.y + Y_OFFSET} (field: ${field.id})`);

            if (isHighlighted) {
              ctx.fillStyle = "rgba(34, 197, 94, 0.25)";
              ctx.fillRect(x - 4, y - 14, 20, 18);
            }
            ctx.font = `bold ${12 * scale}px Helvetica, Arial, sans-serif`;
            ctx.fillStyle = isHighlighted ? "#16a34a" : "#000000";
            ctx.fillText("✓", x, y);
            ctx.fillStyle = "#000000";
            ctx.font = `${10 * scale}px Helvetica, Arial, sans-serif`;
            continue;
          }

          // Date fields
          if (field.fieldType === "date" && field.dateBoxes) {
            const parts = parseDateParts(value);
            if (parts) {
              const boxes = field.dateBoxes;
              const positions = [
                { text: parts.dd, x: boxes.ddX, y: boxes.ddY },
                { text: parts.mm, x: boxes.mmX, y: boxes.mmY },
                { text: parts.yyyy, x: boxes.yyyyX, y: boxes.yyyyY },
              ];
              ctx.font = `${10 * scale}px Helvetica, Arial, sans-serif`;
              ctx.fillStyle = isHighlighted ? "#16a34a" : "#000000";
              for (const p of positions) {
                const sx = p.x * scale;
                const sy = (baseViewport.height - (p.y + Y_OFFSET)) * scale;
                if (isHighlighted) {
                  ctx.save();
                  ctx.fillStyle = "rgba(34, 197, 94, 0.25)";
                  ctx.fillRect(sx - 2, sy - 12, ctx.measureText(p.text).width + 4, 16);
                  ctx.restore();
                  ctx.fillStyle = "#16a34a";
                }
                ctx.fillText(p.text, sx, sy);
              }
              console.log(`Placing date [${value}] at page ${pageNum}, x=${boxes.ddX}, y=${boxes.ddY + Y_OFFSET} (field: ${field.id})`);
              ctx.fillStyle = "#000000";
              continue;
            }
          }

          // Regular text
          const x = field.x * scale;
          const y = (baseViewport.height - (field.y + Y_OFFSET)) * scale;
          console.log(`Placing [${value}] at page ${pageNum}, x=${field.x}, y=${field.y + Y_OFFSET} (field: ${field.id})`);

          ctx.font = `${10 * scale}px Helvetica, Arial, sans-serif`;
          ctx.fillStyle = isHighlighted ? "#16a34a" : "#000000";

          if (field.maxWidth) {
            const maxW = field.maxWidth * scale;
            const words = value.split(" ");
            let line = "";
            let lineY = y;
            const allLines: { text: string; ly: number }[] = [];
            for (const word of words) {
              const test = line ? `${line} ${word}` : word;
              if (ctx.measureText(test).width > maxW && line) {
                allLines.push({ text: line, ly: lineY });
                line = word;
                lineY += 12 * scale;
              } else {
                line = test;
              }
            }
            if (line) allLines.push({ text: line, ly: lineY });

            if (isHighlighted) {
              ctx.save();
              ctx.fillStyle = "rgba(34, 197, 94, 0.20)";
              for (const l of allLines) {
                ctx.fillRect(x - 2, l.ly - 11, Math.min(ctx.measureText(l.text).width + 4, maxW + 4), 15);
              }
              ctx.restore();
              ctx.fillStyle = "#16a34a";
            }
            for (const l of allLines) {
              ctx.fillText(l.text, x, l.ly);
            }
          } else {
            if (isHighlighted) {
              ctx.save();
              ctx.fillStyle = "rgba(34, 197, 94, 0.25)";
              ctx.fillRect(x - 2, y - 11, ctx.measureText(value).width + 4, 15);
              ctx.restore();
              ctx.fillStyle = "#16a34a";
            }
            ctx.fillText(value, x, y);
          }
          ctx.fillStyle = "#000000";
        }
      }

      console.log("PDF re-rendered");
    } catch (err) {
      console.error("Canvas render error:", err);
      setCanvasMode(false);
    } finally {
      renderingRef.current = false;
      if (pendingRef.current) {
        pendingRef.current = false;
        renderPages();
      }
    }
  }, [answers]);

  // Re-render immediately when answers change
  useEffect(() => {
    if (!canvasMode || !initialized) return;
    renderPages();
  }, [answers, canvasMode, initialized, renderPages]);

  // Scroll to field + highlight, then clear highlight after delay
  useEffect(() => {
    if (!scrollToField || !containerRef.current) return;
    highlightFieldRef.current = scrollToField;
    // Trigger re-render with highlight
    renderPages();

    const field = SA466_FIELDS.find(f => f.id === scrollToField);
    if (field) {
      const pageNum = field.pageNumber + 1;
      // Small delay to let canvas render first
      setTimeout(() => {
        const canvas = canvasRefs.current.get(pageNum);
        if (canvas) {
          canvas.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, 100);
    }

    // Clear highlight after 2 seconds and re-render
    const timer = setTimeout(() => {
      highlightFieldRef.current = null;
      renderPages();
    }, 2000);
    return () => clearTimeout(timer);
  }, [scrollToField]);

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
