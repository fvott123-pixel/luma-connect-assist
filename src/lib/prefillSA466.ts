import { PDFDocument, StandardFonts, rgb } from "@cantoo/pdf-lib";
import { SA466_FIELDS } from "./formMaps/sa466Fields";

export type SA466FormData = Record<string, string>;

// Correct path to the PDF template
const PDF_PATHS = [
  "/forms/DSP/sa466en.pdf",
  "/forms/CUsersfvottDesktopGovernment Forms/Disability Support Pension/sa466en.pdf",
];

// Values that mean "no answer" — never write these to the PDF
const SKIP_VALUES = new Set([
  "none", "skip", "n/a", "na", "no answer", "not applicable",
  "-", "--", ".", "..", "...", "nil", "null", "undefined",
]);

function shouldSkipValue(value: string, fieldType: string): boolean {
  if (!value || value.trim() === "") return true;
  const v = value.trim().toLowerCase();
  if (SKIP_VALUES.has(v)) return true;
  // For text fields only: "no" means "I don't have this" — skip it
  // For select/tick fields: "No" is a valid answer (ticked checkbox)
  if (fieldType === "text" && (v === "no" || v === "n")) return true;
  return false;
}

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
  let pdfBytes: ArrayBuffer | null = null;

  for (const url of PDF_PATHS) {
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
    throw new Error("Could not load SA466 PDF template. Check that /forms/DSP/sa466en.pdf exists.");
  }

  const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true, password: "" });
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontSize = 10;
  const color = rgb(0, 0, 0);
  const pages = pdfDoc.getPages();

  for (const field of SA466_FIELDS) {
    const value = data[field.id];

    // Skip declaration/signature fields
    if (field.id === "declarationComplete" || field.id === "declarationSignature") continue;

    // Skip empty or skip-value answers
    if (!value || shouldSkipValue(value, field.fieldType)) continue;

    // Skip postalAddress if postalAddressSame is "Yes"
    if (field.id === "postalAddress" && data["postalAddressSame"]?.toLowerCase() === "yes") continue;

    // Skip postalAddressSame field entirely — no checkbox exists
    if (field.id === "postalAddressSame") continue;

    const page = pages[field.pageNumber];
    if (!page) continue;

    // ── Tick mark for select fields ──
    if (field.tickPositions && field.tickPositions[value]) {
      const pos = field.tickPositions[value];
      page.drawText("✓", {
        x: pos.x,
        y: pos.y,
        size: 9,
        font: fontBold,
        color,
      });
      continue;
    }

    // ── Date fields ──
    if (field.fieldType === "date" && field.dateBoxes) {
      const parts = parseDateParts(value);
      if (parts) {
        const boxes = field.dateBoxes;
        page.drawText(parts.dd, { x: boxes.ddX, y: boxes.ddY, size: fontSize, font, color });
        page.drawText(parts.mm, { x: boxes.mmX, y: boxes.mmY, size: fontSize, font, color });
        page.drawText(parts.yyyy, { x: boxes.yyyyX, y: boxes.yyyyY, size: fontSize, font, color });
      }
      continue;
    }

    // ── Text fields ──
    const displayValue = String(value).trim();
    if (!displayValue) continue;

    const maxWidth = field.maxWidth || 220;
    const charWidth = fontSize * 0.55;
    const maxChars = Math.floor(maxWidth / charWidth);

    if (displayValue.length > maxChars) {
      // Wrap long text into multiple lines
      const words = displayValue.split(" ");
      const lines: string[] = [];
      let current = "";

      for (const word of words) {
        if ((current + " " + word).trim().length <= maxChars) {
          current = (current + " " + word).trim();
        } else {
          if (current) lines.push(current);
          current = word;
        }
      }
      if (current) lines.push(current);

      const lineHeight = fontSize + 3;
      lines.forEach((line, i) => {
        page.drawText(line, {
          x: field.x,
          y: field.y - i * lineHeight,
          size: fontSize,
          font,
          color,
        });
      });
    } else {
      page.drawText(displayValue, {
        x: field.x,
        y: field.y,
        size: fontSize,
        font,
        color,
      });
    }
  }

  // Embed signature if provided
  if (signatureDataUrl) {
    try {
      const base64 = signatureDataUrl.split(",")[1];
      const sigBytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
      const sigImage = await pdfDoc.embedPng(sigBytes);
      const lastPage = pages[pages.length - 1];
      if (lastPage) {
        const { width: pageWidth } = lastPage.getSize();
        lastPage.drawImage(sigImage, {
          x: pageWidth - 220,
          y: 80,
          width: 160,
          height: 50,
        });
      }
    } catch (e) {
      console.warn("Could not embed signature:", e);
    }
  }

  return pdfDoc.save();
}

export function downloadPdf(bytes: Uint8Array, filename: string) {
  const blob = new Blob([bytes], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
