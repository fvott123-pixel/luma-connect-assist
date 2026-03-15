export interface FormField {
  id: string;
  label: string;
  type: "text" | "select" | "yesno" | "date";
  options?: string[];
  question: string;       // Luma's warm conversational question
  acknowledgment: string; // Luma's response after user answers
  required: boolean;
  skipText?: string;      // Hint for optional fields (e.g., "Type 'none' if not applicable")
  pdf: { page: number; x: number; y: number; maxWidth?: number };
}

/**
 * SA466 Disability Support Pension Claim form fields.
 * PDF coordinates are initial estimates for the SA466 layout (A4 595×842pt).
 * Page indices are 0-based.
 */
export const SA466_FIELDS: FormField[] = [
  {
    id: "title",
    label: "Title",
    type: "select",
    options: ["Mr", "Mrs", "Ms", "Miss", "Dr"],
    question: "First up — how would you like to be addressed? 😊",
    acknowledgment: "Lovely!",
    required: true,
    pdf: { page: 1, x: 130, y: 710 },
  },
  {
    id: "familyName",
    label: "Family Name",
    type: "text",
    question: "What's your family name (surname)?",
    acknowledgment: "Thanks!",
    required: true,
    pdf: { page: 1, x: 130, y: 685 },
  },
  {
    id: "firstName",
    label: "First Name",
    type: "text",
    question: "And your first name?",
    acknowledgment: "Great!",
    required: true,
    pdf: { page: 1, x: 350, y: 685 },
  },
  {
    id: "secondName",
    label: "Second Name",
    type: "text",
    question: "Do you have a middle or second name? If not, just say \"none\" 😊",
    acknowledgment: "Got it!",
    required: false,
    skipText: "none",
    pdf: { page: 1, x: 130, y: 660 },
  },
  {
    id: "otherNames",
    label: "Other Names",
    type: "text",
    question: "Have you ever been known by any other names? This could be a maiden name or previous name. If not, just say \"none\".",
    acknowledgment: "Noted!",
    required: false,
    skipText: "none",
    pdf: { page: 1, x: 350, y: 660 },
  },
  {
    id: "dob",
    label: "Date of Birth",
    type: "date",
    question: "What's your date of birth? You can type it as DD/MM/YYYY 📅",
    acknowledgment: "Perfect!",
    required: true,
    pdf: { page: 1, x: 130, y: 635 },
  },
  {
    id: "gender",
    label: "Gender",
    type: "select",
    options: ["Male", "Female", "Non-binary"],
    question: "How do you identify?",
    acknowledgment: "Thank you!",
    required: true,
    pdf: { page: 1, x: 350, y: 635 },
  },
  {
    id: "permanentAddress",
    label: "Permanent Address",
    type: "text",
    question: "What's your home address? Include the street number and street name 🏠",
    acknowledgment: "Got it!",
    required: true,
    pdf: { page: 1, x: 130, y: 605, maxWidth: 300 },
  },
  {
    id: "postcode",
    label: "Postcode",
    type: "text",
    question: "And your postcode?",
    acknowledgment: "Thanks!",
    required: true,
    pdf: { page: 1, x: 450, y: 605 },
  },
  {
    id: "postalAddress",
    label: "Postal Address",
    type: "text",
    question: "Is your postal address the same as your home address? If yes, just say \"same\". Otherwise, tell me your postal address.",
    acknowledgment: "Noted!",
    required: false,
    skipText: "same",
    pdf: { page: 1, x: 130, y: 580, maxWidth: 300 },
  },
  {
    id: "homePhone",
    label: "Home Phone",
    type: "text",
    question: "Do you have a home phone number? If not, just say \"none\" 📞",
    acknowledgment: "Got it!",
    required: false,
    skipText: "none",
    pdf: { page: 1, x: 130, y: 555 },
  },
  {
    id: "mobile",
    label: "Mobile",
    type: "text",
    question: "What's your mobile number? 📱",
    acknowledgment: "Great!",
    required: true,
    pdf: { page: 1, x: 350, y: 555 },
  },
  {
    id: "email",
    label: "Email",
    type: "text",
    question: "What's your email address? If you don't have one, just say \"none\" ✉️",
    acknowledgment: "Thanks!",
    required: false,
    skipText: "none",
    pdf: { page: 1, x: 130, y: 530, maxWidth: 250 },
  },
  {
    id: "crn",
    label: "Customer Reference Number",
    type: "text",
    question: "Do you have a Centrelink Customer Reference Number (CRN)? It's the 9-digit number on your Centrelink card. If you don't have one, just say \"none\" — that's perfectly fine!",
    acknowledgment: "Perfect!",
    required: false,
    skipText: "none",
    pdf: { page: 1, x: 130, y: 505 },
  },
];
