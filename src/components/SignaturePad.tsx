import { useRef, useState, useEffect, useCallback } from "react";

interface SignaturePadProps {
  onSignatureChange: (dataUrl: string | null) => void;
  initialSignature?: string | null;
}

type Mode = "draw" | "type" | "upload";

const SIGNATURE_FONTS = [
  { name: "Elegant", css: "'Brush Script MT', 'Segoe Script', cursive" },
  { name: "Classic", css: "'Georgia', 'Times New Roman', serif" },
];

const SignaturePad = ({ onSignatureChange, initialSignature }: SignaturePadProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [mode, setMode] = useState<Mode>("draw");
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [typedName, setTypedName] = useState("");
  const [selectedFontIndex, setSelectedFontIndex] = useState<number | null>(null);
  const [signatureUrl, setSignatureUrl] = useState<string | null>(initialSignature || null);

  // Sync external initial signature
  useEffect(() => {
    if (initialSignature && !signatureUrl) {
      setSignatureUrl(initialSignature);
    }
  }, [initialSignature]);

  // Initialize canvas for draw mode only
  useEffect(() => {
    if (mode !== "draw") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * 2;
    canvas.height = 60 * 2;
    ctx.scale(2, 2);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#1a1a2e";

    // If we already have a drawn signature, restore it
    if (signatureUrl && hasDrawn) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, rect.width, 120);
      };
      img.src = signatureUrl;
    }
  }, [mode]);

  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    if ("touches" in e) {
      return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
    }
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
    if (mode !== "draw") return;
    e.preventDefault();
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || mode !== "draw") return;
    e.preventDefault();
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const pos = getPos(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    setHasDrawn(true);
  };

  const endDraw = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    // Save from canvas
    const canvas = canvasRef.current;
    if (!canvas) return;
    const url = canvas.toDataURL("image/png");
    setSignatureUrl(url);
    onSignatureChange(url);
  };

  const handleSelectFont = (fontIndex: number) => {
    if (!typedName.trim()) return;
    setSelectedFontIndex(fontIndex);
    // Render typed name to an offscreen canvas to get a data URL
    const offscreen = document.createElement("canvas");
    offscreen.width = 600;
    offscreen.height = 160;
    const ctx = offscreen.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, 600, 160);
    ctx.font = `italic 48px ${SIGNATURE_FONTS[fontIndex].css}`;
    ctx.fillStyle = "#1a1a2e";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(typedName, 300, 80);
    const url = offscreen.toDataURL("image/png");
    setSignatureUrl(url);
    onSignatureChange(url);
  };

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const url = reader.result as string;
      setSignatureUrl(url);
      onSignatureChange(url);
    };
    reader.readAsDataURL(file);
  };

  const handleClear = () => {
    // Clear draw canvas if in draw mode
    if (mode === "draw") {
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext("2d");
        if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
    setHasDrawn(false);
    setTypedName("");
    setSelectedFontIndex(null);
    setSignatureUrl(null);
    onSignatureChange(null);
  };

  const switchMode = (m: Mode) => {
    // Don't clear signature when switching modes - only clear explicitly
    setMode(m);
    setHasDrawn(false);
    setTypedName("");
    setSelectedFontIndex(null);
  };

  return (
    <div className="rounded-xl border-2 border-dashed border-border bg-card p-4">
      <p className="text-[11px] font-bold text-foreground mb-2">✍️ Sign here</p>

      {/* Mode tabs */}
      <div className="flex gap-1 mb-3">
        {(["draw", "type", "upload"] as Mode[]).map(m => (
          <button
            key={m}
            onClick={() => switchMode(m)}
            className={`rounded-lg px-3 py-1.5 text-[11px] font-bold transition-all ${
              mode === m
                ? "bg-primary text-primary-foreground"
                : "border border-border bg-background text-foreground hover:bg-muted"
            }`}
          >
            {m === "draw" ? "✏️ Draw" : m === "type" ? "⌨️ Type" : "📷 Upload"}
          </button>
        ))}
      </div>

      {/* Draw mode */}
      {mode === "draw" && (
        <div className="relative rounded-lg border-2 border-foreground/20 bg-white overflow-hidden" style={{ touchAction: "none" }}>
          <canvas
            ref={canvasRef}
            className="w-full cursor-crosshair"
            style={{ height: 60 }}
            onMouseDown={startDraw}
            onMouseMove={draw}
            onMouseUp={endDraw}
            onMouseLeave={endDraw}
            onTouchStart={startDraw}
            onTouchMove={draw}
            onTouchEnd={endDraw}
          />
          {!hasDrawn && !signatureUrl && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <span className="text-muted-foreground/40 text-sm italic">Draw your signature here</span>
            </div>
          )}
        </div>
      )}

      {/* Type mode */}
      {mode === "type" && (
        <div>
          <input
            value={typedName}
            onChange={e => { setTypedName(e.target.value); setSelectedFontIndex(null); }}
            placeholder="Type your full name"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          {typedName.trim() && (
            <div className="mt-3 grid grid-cols-2 gap-3">
              {SIGNATURE_FONTS.map((font, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSelectFont(idx)}
                  className={`relative rounded-xl px-4 py-5 text-center transition-all hover:shadow-md ${
                    selectedFontIndex === idx
                      ? "border-2 border-green-500 shadow-md ring-2 ring-green-500/20 bg-green-50"
                      : "border-2 border-border bg-white hover:border-primary/40"
                  }`}
                >
                  <span
                    className="text-[#1a1a2e] block truncate"
                    style={{ fontFamily: font.css, fontStyle: "italic", fontSize: "28px" }}
                  >
                    {typedName}
                  </span>
                  <span className="mt-1 block text-[9px] font-bold text-muted-foreground uppercase tracking-wider">
                    {font.name}
                  </span>
                  {selectedFontIndex === idx && (
                    <span className="absolute top-1 right-1 text-green-600 text-xs font-bold">✓</span>
                  )}
                </button>
              ))}
            </div>
          )}
          {/* Show captured signature preview */}
          {signatureUrl && selectedFontIndex !== null && (
            <div className="mt-2 rounded-lg border-2 border-green-500 bg-green-50 p-2 flex items-center justify-center">
              <img src={signatureUrl} alt="Typed signature" className="h-[50px] object-contain" />
            </div>
          )}
        </div>
      )}

      {/* Upload mode */}
      {mode === "upload" && (
        <div>
          {signatureUrl ? (
            <div className="rounded-lg border-2 border-green-500 bg-green-50 p-3 flex items-center justify-center">
              <img src={signatureUrl} alt="Uploaded signature" className="max-h-[100px] object-contain" />
            </div>
          ) : (
            <div className="rounded-lg border-2 border-dashed border-foreground/20 bg-white p-6 flex items-center justify-center">
              <span className="text-muted-foreground/40 text-sm italic">Upload preview</span>
            </div>
          )}
          <label className="mt-2 flex cursor-pointer items-center justify-center rounded-lg border border-dashed border-primary/30 bg-primary/5 px-4 py-2 text-[11px] font-bold text-primary hover:bg-primary/10 transition-all">
            📁 Choose signature image
            <input type="file" accept="image/*" onChange={handleUpload} className="hidden" />
          </label>
        </div>
      )}

      {/* Clear button */}
      {(hasDrawn || signatureUrl || typedName) && (
        <button
          onClick={handleClear}
          className="mt-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-1.5 text-[11px] font-bold text-destructive hover:bg-destructive/20 transition-all"
        >
          🗑️ Clear and redo
        </button>
      )}

      {signatureUrl && (
        <p className="mt-2 text-[10px] text-green-600 font-bold">✅ Signature captured — it will be embedded in your PDF</p>
      )}
    </div>
  );
};

export default SignaturePad;
