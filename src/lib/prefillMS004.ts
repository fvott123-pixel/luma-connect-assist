import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export interface MS004FormData {
  title: string; // Mr, Mrs, Ms, Miss, Dr
  firstName: string;
  surname: string;
  dob: string; // DD/MM/YYYY
  gender: string; // Male, Female, Other
  address: string;
  suburb: string;
  state: string;
  postcode: string;
  phone: string;
  email: string;
}

// Coordinate map for MS004 Medicare Enrolment form (ms004en.pdf)
// These are approximate positions based on the standard Services Australia MS004 layout.
// Coordinates are (x, y) from bottom-left of the page in PDF points (1pt = 1/72 inch).
// The form is A4 (595 x 842 points). Fields are on page 3 (index 2) of the PDF.
// Adjust these values if the form layout changes.

const FIELD_MAP: Record<keyof MS004FormData, { page: number; x: number; y: number; maxWidth?: number }> = {
  title:     { page: 2, x: 120, y: 672 },
  surname:   { page: 2, x: 120, y: 644 },
  firstName: { page: 2, x: 120, y: 616 },
  dob:       { page: 2, x: 120, y: 588 },
  gender:    { page: 2, x: 120, y: 560 },
  address:   { page: 2, x: 120, y: 532, maxWidth: 400 },
  suburb:    { page: 2, x: 120, y: 504 },
  state:     { page: 2, x: 370, y: 504 },
  postcode:  { page: 2, x: 450, y: 504 },
  phone:     { page: 2, x: 120, y: 476 },
  email:     { page: 2, x: 120, y: 448, maxWidth: 400 },
};

export async function prefillMS004(data: MS004FormData): Promise<Uint8Array> {
  const origin = window.location.origin;
  const paths = [
    `${origin}/forms/Medicare/ms004en.pdf`,
    `${origin}/forms/CUsersfvottDesktopGovernment%20Forms/Medicare/ms004en.pdf`,
  ];

  let existingPdfBytes: ArrayBuffer | null = null;
  for (const url of paths) {
    try {
      console.log("Fetching PDF from:", url);
      const res = await fetch(url);
      if (res.ok) {
        existingPdfBytes = await res.arrayBuffer();
        console.log("Successfully loaded MS004 PDF from:", url);
        break;
      } else {
        console.warn(`Failed to fetch ${url}: ${res.status} ${res.statusText}`);
      }
    } catch (err) {
      console.warn(`Fetch error for ${url}:`, err);
    }
  }

  if (!existingPdfBytes) {
    const msg = "Could not load MS004 PDF. Tried: " + paths.join(", ");
    alert(msg);
    throw new Error(msg);
  }

  const pdfDoc = await PDFDocument.load(existingPdfBytes);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontSize = 10;
  const color = rgb(0, 0, 0);

  const pages = pdfDoc.getPages();

  for (const [key, mapping] of Object.entries(FIELD_MAP)) {
    const value = data[key as keyof MS004FormData];
    if (!value) continue;

    const page = pages[mapping.page];
    if (!page) continue;

    page.drawText(value, {
      x: mapping.x,
      y: mapping.y,
      size: fontSize,
      font,
      color,
      maxWidth: mapping.maxWidth,
    });
  }

  return pdfDoc.save();
}

export function downloadPdfBlob(bytes: Uint8Array, filename: string) {
  const blob = new Blob([bytes.buffer as ArrayBuffer], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
