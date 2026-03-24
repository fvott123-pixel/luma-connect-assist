/**
 * Mobile ↔ Desktop session sync via Supabase Edge Function.
 * Phone uploads documents → data syncs to desktop in real-time.
 */

const EDGE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/mobile-session`;
const ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const HEADERS = {
  "Content-Type": "application/json",
  "apikey": ANON_KEY,
};

/** Push newly extracted data from mobile to the shared session */
export async function pushMobileData(
  sessionCode: string,
  extracted: Record<string, string>,
  summaries: string[],
): Promise<void> {
  const res = await fetch(EDGE_URL, {
    method: "POST",
    headers: HEADERS,
    body: JSON.stringify({ session_code: sessionCode, extracted, summaries }),
  });
  if (!res.ok) throw new Error("mobile-session sync failed");
}

/** Poll for data synced from mobile — returns null if nothing found */
export async function pollMobileData(sessionCode: string): Promise<{
  extracted: Record<string, string>;
  summaries: string[];
  doc_count: number;
} | null> {
  try {
    const res = await fetch(`${EDGE_URL}?code=${sessionCode}`, { headers: HEADERS });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/** Generate a random 6-digit session code */
export function generateMobileCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}
