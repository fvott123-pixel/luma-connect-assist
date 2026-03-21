import { useRef, useState, useEffect, useCallback } from "react";

type Mode = "draw" | "type" | "upload";

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

  // Init canvas
  useEffect(() => {
    if (mode !== "draw" || !expanded) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * 2;
    canvas.height = 50 * 2;
    ctx.scale(2, 2);
    ctx.strokeStyle = "#1a1a2e";
    ctx.lineWidth = 1.5;
    ctx.lineCap = "round";
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
    <div className="rounded-lg border border-border bg-background overflow-hidden">
      {/* Compact header row */}
      <div
        className="flex items-center justify-between px-3 py-1.5 cursor-pointer hover:bg-muted/30 transition-colors"
        onClick={() => setExpanded(v => !v)}
      >
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-foreground">✍️ Signature</span>
          {sigUrl && !expanded && (
            <img src={sigUrl} alt="sig" className="h-5 object-contain rounded" />
          )}
          {!sigUrl && <span className="text-[10px] text-muted-foreground italic">optional — tap to add</span>}
        </div>
        <span className="text-[10px] text-muted-foreground">{expanded ? "▲" : "▼"}</span>
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
            <div className="relative rounded border border-border bg-white overflow-hidden" style={{ touchAction: "none" }}>
              <canvas ref={canvasRef} className="w-full cursor-crosshair" style={{ height: 50 }}
                onMouseDown={startDraw} onMouseMove={draw} onMouseUp={endDraw} onMouseLeave={endDraw}
                onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={endDraw} />
              {!hasDrawn && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <span className="text-muted-foreground/40 text-xs italic">Sign here</span>
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
