import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { SA466_FIELDS } from "./sa466FormFields";

export type SA466FormData = Record<string, string>;

/**
 * Fill in SA466 DSP form PDF with collected answers at their mapped coordinates.
 */
export async function prefillSA466(data: SA466FormData): Promise<Uint8Array> {
  const origin = window.location.origin;
  const paths = [
    `${origin}/forms/DSP/sa466en.pdf`,
    `${origin}/forms/CUsersfvottDesktopGovernment%20Forms/Disability%20Support%20Pension/sa466en.pdf`,
  ];

  let pdfBytes: ArrayBuffer | null = null;
  for (const url of paths) {
    try {
      const res = await fetch(url);
      if (res.ok) {
        pdfBytes = await res.arrayBuffer();
        console.log("Loaded SA466 PDF from:", url);
        break;
      }
    } catch (err) {
      console.warn("SA466 fetch error:", err);
    }
  }

  if (!pdfBytes) {
    throw new Error("Could not load SA466 PDF template.");
  }

  const pdfDoc = await PDFDocument.load(pdfBytes);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontSize = 10;
  const color = rgb(0, 0, 0);
  const pages = pdfDoc.getPages();

  for (const field of SA466_FIELDS) {
    const value = data[field.id];
    if (!value || value.toLowerCase() === "none" || value.toLowerCase() === "same") continue;

    const page = pages[field.pdf.page];
    if (!page) continue;

    page.drawText(value, {
      x: field.pdf.x,
      y: field.pdf.y,
      size: fontSize,
      font,
      color,
      maxWidth: field.pdf.maxWidth,
    });
  }

  return pdfDoc.save();
}

export function downloadPdf(bytes: Uint8Array, filename: string) {
  const blob = new Blob([bytes.buffer as ArrayBuffer], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
