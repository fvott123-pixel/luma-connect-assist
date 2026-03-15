import { useState, useRef } from "react";
import LumaAvatar from "@/components/landing/LumaAvatar";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ExtractedData {
  fullName?: string;
  firstName?: string;
  surname?: string;
  dateOfBirth?: string;
  address?: string;
  suburb?: string;
  state?: string;
  postcode?: string;
  gender?: string;
}

interface IDUploadScreenProps {
  onExtracted: (data: Record<string, string>) => void;
  onSkip: () => void;
}

const IDUploadScreen = ({ onExtracted, onSkip }: IDUploadScreenProps) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload a photo (JPG, PNG, etc.)");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File too large — max 10MB");
      return;
    }

    // Show preview
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result as string);
    reader.readAsDataURL(file);

    // Convert to base64
    setIsProcessing(true);
    try {
      const buffer = await file.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      let binary = "";
      for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const base64 = btoa(binary);

      const { data, error } = await supabase.functions.invoke("extract-id", {
        body: { image: base64, mimeType: file.type },
      });

      if (error) throw error;

      // Map extracted fields to form field IDs
      const mapped: Record<string, string> = {};
      if (data.firstName) mapped.firstName = data.firstName;
      if (data.surname) mapped.familyName = data.surname;
      if (data.fullName && !data.firstName) {
        const parts = data.fullName.split(" ");
        mapped.firstName = parts[0] || "";
        mapped.familyName = parts.slice(1).join(" ") || "";
      }
      if (data.dateOfBirth) {
        // Convert YYYY-MM-DD to DD/MM/YYYY
        const [y, m, d] = data.dateOfBirth.split("-");
        mapped.dob = d && m && y ? `${d}/${m}/${y}` : data.dateOfBirth;
      }
      if (data.address) {
        const full = [data.address, data.suburb, data.state].filter(Boolean).join(", ");
        mapped.permanentAddress = full || data.address;
      }
      if (data.postcode) mapped.postcode = data.postcode;
      if (data.gender) mapped.gender = data.gender;

      // Derive title from gender
      if (data.gender === "Male") mapped.title = "Mr";
      else if (data.gender === "Female") mapped.title = "Ms";

      toast.success("ID scanned successfully! Fields pre-filled ✨");
      onExtracted(mapped);
    } catch (err: any) {
      console.error("ID extraction error:", err);
      toast.error("Could not read your ID. You can fill in manually instead.");
      setPreview(null);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center py-12 px-6">
      <LumaAvatar size={80} />
      <h2 className="mt-6 font-serif text-2xl font-extrabold text-foreground text-center">
        Upload your licence or passport
      </h2>
      <p className="mt-2 text-base text-muted-foreground text-center max-w-md">
        Luma will read it and fill your form automatically — no typing needed ✨
      </p>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />

      {preview ? (
        <div className="mt-6 w-full max-w-sm">
          <img
            src={preview}
            alt="ID preview"
            className="w-full rounded-xl border-2 border-primary/30 shadow-md"
          />
          {isProcessing && (
            <div className="mt-4 flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              Luma is reading your ID…
            </div>
          )}
        </div>
      ) : (
        <button
          onClick={() => fileRef.current?.click()}
          className="mt-8 flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-primary/40 bg-secondary px-12 py-10 transition-all hover:border-primary hover:bg-primary/5"
        >
          <span className="text-5xl">📸</span>
          <span className="text-sm font-bold text-primary">
            Take a photo or upload an image
          </span>
          <span className="text-xs text-muted-foreground">
            Driver's licence, passport, or photo ID
          </span>
        </button>
      )}

      <button
        onClick={onSkip}
        className="mt-6 text-sm font-semibold text-muted-foreground underline decoration-dotted underline-offset-4 hover:text-primary transition-colors"
      >
        Fill in manually instead
      </button>

      <p className="mt-8 text-center text-[10px] text-muted-foreground max-w-xs">
        🔒 Your photo is processed securely and never stored. It's used only to read your details, then immediately deleted.
      </p>
    </div>
  );
};

export default IDUploadScreen;
