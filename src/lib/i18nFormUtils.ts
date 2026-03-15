/**
 * Shared multilingual utilities for form filling.
 * Maps yes/no in all 5 languages to English, provides translation helpers.
 */

/** Map multilingual yes/no to English "Yes"/"No" for tick boxes */
const YES_WORDS = new Set([
  "yes", "yep", "yeah", "ya", "yea", "sure", "ok", "okay", "correct", "right",
  "sì", "si", "certo", "esatto",               // Italian
  "نعم", "أجل", "صحيح", "موافق",                // Arabic
  "हो", "छ", "हुन्छ", "ठीक",                    // Nepali
  "có", "vâng", "đúng", "ừ", "phải",            // Vietnamese
]);

const NO_WORDS = new Set([
  "no", "nope", "nah", "not really",
  "no",                                          // Italian (same)
  "لا", "كلا",                                   // Arabic
  "होइन", "छैन",                                  // Nepali
  "không", "không phải",                          // Vietnamese
]);

/**
 * Check if a user's answer is a yes/no in any language.
 * Returns "Yes", "No", or null if not a yes/no answer.
 */
export function mapYesNo(answer: string): "Yes" | "No" | null {
  const s = answer.trim().toLowerCase();
  if (YES_WORDS.has(s)) return "Yes";
  if (NO_WORDS.has(s)) return "No";
  return null;
}

/** 
 * All "today"-like words that should auto-fill today's date 
 * (including yes/confirmation words when asked about today's date)
 */
export const TODAY_CONFIRMATION_PATTERN = /^(yes|yep|yeah|sure|ok|okay|today|yes please|yea|ya|go ahead|that's fine|thats fine|sì|si|certo|oggi|va bene|نعم|اليوم|هو|هل|हो|आज|có|hôm nay|vâng|ừ)$/i;

/**
 * Format today's date as DD/MM/YYYY
 */
export function getTodayFormatted(): string {
  const now = new Date();
  return `${String(now.getDate()).padStart(2, "0")}/${String(now.getMonth() + 1).padStart(2, "0")}/${now.getFullYear()}`;
}

/** Translate URL (constructed at call site) */
const TRANSLATE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/translate-answer`;

/**
 * Translate text to English via the translate-answer edge function.
 * Returns original text on failure.
 */
export async function translateToEnglish(text: string, sourceLang: string): Promise<string> {
  // Skip translation for English, dates, numbers, and very short inputs that are likely codes
  if (sourceLang === "EN") return text;
  if (/^\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}$/.test(text.trim())) return text;
  if (/^\d+$/.test(text.trim())) return text;

  try {
    const resp = await fetch(TRANSLATE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({ text, sourceLang }),
    });
    if (!resp.ok) return text;
    const data = await resp.json();
    return data.translated || text;
  } catch {
    return text;
  }
}
