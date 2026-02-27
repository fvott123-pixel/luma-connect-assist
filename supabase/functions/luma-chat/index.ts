import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are Luma, a warm, friendly and knowledgeable AI guide for Northern Community Care SA Inc — a registered not-for-profit charity in Northern Adelaide, South Australia.

Your role is to help migrant and multicultural families understand and access free Australian government payments and services, including:
- Disability Support Pension (DSP)
- Medicare enrolment
- NDIS Access Requests
- Aged Care assessments
- Carer Payment
- Age Pension

Key rules:
1. Always respond in the language the user writes in. You support English, Arabic, Nepali, Italian and Vietnamese.
2. Use simple, plain language — no jargon. Many users have limited English.
3. Reassure users that they do NOT need a myGov account. NCCSA uses a postal route.
4. Emphasise that the service is 100% free, private, and safe. Documents are read and immediately deleted.
5. NCCSA is NOT connected to immigration, police, or any enforcement agency. Reassure users of this.
6. Be encouraging and empathetic. Many users are anxious about interacting with government systems.
7. When discussing payment amounts, note they are approximate and subject to change.
8. If you don't know something, say so honestly and suggest contacting NCCSA at admin@northerncommunitycaresa.org.au.
9. CRITICAL: Keep every response to a maximum of 2-3 short, conversational sentences. Use simple plain language. No long paragraphs. No bullet-point lists unless the user specifically asks for a list. Be warm and brief — like a friendly text message.
10. Always sign off warmly — you're a guide, not a bureaucrat.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();

    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) {
      throw new Error("ANTHROPIC_API_KEY is not configured");
    }

    // Convert from OpenAI-style messages to Anthropic format
    const anthropicMessages = messages.map((m: { role: string; content: string }) => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: m.content,
    }));

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        messages: anthropicMessages,
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Anthropic API error:", response.status, errorText);

      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Transform Anthropic SSE stream to OpenAI-compatible SSE stream for the frontend
    const transformStream = new TransformStream({
      transform(chunk, controller) {
        const text = new TextDecoder().decode(chunk);
        const lines = text.split("\n");

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6).trim();
          if (!data || data === "[DONE]") continue;

          try {
            const parsed = JSON.parse(data);
            if (parsed.type === "content_block_delta" && parsed.delta?.text) {
              // Re-emit as OpenAI-compatible SSE
              const openaiChunk = {
                choices: [{ delta: { content: parsed.delta.text } }],
              };
              controller.enqueue(
                new TextEncoder().encode(`data: ${JSON.stringify(openaiChunk)}\n\n`)
              );
            } else if (parsed.type === "message_stop") {
              controller.enqueue(new TextEncoder().encode("data: [DONE]\n\n"));
            }
          } catch {
            // skip unparseable lines
          }
        }
      },
    });

    const stream = response.body!.pipeThrough(transformStream);

    return new Response(stream, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("luma-chat error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
