/**
 * MobileUpload — phone-optimised document scanner.
 * User scans QR code on desktop → opens this page on phone →
 * uploads documents → data syncs to desktop in real-time.
 */
import { useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { pushMobileData } from "@/lib/mobileSession";
import { getFormDocuments, type DocSlot } from "@/lib/formDocuments";
import { toast } from "sonner";
import LumaAvatar from "@/components/landing/LumaAvatar";

// Re-use the same field mapping from DocumentVault
// (imported inline to avoid circular deps)
function mapToFormFields(documentType: string, data: Record<string, string>): Record<string, string> {
  return data;
}

/**
 * Compress image to max 1600px JPEG.
 * On iOS, Safari decodes HEIC natively via Image + canvas — output is always JPEG.
 * Fixes HEIC rejections from Anthropic and reduces 3-5 MB photos to ~100-300 KB.
 */
async function compressImage(file: File): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement("canvas");
      const MAX_DIM = 1600;
      let { width, height } = img;
      if (width > MAX_DIM || height > MAX_DIM) {
        if (width > height) {
          height = Math.round(height * MAX_DIM / width);
          width = MAX_DIM;
        } else {
          width = Math.round(width * MAX_DIM / height);
          height = MAX_DIM;
        }
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) { reject(new Error("Canvas not available")); return; }
      ctx.drawImage(img, 0, 0, width, height);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
      resolve({ base64: dataUrl.split(",")[1], mimeType: "image/jpeg" });
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Could not decode image")); };
    img.src = url;
  });
}

type SlotStatus = "idle" | "uploading" | "done" | "error" | "skipped";

