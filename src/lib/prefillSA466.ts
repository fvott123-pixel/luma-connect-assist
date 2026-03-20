import { PDFDocument, StandardFonts, rgb } from "@cantoo/pdf-lib";
import { SA466_FIELDS } from "./formMaps/sa466Fields";

export type SA466FormData = Record<string, string>;

// ── Cache: fetch template PDF once, reuse forever ──
let _templateCache: ArrayBuffer | null = null;

const PDF_PATHS = [
  "/forms/DSP/sa466en.pdf",
  "/forms/CUsersfvottDesktopGovernment Forms/Disability Support Pension/sa466en.pdf",
];

async function getTemplate(): Promise<ArrayBuffer> {
  if (_templateCache) return _templateCache;
  for (const url of PDF_PATHS) {
    try {
      const res = await fetch(url);
      if (res.ok) {
        _templateCache = await res.arrayBuffer();
        console.log("SA466 template cached from:", url, `(${Math.round(_templateCache.byteLength / 1024)}KB)`);
        return _templateCache;
      }
    } catch (e) {
      console.warn("SA466 fetch error:", url, e);
    }
  }
  throw new Error("Could not load SA466 PDF template.");
}

// Values that mean "no answer" — never write to PDF
const SKIP_VALUES = new Set([
  "none", "skip", "n/a", "na", "no answer", "not applicable",
  "-", "--", ".", "..", "...", "nil", "null", "undefined", "n",
]);

function shouldSkip(value: string, fieldType: string): boolean {
  if (!value || value.trim() === "") return true;
  const v = value.trim().toLowerCase();
  if (SKIP_VALUES.has(v)) return true;
  // For text fields: "no" means the user doesn't have this — skip it
  // For select/tick: "No" is a valid tick mark
  if (fieldType === "text" && v === "no") return true;
  return false;
}

function parseDateParts(value: string): { dd: string; mm: string; yyyy: string } | null {
  const m = value.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (!m) return null;
  return {
    dd: m[1].padStart(2, "0"),
    mm: m[2].padStart(2, "0"),
    yyyy: m[3].length === 2 ? `19${m[3]}` : m[3],
  };
}

export async function prefillSA466(data: SA466FormData, signatureDataUrl?: string | null): Promise<Uint8Array> {
  // Load template (cached after first call)
  const templateBytes = await getTemplate();

  // Copy the template bytes so we can modify without corrupting the cache
  const pdfBytes = templateBytes.slice(0);
  const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true, password: "" });
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontSize = 10;
  const color = rgb(0, 0, 0);
  const pages = pdfDoc.getPages();

  for (const field of SA466_FIELDS) {
    const value = data[field.id];
    if (field.id === "declarationComplete" || field.id === "declarationSignature") continue;
    if (!value || shouldSkip(value, field.fieldType)) continue;
    if (field.id === "postalAddress" && data["postalAddressSame"]?.toLowerCase() === "yes") continue;
    if (field.id === "postalAddressSame") continue;

    const page = pages[field.pageNumber];
    if (!page) continue;

    // Tick marks
    if (field.tickPositions) {
      const pos = field.tickPositions[value];
      if (pos) {
        page.drawText("✓", { x: pos.x, y: pos.y, size: 9, font: fontBold, color });
        continue;
      }
    }

    // Date fields
    if (field.fieldType === "date" && field.dateBoxes) {
      const parts = parseDateParts(value);
      if (parts) {
        const b = field.dateBoxes;
        page.drawText(parts.dd,   { x: b.ddX,   y: b.ddY,   size: fontSize, font, color });
        page.drawText(parts.mm,   { x: b.mmX,   y: b.mmY,   size: fontSize, font, color });
        page.drawText(parts.yyyy, { x: b.yyyyX, y: b.yyyyY, size: fontSize, font, color });
      }
      continue;
    }

    // Text fields
    const text = value.trim();
    if (!text) continue;

    const maxWidth = field.maxWidth || 220;
    const charsPerLine = Math.floor(maxWidth / (fontSize * 0.55));

    if (text.length > charsPerLine) {
      const words = text.split(" ");
      const lines: string[] = [];
      let cur = "";
      for (const word of words) {
        if ((cur + " " + word).trim().length <= charsPerLine) {
          cur = (cur + " " + word).trim();
        } else {
          if (cur) lines.push(cur);
          cur = word;
        }
      }
      if (cur) lines.push(cur);
      lines.forEach((line, i) => {
        page.drawText(line, { x: field.x, y: field.y - i * (fontSize + 3), size: fontSize, font, color });
      });
    } else {
      page.drawText(text, { x: field.x, y: field.y, size: fontSize, font, color });
    }
  }

  // Signature
  if (signatureDataUrl) {
    try {
      const base64 = signatureDataUrl.split(",")[1];
      const sigBytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
      const sigImage = await pdfDoc.embedPng(sigBytes);
      const lastPage = pages[pages.length - 1];
      if (lastPage) {
        const { width: pw } = lastPage.getSize();
        lastPage.drawImage(sigImage, { x: pw - 220, y: 80, width: 160, height: 50 });
      }
    } catch (e) {
      console.warn("Signature embed failed:", e);
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
