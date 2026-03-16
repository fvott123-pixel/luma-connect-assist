import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { SA466_FIELDS } from "./formMaps/sa466Fields";

const SUPABASE_PDF_URL = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/form-templates/sa466en.pdf`;

export type SA466FormData = Record<string, string>;

/**
 * Parse a date string into parts for writing into separate boxes.
 */
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

/**
 * Fill in SA466 DSP form PDF with collected answers at their mapped coordinates.
 * Handles text, tick marks, and split date fields.
 */
export async function prefillSA466(data: SA466FormData, signatureDataUrl?: string | null): Promise<Uint8Array> {
  const paths = [
    SUPABASE_PDF_URL,
    `/forms/DSP/sa466en.pdf`,
    `/forms/CUsersfvottDesktopGovernment%20Forms/Disability%20Support%20Pension/sa466en.pdf`,
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
      console.warn("SA466 fetch error for", url, err);
    }
  }

  if (!pdfBytes) {
    throw new Error("Could not load SA466 PDF template.");
  }

  const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontSize = 11;
  const color = rgb(0, 0, 0);
  const pages = pdfDoc.getPages();

  for (const field of SA466_FIELDS) {
    const value = data[field.id];
    if (!value || value.toLowerCase() === "none" || value.toLowerCase() === "skip") continue;
    if (field.id === "declarationComplete" || field.id === "declarationSignature") continue;

    const page = pages[field.pageNumber];
    if (!page) continue;

    const { height: pageHeight } = page.getSize();

    // Convert top-offset y to PDF bottom-origin y
    const toY = (topOffset: number) => pageHeight - topOffset;

    // Tick marks for select fields
    if (field.tickPositions && field.tickPositions[value]) {
      const pos = field.tickPositions[value];
      page.drawText("X", {
        x: pos.x,
        y: toY(pos.y),
        size: 12,
        font: fontBold,
        color,
      });
      continue;
    }

    // Date fields — split into DD/MM/YYYY boxes
    if (field.fieldType === "date" && field.dateBoxes) {
      const parts = parseDateParts(value);
      if (parts) {
        const boxes = field.dateBoxes;
        page.drawText(parts.dd, { x: boxes.ddX, y: toY(boxes.ddY), size: fontSize, font, color });
        page.drawText(parts.mm, { x: boxes.mmX, y: toY(boxes.mmY), size: fontSize, font, color });
        page.drawText(parts.yyyy, { x: boxes.yyyyX, y: toY(boxes.yyyyY), size: fontSize, font, color });
        continue;
      }
    }

    // Regular text
    page.drawText(value, {
      x: field.x,
      y: toY(field.y),
      size: fontSize,
      font,
      color,
      maxWidth: field.maxWidth,
    });
  }

  // Embed signature if provided
  if (signatureDataUrl) {
    try {
      const sigResponse = await fetch(signatureDataUrl);
      const sigBytes = new Uint8Array(await sigResponse.arrayBuffer());
      const sigImage = await pdfDoc.embedPng(sigBytes);
      const declarationPage = pages[21]; // Part I Declaration page
      if (declarationPage) {
        declarationPage.drawImage(sigImage, {
          x: 147,
          y: 50,
          width: 200,
          height: 50,
        });
      }
    } catch (err) {
      console.warn("Could not embed signature:", err);
    }
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
