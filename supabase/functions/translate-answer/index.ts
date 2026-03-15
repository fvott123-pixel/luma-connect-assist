import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { text, sourceLang } = await req.json();
    if (!text || typeof text !== "string") {
      return new Response(JSON.stringify({ translated: text || "" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Don't translate if already English or looks like a date/number
    if (sourceLang === "EN" || /^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}$/.test(text.trim()) || /^\d+$/.test(text.trim())) {
      return new Response(JSON.stringify({ translated: text }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      // Fallback: return original text
      console.error("LOVABLE_API_KEY not configured");
      return new Response(JSON.stringify({ translated: text }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const langMap: Record<string, string> = {
      AR: "Arabic", NP: "Nepali", IT: "Italian", VI: "Vietnamese",
    };
    const fromLang = langMap[sourceLang] || "non-English";

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          {
            role: "system",
            content: `You are a translator. Translate the user's ${fromLang} text to English. Return ONLY the English translation, nothing else. No quotes, no explanation. If the text is already in English, return it as-is. If it's a name, return the name as-is (names don't get translated). Keep it concise.`,
          },
          { role: "user", content: text },
        ],
        stream: false,
      }),
    });

    if (!response.ok) {
      console.error("Translation error:", response.status);
      return new Response(JSON.stringify({ translated: text }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = await response.json();
    const translated = result.choices?.[0]?.message?.content?.trim() || text;

    return new Response(JSON.stringify({ translated }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("translate-answer error:", e);
    return new Response(JSON.stringify({ translated: "" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
