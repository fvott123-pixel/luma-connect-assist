/**
 * Parse natural language date expressions into DD/MM/YYYY format.
 * Supports multiple formats: natural language, compact digits, separators, month names (EN/IT).
 */

const MONTHS: Record<string, number> = {
  january: 1, jan: 1, february: 2, feb: 2, march: 3, mar: 3,
  april: 4, apr: 4, may: 5, june: 6, jun: 6, july: 7, jul: 7,
  august: 8, aug: 8, september: 9, sep: 9, sept: 9,
  october: 10, oct: 10, november: 11, nov: 11, december: 12, dec: 12,
  // Italian
  gennaio: 1, febbraio: 2, marzo: 3, aprile: 4, maggio: 5, giugno: 6,
  luglio: 7, agosto: 8, settembre: 9, ottobre: 10, novembre: 11, dicembre: 12,
  // Arabic month names (transliterated)
  // Vietnamese month names
  "tháng 1": 1, "tháng 2": 2, "tháng 3": 3, "tháng 4": 4,
  "tháng 5": 5, "tháng 6": 6, "tháng 7": 7, "tháng 8": 8,
  "tháng 9": 9, "tháng 10": 10, "tháng 11": 11, "tháng 12": 12,
};

/** Multilingual "today" / "yesterday" / "tomorrow" words */
const TODAY_WORDS = ["today", "oggi", "आज", "اليوم", "hôm nay"];
const YESTERDAY_WORDS = ["yesterday", "ieri", "हिजो", "أمس", "hôm qua"];
const TOMORROW_WORDS = ["tomorrow", "domani", "भोलि", "غداً", "ngày mai"];

function fmt(d: Date): string {
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function isValidDate(dd: number, mm: number, yyyy: number): boolean {
  if (mm < 1 || mm > 12 || dd < 1 || dd > 31 || yyyy < 1900 || yyyy > 2100) return false;
  const d = new Date(yyyy, mm - 1, dd);
  return d.getFullYear() === yyyy && d.getMonth() === mm - 1 && d.getDate() === dd;
}

function fmtParts(dd: number, mm: number, yyyy: number): string {
  return `${String(dd).padStart(2, "0")}/${String(mm).padStart(2, "0")}/${yyyy}`;
}

export type DateParseResult = 
  | { type: "parsed"; parsed: string; label: string }
  | { type: "needDayMonth"; year: string };

/**
 * Try to parse a date string in many formats.
 * Returns parsed date, or a request for more info (bare year), or null.
 */
export function parseNaturalDate(input: string): DateParseResult | null {
  const s = input.trim().toLowerCase();
  if (!s) return null;

  // "today" in any language
  if (TODAY_WORDS.includes(s)) {
    return { type: "parsed", parsed: fmt(new Date()), label: "today's date" };
  }

  // "yesterday" in any language
  if (YESTERDAY_WORDS.includes(s)) {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return { type: "parsed", parsed: fmt(d), label: "yesterday's date" };
  }

  // "tomorrow" in any language
  if (TOMORROW_WORDS.includes(s)) {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return { type: "parsed", parsed: fmt(d), label: "tomorrow's date" };
  }

  // "about X years ago"
  const yearsAgo = s.match(/(?:about|around|roughly|approximately|circa)?\s*(\d+)\s*(?:years?|anni?)\s*(?:ago|fa)/);
  if (yearsAgo) {
    const n = parseInt(yearsAgo[1]);
    const d = new Date();
    d.setFullYear(d.getFullYear() - n);
    return { type: "parsed", parsed: fmt(d), label: `approximately ${n} year${n > 1 ? "s" : ""} ago` };
  }

  // "X months ago"
  const monthsAgo = s.match(/(?:about|around|circa)?\s*(\d+)\s*(?:months?|mesi?)\s*(?:ago|fa)/);
  if (monthsAgo) {
    const n = parseInt(monthsAgo[1]);
    const d = new Date();
    d.setMonth(d.getMonth() - n);
    return { type: "parsed", parsed: fmt(d), label: `approximately ${n} month${n > 1 ? "s" : ""} ago` };
  }

  // Compact 8-digit: DDMMYYYY (e.g. "09091999")
  const compact8 = s.match(/^(\d{8})$/);
  if (compact8) {
    const digits = compact8[1];
    const dd = parseInt(digits.slice(0, 2));
    const mm = parseInt(digits.slice(2, 4));
    const yyyy = parseInt(digits.slice(4, 8));
    if (isValidDate(dd, mm, yyyy)) {
      return { type: "parsed", parsed: fmtParts(dd, mm, yyyy), label: fmtParts(dd, mm, yyyy) };
    }
  }

  // DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY (1 or 2 digit day/month)
  const separated = s.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})$/);
  if (separated) {
    const dd = parseInt(separated[1]);
    const mm = parseInt(separated[2]);
    let yyyy = parseInt(separated[3]);
    if (yyyy < 100) yyyy += yyyy < 30 ? 2000 : 1900;
    if (isValidDate(dd, mm, yyyy)) {
      return { type: "parsed", parsed: fmtParts(dd, mm, yyyy), label: fmtParts(dd, mm, yyyy) };
    }
  }

  // "March 2019" / "Mar 2019" / "marzo 2019"
  const monthYear = s.match(/^([a-zà-ü]+)\s+(\d{4})$/);
  if (monthYear && MONTHS[monthYear[1]] !== undefined) {
    const mm = MONTHS[monthYear[1]];
    return { type: "parsed", parsed: fmtParts(1, mm, parseInt(monthYear[2])), label: `${monthYear[1].charAt(0).toUpperCase() + monthYear[1].slice(1)} ${monthYear[2]}` };
  }

  // "15 March 2019" / "15 Mar 2019" / "9 settembre 1999"
  const dayMonthYear = s.match(/^(\d{1,2})\s+([a-zà-ü]+)\s+(\d{4})$/);
  if (dayMonthYear && MONTHS[dayMonthYear[2]] !== undefined) {
    const dd = parseInt(dayMonthYear[1]);
    const mm = MONTHS[dayMonthYear[2]];
    const yyyy = parseInt(dayMonthYear[3]);
    if (isValidDate(dd, mm, yyyy)) {
      return { type: "parsed", parsed: fmtParts(dd, mm, yyyy), label: input.trim() };
    }
  }

  // "March 15, 2019" / "September 9 1999"
  const monthDayYear = s.match(/^([a-zà-ü]+)\s+(\d{1,2}),?\s+(\d{4})$/);
  if (monthDayYear && MONTHS[monthDayYear[1]] !== undefined) {
    const dd = parseInt(monthDayYear[2]);
    const mm = MONTHS[monthDayYear[1]];
    const yyyy = parseInt(monthDayYear[3]);
    if (isValidDate(dd, mm, yyyy)) {
      return { type: "parsed", parsed: fmtParts(dd, mm, yyyy), label: input.trim() };
    }
  }

  // Bare 4-digit year like "1999" — ask for day and month
  if (/^\d{4}$/.test(s)) {
    const yyyy = parseInt(s);
    if (yyyy >= 1900 && yyyy <= 2100) {
      return { type: "needDayMonth", year: s };
    }
  }

  return null;
}