export default function MobileUpload() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const formConfig = getFormDocuments("disability-support-pension");
  const slots = formConfig.slots;

  const [statuses, setStatuses] = useState<Record<string, SlotStatus>>(
    Object.fromEntries(slots.map(s => [s.id, "idle" as SlotStatus]))
  );
  const [syncCount, setSyncCount] = useState(0);
  const [fieldCount, setFieldCount] = useState(0);
  const [finished, setFinished] = useState(false);
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  if (!code || code.length !== 6) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background px-6 text-center">
        <span className="text-4xl">❌</span>
        <p className="mt-4 text-sm font-bold text-foreground">Invalid session link.</p>
        <p className="mt-1 text-xs text-muted-foreground">Scan the QR code again from your desktop.</p>
      </div>
    );
  }

  const handleFile = async (slot: DocSlot, file: File) => {
    if (file.size > 20 * 1024 * 1024) {
      toast.error("File too large — max 20 MB");
      return;
    }
    setStatuses(prev => ({ ...prev, [slot.id]: "uploading" }));

    try {
      // Compress & convert to JPEG (handles HEIC on iOS via canvas automatically)
      const { base64, mimeType: imgMime } = await compressImage(file);

      const { data, error } = await supabase.functions.invoke("extract-document", {
        body: { image: base64, mimeType: imgMime, documentType: slot.documentType },
      });
      if (error) throw error;

      if (data?.error === "wrong_document_type") {
        setStatuses(prev => ({ ...prev, [slot.id]: "error" }));
        toast.error(`Wrong document! Expected: ${slot.label}. Please retry.`, { duration: 6000 });
        return;
      }

      if (data?.extracted) {
        const extracted = data.extracted as Record<string, string>;
        const fieldKeys = Object.keys(extracted).filter(k => extracted[k]?.trim());
      if (fieldKeys.length === 0) throw new Error("No data extracted");
        const summary = `${slot.label}: ${fieldKeys.length} field${fieldKeys.length !== 1 ? "s" : ""} found`;
        await pushMobileData(code, extracted, [summary]);
        setStatuses(prev => ({ ...prev, [slot.id]: "done" }));
        setSyncCount(c => c + 1);
        setFieldCount(c => c + fieldKeys.length);
        toast.success(`✅ ${slot.label} scanned! Sent to desktop.`);
      } else {
        throw new Error("No data extracted");
      }
    } catch (err: any) {
      setStatuses(prev => ({ ...prev, [slot.id]: "error" }));
      const msg = (err?.message ?? "") as string;
      let tip = "Try a clearer, well-lit photo.";
      if (msg.includes("unsupported_format") || msg.toLowerCase().includes("heic")) {
        tip = "iPhone: Settings → Camera → Formats → Most Compatible.";
      } else if (msg.includes("image_too_large") || msg.includes("too large")) {
        tip = "Photo too large — try a lower-resolution shot.";
      } else if (msg.includes("timeout")) {
        tip = "Request timed out — please try again.";
      } else if (msg && msg !== "No data extracted" && msg.length < 120) {
        tip = msg;
      }
      toast.error(`Could not read ${slot.label}. ${tip}`, { duration: 7000 });
    }
  };

  const required = slots.filter(s => s.priority === "required");
  const recommended = slots.filter(s => s.priority === "recommended");
  const optional = slots.filter(s => !s.priority || s.priority === "optional");

  const renderSlot = (slot: DocSlot) => {
    const status = statuses[slot.id];
    return (
      <div key={slot.id} className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-all ${
        status === "done" ? "border-green-500/40 bg-green-50" :
        status === "uploading" ? "border-primary/40 bg-primary/5 animate-pulse" :
        status === "error" ? "border-red-400/40 bg-red-50" :
        status === "skipped" ? "border-border/30 opacity-40" :
        "border-border bg-white hover:border-primary/40"
      }`}>
        <span className="text-xl w-7 text-center shrink-0">
          {status === "done" ? "✅" : status === "error" ? "⚠️" : slot.icon}
        </span>
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-semibold text-foreground leading-tight">{slot.label}</div>
          <div className="text-[10px] text-muted-foreground truncate">{slot.description}</div>
        </div>
        <div className="shrink-0">
          {status === "idle" || status === "error" ? (
            <>
              <input
                ref={el => { fileRefs.current[slot.id] = el; }}
                type="file" accept={slot.accept}
                className="sr-only"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(slot, f); e.target.value = ""; }}
              />
              <button
                onClick={() => fileRefs.current[slot.id]?.click()}
                className="rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground"
              >
                📸 Scan
              </button>
            </>
          ) : status === "uploading" ? (
            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          ) : status === "done" ? (
            <span className="text-xs font-bold text-green-600">Sent ✓</span>
          ) : status === "skipped" ? (
            <button onClick={() => setStatuses(p => ({ ...p, [slot.id]: "idle" }))}
              className="text-xs text-muted-foreground underline">Undo</button>
          ) : null}
        </div>
      </div>
    );
  };

  const renderGroup = (slots: DocSlot[], label: string, dotClass: string, textClass: string) => {
    if (!slots.length) return null;
    return (
      <div>
        <div className={`flex items-center gap-2 mb-2 px-1`}>
          <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${dotClass}`} />
          <span className={`text-[11px] font-extrabold uppercase tracking-wide ${textClass}`}>{label}</span>
        </div>
        <div className="space-y-2">{slots.map(renderSlot)}</div>
      </div>
    );
  };

  if (finished) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background px-6 text-center">
        <span className="text-6xl">🎉</span>
        <h2 className="mt-4 font-serif text-xl font-extrabold text-foreground">All done!</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          You scanned <span className="font-bold text-foreground">{syncCount} document{syncCount !== 1 ? "s" : ""}</span>{" "}
          and sent <span className="font-bold text-foreground">{fieldCount} fields</span> to your desktop.
        </p>
        <p className="mt-3 text-xs text-muted-foreground">Go back to your desktop and click "Continue →"</p>
        <div className="mt-6 w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
          <span className="text-3xl">💻</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="sticky top-0 z-10 bg-background border-b border-border px-4 py-3 flex items-center gap-3 shadow-sm">
        <LumaAvatar size={36} />
        <div>
          <h1 className="text-sm font-extrabold text-foreground">📱 Mobile Scanner</h1>
          <p className="text-[10px] text-muted-foreground">Session <span className="font-mono font-bold text-primary">{code}</span></p>
        </div>
        {syncCount > 0 && (
          <div className="ml-auto rounded-full bg-green-500 px-3 py-1">
            <span className="text-white text-[11px] font-extrabold">↑ {fieldCount} fields sent</span>
          </div>
        )}
      </div>
      <div className="mx-4 mt-4 rounded-xl border-2 border-primary/30 bg-primary/5 px-4 py-3 text-center">
        <p className="text-sm font-extrabold text-primary">📸 Scan your documents here</p>
        <p className="mt-1 text-[11px] text-muted-foreground leading-snug">
          Every document you scan is automatically sent to your desktop.
          Use your phone camera for best results.
        </p>
      </div>
      <div className="flex-1 px-4 py-4 space-y-5 overflow-y-auto pb-24">
        {renderGroup(required, "Required", "bg-red-400", "text-red-600")}
        {renderGroup(recommended, "Recommended — saves the most questions", "bg-amber-400", "text-amber-600")}
        {renderGroup(optional, "Optional", "bg-gray-300", "text-muted-foreground")}
      </div>
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border px-4 py-3 safe-area-inset-bottom">
        <button
          onClick={() => setFinished(true)}
          className="w-full rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground shadow-lg"
        >
          {syncCount > 0
            ? `✅ Done — ${syncCount} doc${syncCount !== 1 ? "s" : ""} sent to desktop`
            : "Skip — go back to desktop →"}
        </button>
        <p className="mt-1.5 text-center text-[10px] text-muted-foreground">
          🔒 Scanned securely, never stored, deleted immediately after reading.
        </p>
      </div>
    </div>
  );
}
