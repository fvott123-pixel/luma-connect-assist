import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { image, mimeType, documentType } = await req.json();

    if (!image || typeof image !== "string") {
      return new Response(JSON.stringify({ error: "No image provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!documentType || typeof documentType !== "string") {
      return new Response(JSON.stringify({ error: "No document type specified" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI service unavailable" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const prompts: Record<string, { system: string; fields: Record<string, any> }> = {
      photoId: {
        system: `Extract personal details from this ID document (driver's licence, passport, or government photo ID). Return all visible fields.`,
        fields: {
          firstName: { type: "string", description: "First/given name" },
          surname: { type: "string", description: "Family/last name" },
          dateOfBirth: { type: "string", description: "DD/MM/YYYY format" },
          address: { type: "string", description: "Full street address" },
          suburb: { type: "string" },
          state: { type: "string", description: "State abbreviation" },
          postcode: { type: "string" },
          gender: { type: "string", enum: ["Male", "Female", "Other", ""] },
        },
      },
      medicareCard: {
        system: `Extract details from this Medicare card. Read the card number, expiry, and all names listed.`,
        fields: {
          medicareNumber: { type: "string", description: "Full Medicare card number including the individual reference number (IRN)" },
          medicareExpiry: { type: "string", description: "Expiry date MM/YYYY" },
          namesOnCard: { type: "string", description: "All names listed on the card, comma-separated" },
        },
      },
      centrelinkCard: {
        system: `Extract details from this Centrelink concession card (Health Care Card, Pensioner Concession Card, etc). Read the CRN and name.`,
        fields: {
          crn: { type: "string", description: "Customer Reference Number (9 or 10 digit number)" },
          cardholderName: { type: "string", description: "Name on the card" },
          cardType: { type: "string", description: "Type of card e.g. Health Care Card, Pensioner Concession Card" },
          cardExpiry: { type: "string", description: "Expiry date if visible" },
        },
      },
      bankStatement: {
        system: `Extract bank account details from this bank statement or bank document. Look for BSB number, account number, account name, and bank name.`,
        fields: {
          bankName: { type: "string" },
          bsbNumber: { type: "string", description: "6-digit BSB" },
          accountNumber: { type: "string" },
          accountName: { type: "string", description: "Name on the account" },
        },
      },
      taxReturn: {
        system: `Extract details from this tax return, Centrelink letter, or government correspondence. Look for Tax File Number, Customer Reference Number, and any personal details.`,
        fields: {
          taxFileNumber: { type: "string", description: "9-digit TFN" },
          crn: { type: "string", description: "Centrelink CRN if visible" },
          fullName: { type: "string" },
          address: { type: "string" },
        },
      },
      medicalReport: {
        system: `Extract medical details from this medical report, specialist letter, or medical certificate. Look for diagnosis, treating doctor details, and dates.`,
        fields: {
          primaryCondition: { type: "string", description: "Main diagnosis or condition described" },
          otherConditions: { type: "string", description: "Any other conditions mentioned" },
          treatingDoctor: { type: "string", description: "Doctor's name" },
          doctorAddress: { type: "string", description: "Doctor's practice address" },
          doctorPhone: { type: "string", description: "Doctor's phone number" },
          conditionStartDate: { type: "string", description: "When condition started, DD/MM/YYYY if possible" },
          treatmentDetails: { type: "string", description: "Brief description of treatments or medications mentioned" },
        },
      },
      leaseAgreement: {
        system: `Extract details from this lease, rental agreement, or tenancy document. Look for address, rent amount, landlord/agent details.`,
        fields: {
          rentalAddress: { type: "string", description: "Full rental property address" },
          rentAmount: { type: "string", description: "Rent amount per week or fortnight" },
          rentFrequency: { type: "string", description: "weekly, fortnightly, or monthly" },
          landlordName: { type: "string" },
          landlordPhone: { type: "string" },
          leaseStartDate: { type: "string", description: "DD/MM/YYYY" },
          leaseEndDate: { type: "string", description: "DD/MM/YYYY" },
        },
      },
    };

    const config = prompts[documentType];
    if (!config) {
      return new Response(JSON.stringify({ error: "Unknown document type" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const required = Object.keys(config.fields);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: config.system + ` Return empty string "" for any field you cannot read.` },
          {
            role: "user",
            content: [
              { type: "text", text: "Extract the relevant details from this document." },
              { type: "image_url", image_url: { url: `data:${mimeType || "image/jpeg"};base64,${image}` } },
            ],
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_document_details",
              description: `Extract details from a ${documentType} document`,
              parameters: {
                type: "object",
                properties: config.fields,
                required,
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "extract_document_details" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded, please try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "Failed to process document" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      const extracted = JSON.parse(toolCall.function.arguments);
      return new Response(JSON.stringify({ documentType, extracted }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const content = data.choices?.[0]?.message?.content || "";
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const extracted = JSON.parse(jsonMatch[0]);
      return new Response(JSON.stringify({ documentType, extracted }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Could not extract details from document" }), {
      status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("extract-document error:", e);
    return new Response(JSON.stringify({ error: "An unexpected error occurred" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
