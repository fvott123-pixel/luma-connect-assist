import { useRef, useState, useEffect, useCallback } from "react";

interface SignaturePadProps {
  onSignatureChange: (dataUrl: string | null) => void;
  initialSignature?: string | null;
}

type Mode = "draw" | "type" | "upload";

const SIGNATURE_FONTS = [
  { name: "Elegant", css: "italic 32px 'Brush Script MT', 'Segoe Script', cursive" },
  { name: "Classic", css: "italic 30px 'Georgia', 'Times New Roman', serif" },
];

const SignaturePad = ({ onSignatureChange, initialSignature }: SignaturePadProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [mode, setMode] = useState<Mode>("draw");
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [typedName, setTypedName] = useState("");
  const [selectedFontIndex, setSelectedFontIndex] = useState<number | null>(null);
  const [signatureUrl, setSignatureUrl] = useState<string | null>(initialSignature || null);

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    canvas.width = canvas.offsetWidth * 2;
    canvas.height = canvas.offsetHeight * 2;
    ctx.scale(2, 2);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#1a1a2e";
    clearCanvas();
  }, [mode]);

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
    setSignatureUrl(null);
    onSignatureChange(null);
  }, [onSignatureChange]);

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
    saveSignature();
  };

  const saveSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const url = canvas.toDataURL("image/png");
    setSignatureUrl(url);
    onSignatureChange(url);
  };

  const renderTypedSignature = (name: string, fontIndex: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.font = SIGNATURE_FONTS[fontIndex].css;
    ctx.fillStyle = "#1a1a2e";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(name, canvas.offsetWidth / 2, canvas.offsetHeight / 2);
    const url = canvas.toDataURL("image/png");
    setSignatureUrl(url);
    onSignatureChange(url);
  };

  const handleSelectFont = (fontIndex: number) => {
    if (!typedName.trim()) return;
    setSelectedFontIndex(fontIndex);
    renderTypedSignature(typedName, fontIndex);
  };

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const url = reader.result as string;
      setSignatureUrl(url);
      onSignatureChange(url);
      const img = new Image();
      img.onload = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const scale = Math.min(canvas.offsetWidth / img.width, canvas.offsetHeight / img.height) * 0.8;
        const w = img.width * scale;
        const h = img.height * scale;
        ctx.drawImage(img, (canvas.offsetWidth - w) / 2, (canvas.offsetHeight - h) / 2, w, h);
      };
      img.src = url;
    };
    reader.readAsDataURL(file);
  };

  const handleClear = () => {
    clearCanvas();
    setTypedName("");
    setSelectedFontIndex(null);
    setSignatureUrl(null);
    onSignatureChange(null);
  };

  return (
    <div className="rounded-xl border-2 border-dashed border-border bg-card p-4">
      <p className="text-[11px] font-bold text-foreground mb-2">✍️ Sign here</p>

      {/* Mode tabs */}
      <div className="flex gap-1 mb-3">
        {(["draw", "type", "upload"] as Mode[]).map(m => (
          <button
            key={m}
            onClick={() => { setMode(m); handleClear(); }}
            className={`rounded-lg px-3 py-1.5 text-[11px] font-bold transition-all ${
              mode === m
                ? "bg-primary text-primary-foreground"
                : "border border-border bg-background text-foreground hover:bg-muted"
            }`}
          >
            {m === "draw" ? "✏️ Draw" : m === "type" ? "⌨️ Type your name" : "📷 Upload image"}
          </button>
        ))}
      </div>

      {/* Draw mode canvas */}
      {mode === "draw" && (
        <div className="relative rounded-lg border-2 border-foreground/20 bg-white overflow-hidden" style={{ touchAction: "none" }}>
          <canvas
            ref={canvasRef}
            className="w-full cursor-crosshair"
            style={{ height: 120 }}
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

      {/* Type mode: two font previews side by side */}
      {mode === "type" && (
        <div>
          <input
            value={typedName}
            onChange={e => { setTypedName(e.target.value); setSelectedFontIndex(null); setSignatureUrl(null); onSignatureChange(null); }}
            placeholder="Type your full name"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          {typedName.trim() && (
            <div className="mt-3 grid grid-cols-2 gap-3">
              {SIGNATURE_FONTS.map((font, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSelectFont(idx)}
                  className={`relative rounded-xl border-2 bg-white px-4 py-5 text-center transition-all hover:shadow-md ${
                    selectedFontIndex === idx
                      ? "border-primary shadow-md ring-2 ring-primary/20"
                      : "border-border hover:border-primary/40"
                  }`}
                >
                  <span
                    className="text-[#1a1a2e] block truncate"
                    style={{ font: font.css, fontSize: "24px" }}
                  >
                    {typedName}
                  </span>
                  <span className="mt-1 block text-[9px] font-bold text-muted-foreground uppercase tracking-wider">
                    {font.name}
                  </span>
                  {selectedFontIndex === idx && (
                    <span className="absolute top-1 right-1 text-primary text-xs">✓</span>
                  )}
                </button>
              ))}
            </div>
          )}
          {/* Hidden canvas for rendering chosen font */}
          <canvas ref={canvasRef} className="hidden" style={{ height: 120, width: "100%" }} />
        </div>
      )}

      {/* Upload mode */}
      {mode === "upload" && (
        <>
          <div className="relative rounded-lg border-2 border-foreground/20 bg-white overflow-hidden" style={{ touchAction: "none" }}>
            <canvas ref={canvasRef} className="w-full" style={{ height: 120 }} />
            {!signatureUrl && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <span className="text-muted-foreground/40 text-sm italic">Upload preview</span>
              </div>
            )}
          </div>
          <label className="mt-2 flex cursor-pointer items-center justify-center rounded-lg border border-dashed border-primary/30 bg-primary/5 px-4 py-2 text-[11px] font-bold text-primary hover:bg-primary/10 transition-all">
            📁 Choose signature image
            <input type="file" accept="image/*" onChange={handleUpload} className="hidden" />
          </label>
        </>
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
