import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const prompts: Record<string, { system: string; fields: Record<string, any> }> = {
  licenceFront: {
    system: `Extract personal details from the FRONT of this Australian driver's licence. Read all visible fields carefully.`,
    fields: {
      firstName: { type: "string", description: "First/given name" },
      surname: { type: "string", description: "Family/last name" },
      dateOfBirth: { type: "string", description: "DD/MM/YYYY format" },
      address: { type: "string", description: "Full street address" },
      suburb: { type: "string" },
      state: { type: "string", description: "State abbreviation" },
      postcode: { type: "string" },
      licenceNumber: { type: "string", description: "Driver's licence number" },
      expiryDate: { type: "string", description: "Licence expiry DD/MM/YYYY" },
      gender: { type: "string", enum: ["Male", "Female", "Other", ""] },
    },
  },
  licenceBack: {
    system: `Extract details from the BACK of this Australian driver's licence. Read any address, licence number, or class information visible.`,
    fields: {
      address: { type: "string", description: "Address if visible" },
      licenceNumber: { type: "string", description: "Licence number if visible" },
      licenceClass: { type: "string", description: "Licence class/type" },
      conditions: { type: "string", description: "Any conditions listed" },
    },
  },
  passport: {
    system: `Extract personal details from the photo page of this passport. Read the MRZ (machine readable zone) at the bottom if visible for accuracy.`,
    fields: {
      firstName: { type: "string", description: "First/given name(s)" },
      surname: { type: "string", description: "Family/last name" },
      dateOfBirth: { type: "string", description: "DD/MM/YYYY format" },
      passportNumber: { type: "string", description: "Passport document number" },
      nationality: { type: "string", description: "Nationality / country of citizenship" },
      expiryDate: { type: "string", description: "Passport expiry DD/MM/YYYY" },
      gender: { type: "string", enum: ["Male", "Female", "Other", ""] },
      placeOfBirth: { type: "string", description: "Place or country of birth if visible" },
      countryOfBirth: { type: "string", description: "Country of birth if visible" },
    },
  },
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
  taxLetter: {
    system: `Extract details from this ATO tax letter, myGov letter, or government correspondence. Look for Tax File Number, Customer Reference Number, and any personal details.`,
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
  doctorLetter: {
    system: `Extract details from this doctor or GP letter. Look for doctor name, profession, clinic address, phone number, and any condition or treatment mentioned.`,
    fields: {
      treatingDoctor: { type: "string", description: "Doctor's full name" },
      doctorProfession: { type: "string", description: "Doctor's specialty or profession e.g. General Practitioner, Psychiatrist" },
      doctorAddress: { type: "string", description: "Practice/clinic address" },
      doctorPhone: { type: "string", description: "Phone number" },
      primaryCondition: { type: "string", description: "Main condition or diagnosis mentioned" },
      currentTreatment: { type: "string", description: "Current treatment or medications described" },
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
  partnerLicence: {
    system: `Extract personal details from this driver's licence. This belongs to the applicant's PARTNER. Read all visible fields.`,
    fields: {
      firstName: { type: "string", description: "Partner's first/given name" },
      surname: { type: "string", description: "Partner's family/last name" },
      dateOfBirth: { type: "string", description: "DD/MM/YYYY format" },
      address: { type: "string", description: "Full street address" },
      suburb: { type: "string" },
      state: { type: "string", description: "State abbreviation" },
      postcode: { type: "string" },
      gender: { type: "string", enum: ["Male", "Female", "Other", ""] },
    },
  },
  partnerPassport: {
    system: `Extract personal details from this passport photo page. This belongs to the applicant's PARTNER. Read all visible fields.`,
    fields: {
      firstName: { type: "string", description: "Partner's first/given name(s)" },
      surname: { type: "string", description: "Partner's family/last name" },
      dateOfBirth: { type: "string", description: "DD/MM/YYYY format" },
      gender: { type: "string", enum: ["Male", "Female", "Other", ""] },
      countryOfBirth: { type: "string", description: "Country of birth" },
      placeOfBirth: { type: "string", description: "Place of birth" },
      nationality: { type: "string" },
    },
  },
  separationCertificate: {
    system: `Extract details from this Employment Separation Certificate (SU001 form) or employment termination document.`,
    fields: {
      employerName: { type: "string", description: "Name of the employer" },
      separationDate: { type: "string", description: "Date employment ended DD/MM/YYYY" },
      reasonForSeparation: { type: "string", description: "Reason for leaving e.g. redundancy, resignation, contract ended" },
      lastPayDate: { type: "string", description: "Date of last payment DD/MM/YYYY" },
      grossPayment: { type: "string", description: "Final gross payment amount" },
    },
  },
  superStatement: {
    system: `Extract details from this superannuation statement. Look for the fund name, member number, account balance.`,
    fields: {
      superFundName: { type: "string", description: "Name of the super fund" },
      memberNumber: { type: "string", description: "Member or account number" },
      superBalance: { type: "string", description: "Total account balance amount" },
    },
  },
  payslips: {
    system: `Extract details from this payslip or pay summary. Look for employer name, pay period, gross/net pay, hours worked.`,
    fields: {
      employerName: { type: "string", description: "Name of the employer" },
      grossPay: { type: "string", description: "Gross pay amount for the period" },
      netPay: { type: "string", description: "Net (take-home) pay amount" },
      hoursWorked: { type: "string", description: "Total hours worked in the period" },
      payPeriod: { type: "string", description: "Pay period dates" },
    },
  },
  birthCertificate: {
    system: `Extract details from this birth certificate. Look for full name, date of birth, place of birth, parents' names.`,
    fields: {
      firstName: { type: "string", description: "First/given name(s)" },
      surname: { type: "string", description: "Family/last name" },
      dateOfBirth: { type: "string", description: "DD/MM/YYYY format" },
      placeOfBirth: { type: "string", description: "Place of birth (city/town)" },
      countryOfBirth: { type: "string", description: "Country of birth" },
    },
  },
  marriageCertificate: {
    system: `Extract details from this marriage or relationship certificate. Look for names of both parties, date of marriage/registration, and type of relationship.`,
    fields: {
      marriageDate: { type: "string", description: "Date of marriage DD/MM/YYYY" },
      relationshipType: { type: "string", description: "married, de facto, registered relationship" },
      party1Name: { type: "string", description: "Full name of first party" },
      party2Name: { type: "string", description: "Full name of second party" },
    },
  },
  hospitalDischarge: {
    system: `Extract details from this hospital discharge summary. Look for diagnosis, treatment, attending doctor, hospital name.`,
    fields: {
      primaryCondition: { type: "string", description: "Main diagnosis or reason for admission" },
      diagnoses: { type: "string", description: "All diagnoses mentioned, comma-separated" },
      treatingDoctor: { type: "string", description: "Attending/treating doctor name" },
      hospital: { type: "string", description: "Hospital name" },
      currentTreatment: { type: "string", description: "Treatment given or ongoing treatment plan" },
      admissionDate: { type: "string", description: "Date admitted DD/MM/YYYY" },
      dischargeDate: { type: "string", description: "Date discharged DD/MM/YYYY" },
    },
  },
  medicationList: {
    system: `Extract details from this medication list, prescription, or pharmacy printout. Look for medication names, prescribing doctor, pharmacy details.`,
    fields: {
      medications: { type: "string", description: "List of all medications with dosages, comma-separated" },
      prescribingDoctor: { type: "string", description: "Name of the prescribing doctor" },
      doctorPhone: { type: "string", description: "Doctor's phone number if visible" },
      practiceAddress: { type: "string", description: "Doctor's practice or pharmacy address" },
    },
  },
  programOfSupportCert: {
    system: `Extract details from this Program of Support certificate or letter from Workforce Australia, jobactive, Disability Employment Services, or similar job program.`,
    fields: {
      providerName: { type: "string", description: "Name of the employment services provider" },
      startDate: { type: "string", description: "Program start date DD/MM/YYYY" },
      endDate: { type: "string", description: "Program end date DD/MM/YYYY" },
      programType: { type: "string", description: "Type of program e.g. Workforce Australia, DES, jobactive" },
    },
  },
  workersCompLetter: {
    system: `Extract details from this workers compensation letter or claim document. Look for weekly compensation amount, condition, insurer details.`,
    fields: {
      weeklyAmount: { type: "string", description: "Weekly compensation amount" },
      condition: { type: "string", description: "Injury or condition covered" },
      insurerName: { type: "string", description: "Name of the workers compensation insurer" },
      claimNumber: { type: "string", description: "Claim reference number" },
    },
  },
  careRecipientId: {
    system: `Extract personal details from this ID document (driver's licence or passport). This belongs to the CARE RECIPIENT (the person being cared for), not the applicant.`,
    fields: {
      careRecipientFirstName: { type: "string", description: "Care recipient's first/given name" },
      careRecipientFamilyName: { type: "string", description: "Care recipient's family/last name" },
      careRecipientDob: { type: "string", description: "Care recipient's date of birth DD/MM/YYYY" },
      careRecipientAddress: { type: "string", description: "Care recipient's address" },
    },
  },
  careRecipientMedical: {
    system: `Extract medical details from this medical report. This belongs to the CARE RECIPIENT (the person being cared for), not the applicant. Look for their condition and treating doctor.`,
    fields: {
      careRecipientCondition: { type: "string", description: "Care recipient's main medical condition or disability" },
      careRecipientDoctor: { type: "string", description: "Care recipient's treating doctor name" },
      careRecipientTreatment: { type: "string", description: "Current treatment or care needs" },
    },
  },
  ndisLetter: {
    system: `Extract details from this NDIS (National Disability Insurance Scheme) letter or plan. Look for NDIS number, disability type, support categories.`,
    fields: {
      ndisNumber: { type: "string", description: "NDIS participant number" },
      disabilityType: { type: "string", description: "Primary disability or condition" },
      planStartDate: { type: "string", description: "Plan start date DD/MM/YYYY" },
      planEndDate: { type: "string", description: "Plan end date DD/MM/YYYY" },
    },
  },
  investmentStatement: {
    system: `Extract details from this investment, shares, or managed fund statement. Look for total value, fund name, account details.`,
    fields: {
      totalValue: { type: "string", description: "Total market value or balance" },
      fundName: { type: "string", description: "Name of the fund or investment platform" },
      accountNumber: { type: "string", description: "Account or holder number" },
    },
  },
  ratesNotice: {
    system: `Extract details from this council rates notice or property valuation notice. Look for property address, owner name, property value.`,
    fields: {
      propertyAddress: { type: "string", description: "Full property address" },
      ownerName: { type: "string", description: "Name of the property owner" },
      propertyValue: { type: "string", description: "Property valuation or capital value" },
    },
  },
  citizenshipCert: {
    system: `Extract details from this Australian citizenship certificate. Look for date citizenship was granted, country of birth, certificate number.`,
    fields: {
      dateGranted: { type: "string", description: "Date citizenship was granted DD/MM/YYYY" },
      countryOfBirth: { type: "string", description: "Country of birth" },
      certificateNumber: { type: "string", description: "Certificate number" },
      firstName: { type: "string", description: "First/given name(s)" },
      surname: { type: "string", description: "Family/last name" },
    },
  },
  visaGrantLetter: {
    system: `Extract details from this visa grant letter or visa notification. Look for visa class/subclass, grant date, expiry date.`,
    fields: {
      visaClass: { type: "string", description: "Visa class e.g. subclass 820, 801" },
      visaSubclass: { type: "string", description: "Visa subclass number" },
      visaGrantDate: { type: "string", description: "Date visa was granted DD/MM/YYYY" },
      visaExpiryDate: { type: "string", description: "Visa expiry date DD/MM/YYYY if applicable" },
      clientName: { type: "string", description: "Name of the visa holder" },
      firstName: { type: "string", description: "First/given name" },
    },
  },
  partnerVisaLetter: {
    system: `Extract details from this visa grant letter for the applicant's PARTNER. Look for visa class, grant date, expiry date, and partner's name.`,
    fields: {
      visaClass: { type: "string", description: "Visa class e.g. subclass 820, 801" },
      visaSubclass: { type: "string", description: "Visa subclass number" },
      visaGrantDate: { type: "string", description: "Date visa was granted DD/MM/YYYY" },
      visaExpiryDate: { type: "string", description: "Visa expiry date DD/MM/YYYY" },
      firstName: { type: "string", description: "Partner's first/given name" },
      surname: { type: "string", description: "Partner's family/last name" },
    },
  },
  incomeProtectionLetter: {
    system: `Extract details from this income protection insurance letter or policy document. Look for payment amount, insurer name, policy number.`,
    fields: {
      weeklyAmount: { type: "string", description: "Weekly payment amount" },
      monthlyAmount: { type: "string", description: "Monthly payment amount if weekly not shown" },
      amount: { type: "string", description: "Payment amount if frequency unclear" },
      insurerName: { type: "string", description: "Name of the insurance company" },
      policyNumber: { type: "string", description: "Policy or claim reference number" },
    },
  },
  redundancyLetter: {
    system: `Extract details from this redundancy or termination letter. Look for redundancy payment amount, termination date, employer name.`,
    fields: {
      redundancyAmount: { type: "string", description: "Total redundancy or severance payment amount" },
      terminationDate: { type: "string", description: "Date of termination DD/MM/YYYY" },
      employerName: { type: "string", description: "Name of the employer" },
    },
  },
  vehicleRegistration: {
    system: `Extract details from this vehicle registration document. Look for vehicle make/model/year, registration number, and any value shown.`,
    fields: {
      make: { type: "string", description: "Vehicle make e.g. Toyota" },
      model: { type: "string", description: "Vehicle model e.g. Corolla" },
      year: { type: "string", description: "Year of manufacture" },
      registrationNumber: { type: "string", description: "Registration plate number" },
      marketValue: { type: "string", description: "Market value or insured value if shown" },
    },
  },
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

    // Use known prompt config, or fallback to generic extraction
    let config = prompts[documentType];
    if (!config) {
      console.warn(`No specific prompt for documentType "${documentType}", using generic fallback`);
      config = {
        system: `Extract all relevant details from this document. Read all visible text fields, numbers, names, dates, addresses, and reference numbers.`,
        fields: {
          field1: { type: "string", description: "Most important field found (e.g. name, number, amount)" },
          field2: { type: "string", description: "Second important field" },
          field3: { type: "string", description: "Third important field" },
          field4: { type: "string", description: "Fourth important field" },
          field5: { type: "string", description: "Fifth important field" },
          allText: { type: "string", description: "Summary of all key details found in the document" },
        },
      };
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
