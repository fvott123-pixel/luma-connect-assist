import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { SA466_FIELDS } from "./formMaps/sa466Fields";

export type SA466FormData = Record<string, string>;

const SUPABASE_PDF_URL = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/form-templates/sa466en.pdf`;

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

export async function prefillSA466(data: SA466FormData, signatureDataUrl?: string | null): Promise<Uint8Array> {
  // Try multiple sources for the PDF template
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

    // Use actual page dimensions — never assume 841
    const { width, height } = page.getSize();

    // Convert top-offset y to PDF bottom-left origin y
    const toY = (topOffset: number) => height - topOffset;

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

    // Regular text at bottom-left origin coordinates
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
        const { height: declHeight } = declarationPage.getSize();
        declarationPage.drawImage(sigImage, {
          x: 147,
          y: declHeight - 792, // bottom-left origin
          width: 200,
          height: 50,
        });
      }
    } catch (err) {
      console.warn("Could not embed signature:", err);
    }
  }

  const savedBytes = await pdfDoc.save();
  return savedBytes;
}

export function downloadPdf(bytes: Uint8Array, filename: string) {
  const blob = new Blob([bytes], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
