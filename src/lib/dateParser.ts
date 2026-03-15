/**
 * Parse natural language date expressions into DD/MM/YYYY format.
 */

const MONTHS: Record<string, number> = {
  january: 1, jan: 1, february: 2, feb: 2, march: 3, mar: 3,
  april: 4, apr: 4, may: 5, june: 6, jun: 6, july: 7, jul: 7,
  august: 8, aug: 8, september: 9, sep: 9, sept: 9,
  october: 10, oct: 10, november: 11, nov: 11, december: 12, dec: 12,
};

function fmt(d: Date): string {
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

/**
 * Try to parse a natural-language date string.
 * Returns { parsed: string (DD/MM/YYYY), label: string } or null if not a date expression.
 */
export function parseNaturalDate(input: string): { parsed: string; label: string } | null {
  const s = input.trim().toLowerCase();

  // "today"
  if (s === "today") {
    return { parsed: fmt(new Date()), label: "today's date" };
  }

  // "yesterday"
  if (s === "yesterday") {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return { parsed: fmt(d), label: "yesterday's date" };
  }

  // "tomorrow"
  if (s === "tomorrow") {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return { parsed: fmt(d), label: "tomorrow's date" };
  }

  // "about X years ago" / "around X years ago" / "X years ago"
  const yearsAgo = s.match(/(?:about|around|roughly|approximately)?\s*(\d+)\s*years?\s*ago/);
  if (yearsAgo) {
    const n = parseInt(yearsAgo[1]);
    const d = new Date();
    d.setFullYear(d.getFullYear() - n);
    return { parsed: fmt(d), label: `approximately ${n} year${n > 1 ? "s" : ""} ago` };
  }

  // "X months ago"
  const monthsAgo = s.match(/(?:about|around)?\s*(\d+)\s*months?\s*ago/);
  if (monthsAgo) {
    const n = parseInt(monthsAgo[1]);
    const d = new Date();
    d.setMonth(d.getMonth() - n);
    return { parsed: fmt(d), label: `approximately ${n} month${n > 1 ? "s" : ""} ago` };
  }

  // "March 2019" / "Mar 2019"
  const monthYear = s.match(/^([a-z]+)\s+(\d{4})$/);
  if (monthYear && MONTHS[monthYear[1]] !== undefined) {
    const mm = String(MONTHS[monthYear[1]]).padStart(2, "0");
    return { parsed: `01/${mm}/${monthYear[2]}`, label: `${monthYear[1].charAt(0).toUpperCase() + monthYear[1].slice(1)} ${monthYear[2]}` };
  }

  // "15 March 2019" / "15 Mar 2019"
  const dayMonthYear = s.match(/^(\d{1,2})\s+([a-z]+)\s+(\d{4})$/);
  if (dayMonthYear && MONTHS[dayMonthYear[2]] !== undefined) {
    const dd = dayMonthYear[1].padStart(2, "0");
    const mm = String(MONTHS[dayMonthYear[2]]).padStart(2, "0");
    return { parsed: `${dd}/${mm}/${dayMonthYear[3]}`, label: input.trim() };
  }

  // "March 15, 2019"
  const monthDayYear = s.match(/^([a-z]+)\s+(\d{1,2}),?\s+(\d{4})$/);
  if (monthDayYear && MONTHS[monthDayYear[1]] !== undefined) {
    const dd = monthDayYear[2].padStart(2, "0");
    const mm = String(MONTHS[monthDayYear[1]]).padStart(2, "0");
    return { parsed: `${dd}/${mm}/${monthDayYear[3]}`, label: input.trim() };
  }

  // Already DD/MM/YYYY — pass through
  if (/^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}$/.test(s)) {
    return null; // already formatted, no conversion needed
  }

  return null;
}
