import SA466FormPreview from "./SA466FormPreview";

interface PdfPreviewProps {
  answers: Record<string, string>;
  scrollToField?: string | null;
  onSignatureChange?: (dataUrl: string | null) => void;
  signatureDataUrl?: string | null;
}

const PdfPreview = ({ answers, scrollToField, onSignatureChange, signatureDataUrl }: PdfPreviewProps) => {
  return <SA466FormPreview answers={answers} scrollToField={scrollToField} onSignatureChange={onSignatureChange} signatureDataUrl={signatureDataUrl} />;
};

export default PdfPreview;
