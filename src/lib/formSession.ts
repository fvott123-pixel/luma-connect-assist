/**
 * localStorage-based save/resume for form filling sessions.
 */

const STORAGE_KEY = "luma_form_session";
const CODE_KEY = "luma_session_codes";

export interface FormSession {
  slug: string;
  lang: string;
  answers: Record<string, string>;
  fieldIndex: number;
  sessionCode: string;
  updatedAt: number;
}

/** Generate a 6-digit session code */
function generateCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function storageKey(slug: string) {
  return `${STORAGE_KEY}_${slug}`;
}

export function saveSession(slug: string, lang: string, answers: Record<string, string>, fieldIndex: number): string {
  const existing = loadSession(slug);
  const sessionCode = existing?.sessionCode || generateCode();
  const session: FormSession = { slug, lang, answers, fieldIndex, sessionCode, updatedAt: Date.now() };
  try {
    localStorage.setItem(storageKey(slug), JSON.stringify(session));
    // Also index by code for recovery
    const codes: Record<string, string> = JSON.parse(localStorage.getItem(CODE_KEY) || "{}");
    codes[sessionCode] = slug;
    localStorage.setItem(CODE_KEY, JSON.stringify(codes));
  } catch (e) {
    console.warn("Failed to save session:", e);
  }
  return sessionCode;
}

export function loadSession(slug: string): FormSession | null {
  try {
    const raw = localStorage.getItem(storageKey(slug));
    if (!raw) return null;
    const session: FormSession = JSON.parse(raw);
    if (session.slug !== slug) return null;
    if (Object.keys(session.answers).length === 0) return null;
    return session;
  } catch {
    return null;
  }
}

export function loadSessionByCode(code: string): FormSession | null {
  try {
    const codes: Record<string, string> = JSON.parse(localStorage.getItem(CODE_KEY) || "{}");
    const slug = codes[code];
    if (!slug) return null;
    return loadSession(slug);
  } catch {
    return null;
  }
}

export function clearSession(slug: string) {
  try {
    const existing = loadSession(slug);
    localStorage.removeItem(storageKey(slug));
    if (existing?.sessionCode) {
      const codes: Record<string, string> = JSON.parse(localStorage.getItem(CODE_KEY) || "{}");
      delete codes[existing.sessionCode];
      localStorage.setItem(CODE_KEY, JSON.stringify(codes));
    }
  } catch {
    // ignore
  }
}
