import { useRef, useState, useEffect, useCallback } from "react";

type Mode = "draw" | "type" | "upload";

const CANVAS_HEIGHT = 140; // px — large enough to draw comfortably

const FONTS = [
  { name: "Signature",  css: "'Dancing Script', cursive" },
  { name: "Elegant",    css: "'Great Vibes', cursive" },
  { name: "Classic",    css: "'Pinyon Script', cursive" },
  { name: "Modern",     css: "'Satisfy', cursive" },
];

interface Props {
  onSignatureChange: (dataUrl: string | null) => void;
  initialSignature?: string | null;
}

export default function SignaturePad({ onSignatureChange, initialSignature }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [mode, setMode] = useState<Mode>("draw");
  const [drawing, setDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [typedName, setTypedName] = useState("");
  const [selectedFont, setSelectedFont] = useState<number | null>(null);
  const [sigUrl, setSigUrl] = useState<string | null>(initialSignature || null);
  const [expanded, setExpanded] = useState(false);

  // Init canvas — use rAF so the DOM has laid out before we measure
  useEffect(() => {
    if (mode !== "draw" || !expanded) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const init = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width  = rect.width  * dpr;
      canvas.height = CANVAS_HEIGHT * dpr;
      const ctx = canvas.getContext("2d")!;
      ctx.scale(dpr, dpr);
      ctx.strokeStyle = "#1a1a2e";
      ctx.lineWidth = 2.5;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
    };
    requestAnimationFrame(init);
  }, [mode, expanded]);

  const getPos = (e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    const src = "touches" in e ? e.touches[0] : e;
    return { x: src.clientX - rect.left, y: src.clientY - rect.top };
  };

  const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
    if (mode !== "draw") return;
    e.preventDefault();
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    const pos = getPos(e, canvas);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    setDrawing(true);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!drawing || mode !== "draw") return;
    e.preventDefault();
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    const pos = getPos(e, canvas);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    setHasDrawn(true);
  };

  const endDraw = () => {
    if (!drawing) return;
    setDrawing(false);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const url = canvas.toDataURL("image/png");
    setSigUrl(url);
    onSignatureChange(url);
  };

  const clearSig = () => {
    if (mode === "draw") {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d")!;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      setHasDrawn(false);
    }
    setSigUrl(null);
    setTypedName("");
    setSelectedFont(null);
    onSignatureChange(null);
  };

  const selectFont = (idx: number) => {
    setSelectedFont(idx);
    const canvas = document.createElement("canvas");
    canvas.width = 400; canvas.height = 80;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, 400, 80);
    ctx.fillStyle = "#1a1a2e";
    ctx.font = `italic 36px ${FONTS[idx].css}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(typedName, 200, 40);
    const url = canvas.toDataURL("image/png");
    setSigUrl(url);
    onSignatureChange(url);
  };

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const url = ev.target?.result as string;
      setSigUrl(url);
      onSignatureChange(url);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="rounded-lg border-2 border-primary/30 bg-background overflow-hidden">
      {/* Compact header row */}
      <div
        className="flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-muted/30 transition-colors"
        onClick={() => setExpanded(v => !v)}
      >
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-primary">✍️ Signature</span>
          {sigUrl && !expanded && (
            <img src={sigUrl} alt="sig" className="h-6 object-contain rounded border border-border bg-white px-1" />
          )}
          {!sigUrl && <span className="text-[11px] text-muted-foreground italic">Tap to add your signature (Draw / Type / Upload)</span>}
        </div>
        <span className="text-xs font-bold text-primary">{expanded ? "▲ Close" : "▼ Open"}</span>
      </div>

      {/* Expandable body */}
      {expanded && (
        <div className="border-t border-border px-3 pb-3 pt-2">
          {/* Mode tabs */}
          <div className="flex gap-1 mb-2">
            {(["draw","type","upload"] as Mode[]).map(m => (
              <button key={m} onClick={() => setMode(m)}
                className={`rounded px-2 py-1 text-[10px] font-bold transition-all ${
                  mode === m ? "bg-primary text-primary-foreground" : "border border-border bg-background text-foreground hover:bg-muted"
                }`}>
                {m === "draw" ? "✏️ Draw" : m === "type" ? "⌨️ Type" : "📷 Upload"}
              </button>
            ))}
            {sigUrl && (
              <button onClick={clearSig} className="ml-auto rounded px-2 py-1 text-[10px] text-destructive border border-destructive/30 hover:bg-destructive/10">
                Clear
              </button>
            )}
          </div>

          {/* Draw */}
          {mode === "draw" && (
            <div className="relative rounded-lg border-2 border-dashed border-primary/40 bg-white overflow-hidden"
              style={{ touchAction: "none", height: CANVAS_HEIGHT }}>
              <canvas
                ref={canvasRef}
                className="w-full cursor-crosshair absolute inset-0"
                style={{ height: CANVAS_HEIGHT, width: "100%" }}
                onMouseDown={startDraw}
                onMouseMove={draw}
                onMouseUp={endDraw}
                onMouseLeave={endDraw}
                onTouchStart={startDraw}
                onTouchMove={draw}
                onTouchEnd={endDraw}
              />
              {!hasDrawn && (
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none gap-1">
                  <span className="text-3xl opacity-20">✍️</span>
                  <span className="text-muted-foreground/50 text-xs italic">Draw your signature here</span>
                </div>
              )}
            </div>
          )}

          {/* Type */}
          {mode === "type" && (
            <div>
              <input value={typedName} onChange={e => { setTypedName(e.target.value); setSelectedFont(null); }}
                placeholder="Type your full name" className="w-full rounded border border-border bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary/40" />
              {typedName.trim() && (
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {FONTS.map((font, idx) => (
                    <button key={idx} onClick={() => selectFont(idx)}
                      className={`rounded px-3 py-3 text-center transition-all border-2 ${
                        selectedFont === idx ? "border-green-500 bg-green-50" : "border-border bg-white hover:border-primary/40"
                      }`}>
                      <span className="text-[#1a1a2e] block" style={{ fontFamily: font.css, fontStyle: "italic", fontSize: "22px" }}>
                        {typedName}
                      </span>
                      <span className="text-[8px] font-bold text-muted-foreground uppercase">{font.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Upload */}
          {mode === "upload" && (
            <div>
              {sigUrl ? (
                <div className="rounded border-2 border-green-500 bg-green-50 p-2 flex items-center justify-center">
                  <img src={sigUrl} alt="signature" className="max-h-[40px] object-contain" />
                </div>
              ) : (
                <label className="flex cursor-pointer items-center justify-center rounded border border-dashed border-primary/40 bg-primary/5 px-3 py-3 text-[11px] font-bold text-primary hover:bg-primary/10 transition-all">
                  📁 Choose image
                  <input type="file" accept="image/*" onChange={handleUpload} className="hidden" />
                </label>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
