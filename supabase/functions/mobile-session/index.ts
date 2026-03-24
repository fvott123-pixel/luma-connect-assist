import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    if (req.method === "POST") {
      const { session_code, extracted, summaries } = await req.json();
      if (!session_code || !extracted) {
        return new Response(JSON.stringify({ error: "Missing session_code or extracted" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Fetch existing row to merge
      const { data: existing } = await supabase
        .from("mobile_upload_sessions")
        .select("extracted, summaries")
        .eq("session_code", session_code)
        .maybeSingle();

      const mergedExtracted = { ...(existing?.extracted as Record<string, string> ?? {}), ...extracted };
      const prevSummaries = (existing?.summaries as string[] ?? []);
      const incomingSummaries = summaries ?? [];
      const freshSummaries = incomingSummaries.filter((s: string) => !prevSummaries.includes(s));
      const mergedSummaries = [...prevSummaries, ...freshSummaries];
      const doc_count = mergedSummaries.length;

      const { error } = await supabase
        .from("mobile_upload_sessions")
        .upsert(
          {
            session_code,
            extracted: mergedExtracted,
            summaries: mergedSummaries,
            doc_count,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "session_code" },
        );

      if (error) throw error;

      return new Response(JSON.stringify({ ok: true, doc_count }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (req.method === "GET") {
      const url = new URL(req.url);
      const code = url.searchParams.get("code");
      if (!code) {
        return new Response(JSON.stringify({ error: "Missing code param" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data, error } = await supabase
        .from("mobile_upload_sessions")
        .select("extracted, summaries, doc_count")
        .eq("session_code", code)
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        return new Response(JSON.stringify({ extracted: {}, summaries: [], doc_count: 0 }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({
        extracted: data.extracted,
        summaries: data.summaries,
        doc_count: data.doc_count,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("mobile-session error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
