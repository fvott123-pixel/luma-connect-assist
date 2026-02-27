export interface ServiceConfig {
  slug: string;
  icon: string;
  name: string;
  amount: string;
  description: string;
  questions: string[];
  eligibleMessage: string;
  notEligibleMessage: string;
}

export const SERVICES: ServiceConfig[] = [
  {
    slug: "disability-support",
    icon: "♿",
    name: "Disability Support Pension",
    amount: "$1,116/fn",
    description:
      "A fortnightly payment for people who have a permanent physical, intellectual or psychiatric condition that stops them from working.",
    questions: [
      "Do you have a permanent medical condition or disability?",
      "Does it stop you working 15 or more hours per week?",
      "Are you between 16 and Age Pension age?",
      "Are you an Australian resident?",
      "Have you seen a doctor about this condition in the last 2 years?",
    ],
    eligibleMessage:
      "Based on your answers, you are likely eligible for the Disability Support Pension. The next step is to prepare your form — I can help you with that right now.",
    notEligibleMessage:
      "Based on your answers, you may not be eligible right now. But don't worry — I can still help you explore other options. Would you like to look at a different payment?",
  },
  {
    slug: "medicare",
    icon: "🏥",
    name: "Medicare Enrolment",
    amount: "Free",
    description:
      "Australia's public health system. Medicare covers doctor visits, hospital care and some medicines — completely free.",
    questions: [
      "Are you a new arrival to Australia?",
      "Do you have a visa that allows Medicare?",
      "Is your name spelled differently on different documents?",
      "Do you need to add a family member?",
      "Do you have your passport and visa documents available?",
    ],
    eligibleMessage:
      "Great news — it looks like you can enrol in Medicare. Let me help you prepare your enrolment form now.",
    notEligibleMessage:
      "You may need some extra documents before enrolling. I can help you work out what you need. Would you like me to explain?",
  },
  {
    slug: "ndis-access",
    icon: "🤝",
    name: "NDIS Access Request",
    amount: "Funding",
    description:
      "The National Disability Insurance Scheme provides funding for support and services if you have a permanent and significant disability.",
    questions: [
      "Are you under 65 years old?",
      "Do you have a permanent disability affecting daily life?",
      "Are you an Australian citizen or permanent resident?",
      "Do you need support with daily activities, communication or mobility?",
      "Do you have a letter or report from a doctor or specialist?",
    ],
    eligibleMessage:
      "You look likely eligible for the NDIS. Let's prepare your access request form together.",
    notEligibleMessage:
      "You may need some more information before applying. I can guide you on what to do next.",
  },
  {
    slug: "aged-care",
    icon: "👴",
    name: "Aged Care Assessment",
    amount: "Home care",
    description:
      "Get assessed for home care or residential aged care services. Support for daily tasks, meals, transport and personal care.",
    questions: [
      "Are you or a family member over 65?",
      "Do you need help at home with daily tasks?",
      "Are you considering moving to a care facility?",
      "Are you an Australian resident?",
      "Has a doctor recommended additional support?",
    ],
    eligibleMessage:
      "It sounds like you qualify for an aged care assessment. Let me help you prepare the referral form.",
    notEligibleMessage:
      "You may not meet the criteria right now, but I can help you explore other support options.",
  },
  {
    slug: "carer-payment",
    icon: "❤️",
    name: "Carer Payment",
    amount: "$800+/fn",
    description:
      "A fortnightly payment for people who provide full-time care to someone with a disability, severe illness or who is frail aged.",
    questions: [
      "Do you provide full-time care for a family member?",
      "Does the person you care for have a disability, illness or age-related condition?",
      "Are you an Australian resident?",
      "Are you available to provide care every day?",
      "Are you currently working less than 25 hours per week outside of caring?",
    ],
    eligibleMessage:
      "You are likely eligible for the Carer Payment. Let me help you get your form ready.",
    notEligibleMessage:
      "You may not qualify for Carer Payment right now, but there could be other support available. Want me to check?",
  },
  {
    slug: "age-pension",
    icon: "🦘",
    name: "Age Pension",
    amount: "$1,020/fn",
    description:
      "A fortnightly payment for Australians who have reached pension age (67+). Helps with living costs in retirement.",
    questions: [
      "Are you 67 years or older?",
      "Are you an Australian resident and have lived here for 10 or more years?",
      "Do you own property or have savings above $500,000?",
      "Are you currently receiving any other Centrelink payment?",
      "Do you have your MyGov or Centrelink reference number?",
    ],
    eligibleMessage:
      "Based on your answers, you are likely eligible for the Age Pension. Let's prepare your application form.",
    notEligibleMessage:
      "You may not be eligible right now. I can help you understand the requirements or look at other options.",
  },
];

export function getServiceBySlug(slug: string): ServiceConfig | undefined {
  return SERVICES.find((s) => s.slug === slug);
}
