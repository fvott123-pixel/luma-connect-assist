import { useState, useEffect, useRef, useCallback } from "react";
import { prefillSA466 } from "@/lib/prefillSA466";
import * as pdfjsLib from "pdfjs-dist";
import { SA466_FIELDS } from "@/lib/sa466FormFields";

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs`;

interface PdfPreviewProps {
  answers: Record<string, string>;
}

const PdfPreview = ({ answers }: PdfPreviewProps) => {
  const [canvasMode, setCanvasMode] = useState(true);
  const [error, setError] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRefs = useRef<Map<number, HTMLCanvasElement>>(new Map());
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const prevBlobRef = useRef<string | null>(null);

  const renderToCanvas = useCallback(async () => {
    try {
      const data = { ...answers };
      if (data.postalAddress?.toLowerCase() === "same" || data.postalAddress?.toLowerCase() === "yes") {
        data.postalAddress = data.permanentAddress || "";
      }

      const pdfBytes = await prefillSA466(data);
      const pdf = await pdfjsLib.getDocument({ data: pdfBytes }).promise;

      const container = containerRef.current;
      if (!container) return;

      // Clear old canvases if page count changed
      const existingCanvases = container.querySelectorAll("canvas");
      if (existingCanvases.length !== pdf.numPages) {
        container.innerHTML = "";
        canvasRefs.current.clear();
      }

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const scale = (container.clientWidth - 16) / page.getViewport({ scale: 1 }).width;
        const viewport = page.getViewport({ scale: Math.max(scale, 0.5) });

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

        await page.render({ canvasContext: ctx, viewport }).promise;
      }

      setInitialized(true);
      setError(false);
    } catch (err) {
      console.error("Canvas PDF render error:", err);
      setCanvasMode(false);
      setError(true);
    }
  }, [answers]);

  useEffect(() => {
    if (!canvasMode) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(() => {
      renderToCanvas();
    }, 350);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [answers, canvasMode, renderToCanvas]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (prevBlobRef.current) URL.revokeObjectURL(prevBlobRef.current);
    };
  }, []);

  const filledFields = SA466_FIELDS.filter(
    (f) => answers[f.id] && answers[f.id].toLowerCase() !== "none" && answers[f.id].toLowerCase() !== "skip"
  );

  // Fallback: table of collected answers
  if (!canvasMode || error) {
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
              <div
                key={field.id}
                className="flex justify-between items-start gap-2 rounded-lg bg-muted/50 px-3 py-2"
              >
                <span className="text-xs font-medium text-muted-foreground shrink-0">
                  {field.label}
                </span>
                <span className="text-xs text-foreground text-right break-all">
                  {answers[field.id]}
                </span>
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
