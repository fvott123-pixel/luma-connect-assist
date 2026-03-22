import React, { useEffect, useRef } from "react";

export const PhoneCameraDemo: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const style = document.createElement("style");
    style.id = "pcd-styles";
    style.textContent = `
      .pcd-overlay{position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:9999;display:flex;align-items:center;justify-content:center;}
      .pcd-close{position:absolute;top:16px;right:20px;background:rgba(255,255,255,.15);border:1px solid rgba(255,255,255,.3);color:#fff;font-size:20px;width:36px;height:36px;border-radius:50%;cursor:pointer;display:flex;align-items:center;justify-content:center;line-height:1;}
      .pcd-close:hover{background:rgba(255,255,255,.3);}
      .pcd-scene{width:960px;max-width:96vw;height:540px;max-height:90vh;background:#f0ede8;border-radius:16px;overflow:hidden;position:relative;box-shadow:0 30px 80px rgba(0,0,0,.6);display:flex;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;}
      .pcd-left{width:580px;flex-shrink:0;background:#fff;position:relative;overflow:hidden;}
      .pcd-hero{background:#1e4a1a;padding:10px 18px 8px;color:#fff;}
      .pcd-hero h2{font-size:15px;font-weight:700;margin:0 0 4px;}
      .pcd-hero p{font-size:11px;color:#a8d898;margin:0 0 7px;}
      .pcd-tip{background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.25);border-radius:8px;padding:7px 12px;display:flex;gap:10px;align-items:flex-start;margin-bottom:7px;}
      .pcd-tip-icon{font-size:18px;}
      .pcd-tip b{display:block;font-size:12px;margin-bottom:2px;}
      .pcd-tip span{font-size:11px;color:#c0e8b0;}
      .pcd-pills{display:flex;gap:6px;}
      .pcd-pill{background:rgba(255,255,255,.15);border:1px solid rgba(255,255,255,.25);border-radius:12px;padding:3px 10px;font-size:10px;color:#fff;}
      .pcd-savebar{background:#ebfaeb;border-bottom:1px solid #b8e8b8;padding:5px 18px;font-size:11px;color:#1a7a1a;display:flex;align-items:center;gap:6px;}
      .pcd-savebar strong{background:#2d6a22;color:#fff;border-radius:8px;padding:2px 8px;font-size:10px;}
      .pcd-row{display:flex;align-items:center;padding:8px 18px;border-bottom:1px solid #f0ede8;gap:10px;position:relative;transition:background .4s;}
      .pcd-row.pcd-filled{background:#edfaed;}
      .pcd-accent{position:absolute;left:0;top:0;bottom:0;width:4px;background:transparent;transition:background .4s;}
      .pcd-row.pcd-filled .pcd-accent{background:#3a8a2e;}
      .pcd-icon{width:32px;height:32px;border-radius:7px;display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0;background:#dce8ff;transition:background .4s;}
      .pcd-row.pcd-filled .pcd-icon{background:#d0f0d0;}
      .pcd-info{flex:1;}
      .pcd-info h4{font-size:12px;font-weight:600;color:#111;margin:0;transition:color .3s;}
      .pcd-row.pcd-filled .pcd-info h4{color:#1a7a1a;}
      .pcd-info p{font-size:10px;color:#999;margin:1px 0 0;}
      .pcd-chips{display:flex;flex-wrap:wrap;gap:3px;margin-top:4px;}
      .pcd-chip{background:#d0f0d0;color:#1a7a1a;font-size:9px;font-weight:700;padding:2px 6px;border-radius:5px;opacity:0;transform:translateY(4px);transition:opacity .3s,transform .3s;}
      .pcd-chip.pcd-show{opacity:1;transform:none;}
      .pcd-skip{background:#e8f5e8;color:#2d6a22;font-size:10px;font-weight:600;padding:2px 7px;border-radius:6px;white-space:nowrap;}
      .pcd-btn{background:#2d6a22;color:#fff;font-size:10px;font-weight:600;padding:4px 10px;border-radius:6px;white-space:nowrap;transition:background .3s;}
      .pcd-row.pcd-filled .pcd-btn{background:#3a9a28;}
      .pcd-right{flex:1;background:#f8f7f4;border-left:1px solid #e5e0d8;display:flex;flex-direction:column;}
      .pcd-rhead{background:#fff;border-bottom:1px solid #e5e0d8;padding:10px 14px;display:flex;align-items:center;gap:10px;}
      .pcd-avatar{width:36px;height:36px;background:#2d6a22;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0;}
      .pcd-rhead h3{font-size:13px;font-weight:700;margin:0;}
      .pcd-rhead p{font-size:10px;color:#999;margin:1px 0 0;}
      .pcd-counter{margin:10px;background:#fff;border-radius:10px;border:2px solid #c8ecc8;overflow:hidden;transition:border-color .5s;}
      .pcd-counter.pcd-active{border-color:#3a9a28;}
      .pcd-chead{background:#2d6a22;padding:5px 12px;}
      .pcd-chead span{color:#fff;font-size:10px;font-weight:700;}
      .pcd-cbody{padding:8px 12px 10px;}
      .pcd-num{font-size:44px;font-weight:900;color:#ddd;line-height:1;transition:color .5s;}
      .pcd-num.pcd-active{color:#2d6a22;}
      .pcd-clabel{font-size:9px;color:#aaa;text-transform:uppercase;letter-spacing:.5px;margin-top:2px;transition:color .5s;}
      .pcd-clabel.pcd-active{color:#2d6a22;}
      .pcd-progwrap{background:#eee;border-radius:4px;height:6px;margin-top:8px;overflow:hidden;}
      .pcd-prog{background:#2d6a22;height:100%;width:0;border-radius:4px;transition:width 1s;}
      .pcd-phint{font-size:9px;color:#aaa;margin-top:4px;}
      .pcd-phint.pcd-active{color:#2d6a22;}
      .pcd-qr{margin:0 10px 10px;background:#fff;border-radius:10px;border:1px solid #e5e0d8;padding:10px 12px;transition:box-shadow .3s,border-color .3s;}
      .pcd-qr.pcd-pulse{box-shadow:0 0 0 3px #6ce070;border-color:#6ce070;}
      .pcd-qr h4{font-size:12px;font-weight:700;margin:0 0 4px;}
      .pcd-qr p{font-size:10px;color:#999;line-height:1.4;margin:0;}
      .pcd-qrinner{display:flex;gap:10px;margin-top:8px;align-items:flex-start;}
      .pcd-qrbox{width:64px;height:64px;background:#fff;border:2px solid #2d6a22;border-radius:6px;display:grid;place-items:center;flex-shrink:0;}
      .pcd-qrsteps{font-size:10px;color:#555;line-height:1.8;}
      .pcd-phone{position:absolute;right:18px;top:50px;width:175px;height:320px;transform:translateY(420px);transition:transform .7s cubic-bezier(.2,.8,.3,1);z-index:10;}
      .pcd-phone.pcd-up{transform:translateY(0);}
      .pcd-phone.pcd-down{transform:translateY(440px);}
      .pcd-pbody{width:175px;height:320px;background:#222;border-radius:24px;position:relative;box-shadow:0 20px 60px rgba(0,0,0,.6),0 0 0 2px #444;}
      .pcd-pscreen{position:absolute;inset:5px;background:#111;border-radius:20px;overflow:hidden;}
      .pcd-notch{position:absolute;top:5px;left:50%;transform:translateX(-50%);width:54px;height:12px;background:#222;border-radius:6px;z-index:5;}
      .pcd-statusbar{position:absolute;top:8px;left:12px;right:12px;display:flex;justify-content:space-between;font-size:8px;color:#bbb;z-index:6;}
      .pcd-pscene{position:absolute;inset:0;opacity:0;transition:opacity .4s;display:flex;flex-direction:column;}
      .pcd-pscene.pcd-active{opacity:1;}
      .pcd-sqr{background:#0f1f0f;}
      .pcd-browser{background:#1a3a1a;padding:5px 8px;margin:18px 8px 0;border-radius:6px;font-size:8px;color:#8ec870;text-align:center;}
      .pcd-qtitle{color:#fff;font-size:11px;font-weight:700;text-align:center;margin:8px 0 4px;padding:0 8px;}
      .pcd-qrphone{width:80px;height:80px;background:#fff;border-radius:5px;margin:0 auto;display:grid;place-items:center;}
      .pcd-beam{height:2px;background:#4ee070;width:80px;margin:4px auto 0;animation:pcd-beam 1.5s ease-in-out infinite;}
      @keyframes pcd-beam{0%{transform:scaleX(.4);opacity:.5}50%{transform:scaleX(1);opacity:1}100%{transform:scaleX(.4);opacity:.5}}
      .pcd-qhint{font-size:9px;color:#8ec870;text-align:center;margin-top:6px;padding:0 12px;}
      .pcd-scam{background:#0d1a0d;}
      .pcd-vf{margin:20px 8px 0;border-radius:8px;overflow:hidden;position:relative;}
      .pcd-lic{background:#e8efff;border:2px solid #003c82;border-radius:6px;overflow:hidden;}
      .pcd-lhead{background:#003c82;padding:3px 6px;display:flex;justify-content:space-between;align-items:center;}
      .pcd-lstate{color:#fff;font-size:7.5px;font-weight:700;line-height:1.3;}
      .pcd-lcrest{background:#b89200;color:#003c82;font-size:7px;font-weight:900;padding:2px 5px;border-radius:3px;}
      .pcd-lbody{display:flex;gap:5px;padding:5px 6px;}
      .pcd-lphoto{width:34px;height:48px;background:#c8d8f0;border-radius:3px;flex-shrink:0;overflow:hidden;}
      .pcd-lfields{flex:1;font-size:7.5px;}
      .pcd-lf{margin-bottom:2px;padding:1px 3px;border-radius:2px;transition:background .3s;}
      .pcd-lf.pcd-lit{background:#c0f0c0;}
      .pcd-lflbl{color:#555;font-size:6.5px;text-transform:uppercase;letter-spacing:.3px;}
      .pcd-lf.pcd-lit .pcd-lflbl{color:#1a6a1a;}
      .pcd-lfval{font-weight:700;color:#111;font-size:8px;}
      .pcd-lf.pcd-lit .pcd-lfval{color:#0a5a0a;}
      .pcd-barcode{height:9px;margin:3px 5px;border-radius:2px;background:repeating-linear-gradient(90deg,#000 0,#000 2px,#fff 2px,#fff 4px,#000 4px,#000 7px,#fff 7px,#fff 9px);}
      .pcd-scanline{position:absolute;left:0;right:0;height:2px;background:linear-gradient(90deg,transparent,#4ee070,transparent);animation:pcd-scan 2s ease-in-out infinite;}
      @keyframes pcd-scan{0%{top:0;opacity:0}5%{opacity:1}95%{opacity:1}100%{top:100%;opacity:0}}
      .pcd-camstatus{font-size:9px;font-weight:700;color:#fff;text-align:center;margin:5px 8px 0;background:rgba(0,0,0,.65);border-radius:5px;padding:3px;}
      .pcd-camlive{padding:3px 8px;display:flex;flex-direction:column;gap:3px;}
      .pcd-camlive-row{background:#1a4a1a;border-radius:5px;padding:2px 7px;font-size:8px;color:#90e878;font-weight:700;opacity:0;transform:translateX(-8px);transition:opacity .4s,transform .4s;}
      .pcd-camlive-row.pcd-show{opacity:1;transform:none;}
      .pcd-shutter{width:34px;height:34px;border:3px solid rgba(255,255,255,.8);border-radius:50%;margin:4px auto 0;display:flex;align-items:center;justify-content:center;}
      .pcd-shutter-inner{width:24px;height:24px;background:rgba(255,255,255,.9);border-radius:50%;}
      .pcd-sproc{background:#1e4a1a;align-items:center;justify-content:center;padding:18px 12px;}
      .pcd-procicon{font-size:30px;margin-bottom:8px;}
      .pcd-spinner{width:38px;height:38px;border:3px solid rgba(255,255,255,.2);border-top-color:#fff;border-radius:50%;animation:pcd-spin .7s linear infinite;margin:0 auto 10px;}
      @keyframes pcd-spin{to{transform:rotate(360deg)}}\\n      .pcd-proctitle{color:#fff;font-size:12px;font-weight:700;text-align:center;margin-bottom:3px;}
      .pcd-procsub{color:#a8d898;font-size:10px;text-align:center;margin-bottom:10px;}
      .pcd-procfields{width:100%;display:flex;flex-direction:column;gap:3px;}
      .pcd-pf{background:rgba(255,255,255,.15);border-radius:6px;padding:3px 8px;font-size:9px;color:#d0f8c0;font-weight:700;opacity:0;transform:translateY(5px);transition:opacity .3s,transform .3s;}
      .pcd-pf.pcd-show{opacity:1;transform:none;}
      .pcd-sok{background:#2d6a22;align-items:center;justify-content:center;padding:14px 12px;}
      .pcd-oktick{font-size:32px;margin-bottom:5px;}
      .pcd-oktitle{color:#fff;font-size:13px;font-weight:800;text-align:center;}
      .pcd-oksub{color:#b0e898;font-size:10px;text-align:center;margin:3px 0 8px;}
      .pcd-okfields{width:100%;display:flex;flex-direction:column;gap:3px;margin-bottom:8px;}
      .pcd-okf{background:rgba(255,255,255,.2);border-radius:6px;padding:3px 8px;font-size:9px;color:#fff;font-weight:700;}
      .pcd-okcta{background:rgba(255,255,255,.22);border:1px solid rgba(255,255,255,.35);border-radius:8px;padding:5px 14px;color:#fff;font-size:10px;font-weight:700;text-align:center;}
      .pcd-caption{position:absolute;bottom:16px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,.85);color:#fff;font-size:12px;font-weight:700;padding:7px 18px;border-radius:14px;white-space:nowrap;opacity:0;transition:opacity .4s;border:1px solid rgba(255,255,255,.12);}
      .pcd-caption.pcd-show{opacity:1;}
    `;
    document.head.appendChild(style);
    return () => { document.getElementById("pcd-styles")?.remove(); };
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    let timers: ReturnType<typeof setTimeout>[] = [];

    function q(id: string) { return el.querySelector(`[data-pcd="${id}"]`) as HTMLElement | null; }
    function show(id: string) { q(id)?.classList.add("pcd-show", "pcd-active"); }
    function lit(id: string) { q(id)?.classList.add("pcd-lit"); }
    function cap(txt: string) { const c = q("caption"); if (c) { c.textContent = txt; c.classList.add("pcd-show"); } }
    function hideCap() { q("caption")?.classList.remove("pcd-show"); }
    function scene(id: string) {
      ["sqr","scam","sproc","sok"].forEach(s => q(s)?.classList.remove("pcd-active"));
      q(id)?.classList.add("pcd-active");
    }
    function setCounter(n: number) {
      const num = q("num"); if (num) num.textContent = String(n);
      if (n > 0) {
        q("num")?.classList.add("pcd-active");
        q("clabel")?.classList.add("pcd-active");
        q("counter")?.classList.add("pcd-active");
        const prog = q("prog") as HTMLElement | null;
        if (prog) prog.style.width = (n / 56 * 100) + "%";
        const hint = q("phint");
        if (hint) { hint.textContent = `  ${56 - n} questions left to auto-fill  →`; hint.classList.add("pcd-active"); }
      }
    }

    function run() {
      q("phone")?.classList.remove("pcd-up","pcd-down");
      q("qrcard")?.classList.remove("pcd-pulse");
      q("rowlic")?.classList.remove("pcd-filled");
      const ubtn = q("ubtn"); if (ubtn) ubtn.textContent = "📎 Upload";
      ["chip0","chip1","chip2","chip3","clf0","clf1","clf2",
       "pf0","pf1","pf2","pf3","pf4","pf5"].forEach(id => q(id)?.classList.remove("pcd-show","pcd-active"));
      ["lf0","lf1","lf2","lf3","lf4","lf5"].forEach(id => q(id)?.classList.remove("pcd-lit"));
      q("num")?.classList.remove("pcd-active"); const num = q("num"); if (num) num.textContent = "0";
      q("clabel")?.classList.remove("pcd-active");
      q("counter")?.classList.remove("pcd-active");
      const prog = q("prog") as HTMLElement | null; if (prog) prog.style.width = "0";
      q("phint")?.classList.remove("pcd-active");
      const cs = q("camstatus"); if (cs) cs.textContent = "Align licence in frame…";
      scene("sqr"); hideCap();

      const steps: [number, () => void][] = [
        [0, () => {}],
        [1500, () => { q("qrcard")?.classList.add("pcd-pulse"); cap("📱  Step 1: Scan the QR code with your phone"); }],
        [3000, () => { q("phone")?.classList.add("pcd-up"); scene("sqr"); }],
        [4500, () => { q("qrcard")?.classList.remove("pcd-pulse"); scene("scam"); cap("📸  Step 2: Point your camera at the Driver's Licence"); }],
        [5300, () => { const cs2 = q("camstatus"); if (cs2) cs2.textContent = "📖  Reading your details…"; }],
        [5700, () => { lit("lf0"); }],
        [6000, () => { lit("lf1"); show("clf0"); }],
        [6400, () => { lit("lf2"); show("clf1"); }],
        [6800, () => { lit("lf3"); lit("lf4"); show("clf2"); }],
        [7200, () => { lit("lf5"); const cs3 = q("camstatus"); if (cs3) cs3.textContent = "✅  Almost done!"; }],
        [8000, () => { scene("sproc"); cap("⚡  Luma is reading your document…"); }],
        [8400, () => { show("pf0"); setCounter(1); }],
        [8700, () => { show("pf1"); setCounter(2); }],
        [9000, () => { show("pf2"); setCounter(3); }],
        [9300, () => { show("pf3"); setCounter(4); }],
        [9600, () => { show("pf4"); setCounter(5); }],
        [9900, () => { show("pf5"); setCounter(6); }],
        [10500, () => { scene("sok"); cap("✅  Done — 6 questions filled in automatically!"); }],
        [11000, () => { q("rowlic")?.classList.add("pcd-filled"); const ub = q("ubtn"); if (ub) ub.textContent = "✓  Done"; }],
        [11300, () => show("chip0")],
        [11550, () => show("chip1")],
        [11800, () => show("chip2")],
        [12050, () => show("chip3")],
        [13500, () => { q("phone")?.classList.add("pcd-down"); cap("🚀  No typing needed — Luma does it for you"); }],
        [15000, () => { q("phone")?.classList.remove("pcd-down"); hideCap(); }],
        [16000, () => run()],
      ];

      timers = steps.map(([ms, fn]) => setTimeout(fn, ms));
    }

    const start = setTimeout(run, 400);
    return () => { clearTimeout(start); timers.forEach(clearTimeout); };
  }, []);

  const qrSvg = (
    <svg viewBox="0 0 50 50" width="50" height="50">
      <rect width="50" height="50" fill="#fff" />
      <rect x="4" y="4" width="14" height="14" rx="2" fill="#2d6a22" />
      <rect x="32" y="4" width="14" height="14" rx="2" fill="#2d6a22" />
      <rect x="4" y="32" width="14" height="14" rx="2" fill="#2d6a22" />
      <rect x="7" y="7" width="8" height="8" rx="1" fill="#fff" />
      <rect x="35" y="7" width="8" height="8" rx="1" fill="#fff" />
      <rect x="7" y="35" width="8" height="8" rx="1" fill="#fff" />
    </svg>
  );

  return (
    <div className="pcd-overlay" onClick={onClose} ref={containerRef}>
      <button className="pcd-close" onClick={onClose}>×</button>

      <div className="pcd-scene" onClick={e => e.stopPropagation()}>

        {/* LEFT PANEL */}
        <div className="pcd-left">
          <div className="pcd-hero">
            <h2>📎  Upload Documents — Answer Far Fewer Questions</h2>
            <p>Every document Luma reads fills your form automatically — skip 60% of questions.</p>
            <div className="pcd-tip">
              <span className="pcd-tip-icon">📱</span>
              <div>
                <b>Easiest way: use your phone camera</b>
                <span>Scan the QR code on the right → photograph your documents → they upload automatically.</span>
              </div>
            </div>
            <div className="pcd-pills">
              <span className="pcd-pill">① Scan QR</span>
              <span className="pcd-pill">② Photograph doc</span>
              <span className="pcd-pill">③ Questions disappear</span>
            </div>
          </div>

          <div className="pcd-savebar">
            <span>🎯 Start with the 5 Required docs — then add Recommended to save even more.</span>
          </div>

          {/* Driver's Licence Row */}
          <div className="pcd-row" data-pcd="rowlic">
            <div className="pcd-accent" />
            <div className="pcd-icon">🪪</div>
            <div className="pcd-info">
              <h4>Driver's Licence — Front</h4>
              <p>Fills: name, DOB, address, postcode, gender</p>
              <div className="pcd-chips">
                <span className="pcd-chip" data-pcd="chip0">✓ Marco Antonio Russo</span>
                <span className="pcd-chip" data-pcd="chip1">✓ 14 / 03 / 1979</span>
                <span className="pcd-chip" data-pcd="chip2">✓ 12 Smith St</span>
                <span className="pcd-chip" data-pcd="chip3">✓ Elizabeth SA 5112</span>
              </div>
            </div>
            <span className="pcd-skip">Skips 6 qs</span>
            <span className="pcd-btn" data-pcd="ubtn">📎 Upload</span>
          </div>

          {/* Other rows */}
          {[
            ["🏦", "Bank Statement", "Fills: bank name, BSB, account number", "Skips 4 qs"],
            ["👨‍⚕️", "Doctor or GP Letter", "Fills: doctor name, clinic address, phone", "Skips 8 qs"],
            ["📋", "Medical Report / Specialist Letter", "Fills: diagnosis, condition, treatment", "Skips 12 qs"],
          ].map(([icon, name, fills, skip]) => (
            <div className="pcd-row" key={name}>
              <div className="pcd-accent" />
              <div className="pcd-icon">{icon}</div>
              <div className="pcd-info">
                <h4>{name}</h4>
                <p>{fills}</p>
              </div>
              <span className="pcd-skip">{skip}</span>
              <span className="pcd-btn">📎 Upload</span>
            </div>
          ))}
        </div>

        {/* RIGHT PANEL */}
        <div className="pcd-right">
          <div className="pcd-rhead">
            <div className="pcd-avatar">🦸</div>
            <div>
              <h3>🗂️  Document Vault</h3>
              <p>SA466 — Disability Support Pension</p>
            </div>
          </div>

          {/* Counter */}
          <div className="pcd-counter" data-pcd="counter">
            <div className="pcd-chead">
              <span>⚡ Auto-Fill Progress</span>
            </div>
            <div className="pcd-cbody">
              <div className="pcd-num" data-pcd="num">0</div>
              <div className="pcd-clabel" data-pcd="clabel">QUESTIONS AUTO-FILLED</div>
              <div className="pcd-progwrap">
                <div className="pcd-prog" data-pcd="prog" />
              </div>
              <div className="pcd-phint" data-pcd="phint">Upload your first document to see this climb 📈</div>
            </div>
          </div>

          {/* QR Card */}
          <div className="pcd-qr" data-pcd="qrcard">
            <h4>📱 Faster on your phone</h4>
            <p>Scan this code with your phone camera — photograph docs and they auto-upload here.</p>
            <div className="pcd-qrinner">
              <div className="pcd-qrbox">{qrSvg}</div>
              <div className="pcd-qrsteps">
                → Open phone camera<br />
                → Scan this code<br />
                → Photograph each doc<br />
                → Watch questions vanish ✨
              </div>
            </div>
          </div>
        </div>

        {/* PHONE MOCKUP */}
        <div className="pcd-phone" data-pcd="phone">
          <div className="pcd-pbody">
            <div className="pcd-pscreen">
              <div className="pcd-notch" />
              <div className="pcd-statusbar">
                <span>9:41</span>
                <span>●●● 🔋</span>
              </div>

              {/* Scene: QR Scan */}
              <div className="pcd-pscene pcd-sqr" data-pcd="sqr">
                <div className="pcd-browser">luma-connect-assist.lovable.app</div>
                <div className="pcd-qtitle">Scan with your<br />phone camera</div>
                <div className="pcd-qrphone">{qrSvg}</div>
                <div className="pcd-beam" />
                <div className="pcd-qhint">Point your phone camera here</div>
              </div>

              {/* Scene: Camera */}
              <div className="pcd-pscene pcd-scam" data-pcd="scam">
                <div className="pcd-vf">
                  <div className="pcd-lic">
                    <div className="pcd-lhead">
                      <span className="pcd-lstate">SOUTH AUSTRALIA<br />DRIVER LICENCE</span>
                      <span className="pcd-lcrest">SA</span>
                    </div>
                    <div className="pcd-lbody">
                      <div className="pcd-lphoto">
                        <div style={{ width: "100%", height: "100%", background: "linear-gradient(135deg, #a0b8d8 0%, #c8d8f0 100%)" }} />
                      </div>
                      <div className="pcd-lfields">
                        {[
                          ["SURNAME", "RUSSO"],
                          ["GIVEN NAMES", "MARCO ANTONIO"],
                          ["DOB", "14/03/1979"],
                          ["ADDRESS", "12 SMITH ST"],
                          ["", "ELIZABETH SA 5112"],
                          ["LIC NO", "S1234567"],
                        ].map(([lbl, val], i) => (
                          <div className="pcd-lf" data-pcd={`lf${i}`} key={i}>
                            <div className="pcd-lflbl">{lbl}</div>
                            <div className="pcd-lfval">{val}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="pcd-barcode" />
                  </div>
                  <div className="pcd-scanline" />
                </div>
                <div className="pcd-camstatus" data-pcd="camstatus">Align licence in frame…</div>
                <div className="pcd-camlive">
                  <div className="pcd-camlive-row" data-pcd="clf0">✓  Marco Antonio Russo</div>
                  <div className="pcd-camlive-row" data-pcd="clf1">✓  DOB: 14 / 03 / 1979</div>
                  <div className="pcd-camlive-row" data-pcd="clf2">✓  12 Smith St, Elizabeth SA</div>
                </div>
                <div className="pcd-shutter">
                  <div className="pcd-shutter-inner" />
                </div>
              </div>

              {/* Scene: Processing */}
              <div className="pcd-pscene pcd-sproc" data-pcd="sproc">
                <div className="pcd-procicon">🔍</div>
                <div className="pcd-spinner" />
                <div className="pcd-proctitle">Reading document…</div>
                <div className="pcd-procsub">Extracting your details</div>
                <div className="pcd-procfields">
                  {["✓  Marco Antonio Russo", "✓  14 / 03 / 1979", "✓  12 Smith St", "✓  Elizabeth SA 5112", "✓  Gender: Male", "✓  Postcode: 5112"].map((t, i) => (
                    <div className="pcd-pf" data-pcd={`pf${i}`} key={i}>{t}</div>
                  ))}
                </div>
              </div>

              {/* Scene: Success */}
              <div className="pcd-pscene pcd-sok" data-pcd="sok">
                <div className="pcd-oktick">✅</div>
                <div className="pcd-oktitle">6 questions<br />filled in!</div>
                <div className="pcd-oksub">No typing needed</div>
                <div className="pcd-okfields">
                  {["✓  Marco Antonio Russo", "✓  14 / 03 / 1979", "✓  12 Smith St, Elizabeth", "✓  SA  •  Postcode 5112", "✓  Gender: Male"].map((t, i) => (
                    <div className="pcd-okf" key={i}>{t}</div>
                  ))}
                </div>
                <div className="pcd-okcta">🎉 No typing needed</div>
              </div>
            </div>
          </div>
        </div>

        {/* Caption */}
        <div className="pcd-caption" data-pcd="caption" />
      </div>
    </div>
  );
};
