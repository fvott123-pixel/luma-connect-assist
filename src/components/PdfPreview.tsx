import { useState, useEffect, useRef } from "react";
import { prefillSA466 } from "@/lib/prefillSA466";

interface PdfPreviewProps {
  answers: Record<string, string>;
}

const PdfPreview = ({ answers }: PdfPreviewProps) => {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const prevUrlRef = useRef<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    // Debounce PDF generation to avoid excessive re-renders
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      try {
        // Normalize postal address
        const data = { ...answers };
        if (data.postalAddress?.toLowerCase() === "same" || data.postalAddress?.toLowerCase() === "yes") {
          data.postalAddress = data.permanentAddress || "";
        }

        const pdfBytes = await prefillSA466(data);
        const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: "application/pdf" });
        const url = URL.createObjectURL(blob);

        // Revoke previous URL
        if (prevUrlRef.current) URL.revokeObjectURL(prevUrlRef.current);
        prevUrlRef.current = url;

        setPdfUrl(url);
        setError(false);
      } catch (err) {
        console.error("PDF preview error:", err);
        setError(true);
      }
    }, 400);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [answers]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (prevUrlRef.current) URL.revokeObjectURL(prevUrlRef.current);
    };
  }, []);

  if (error) {
    return (
      <div className="flex h-full items-center justify-center rounded-xl border border-border bg-muted/50 p-8">
        <p className="text-sm text-muted-foreground text-center">
          Could not load PDF preview.
          <br />
          Your form will still download correctly.
        </p>
      </div>
    );
  }

  if (!pdfUrl) {
    return (
      <div className="flex h-full items-center justify-center rounded-xl border border-border bg-muted/50 p-8">
        <div className="text-center">
          <span className="text-4xl">📄</span>
          <p className="mt-2 text-sm text-muted-foreground">
            Your form preview will appear here as Luma fills in each field
          </p>
        </div>
      </div>
    );
  }

  return (
    <iframe
      src={`${pdfUrl}#toolbar=0&navpanes=0`}
      className="h-full w-full rounded-xl border border-border"
      title="SA466 Form Preview"
    />
  );
};

export default PdfPreview;
