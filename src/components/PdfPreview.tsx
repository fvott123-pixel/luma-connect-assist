import SA466FormPreview from "./SA466FormPreview";

interface PdfPreviewProps {
  answers: Record<string, string>;
  scrollToField?: string | null;
}

/**
 * PDF Preview — now uses an HTML replica instead of coordinate-based canvas overlay.
 * Answers appear instantly as they're submitted.
 * Use window.print() for clean PDF output.
 */
const PdfPreview = ({ answers, scrollToField }: PdfPreviewProps) => {
  return <SA466FormPreview answers={answers} scrollToField={scrollToField} />;
};

export default PdfPreview;
