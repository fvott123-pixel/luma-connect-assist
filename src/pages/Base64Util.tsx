import { useState, useEffect } from "react";

const Base64Util = () => {
  const [base64, setBase64] = useState<string>("");
  const [status, setStatus] = useState("Loading PDF...");
  const [size, setSize] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/forms/DSP/sa466en.pdf");
        if (!res.ok) throw new Error(`Failed: ${res.status}`);
        const buf = await res.arrayBuffer();
        setSize(buf.byteLength);
        const bytes = new Uint8Array(buf);
        let binary = "";
        for (let i = 0; i < bytes.length; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        const b64 = btoa(binary);
        const dataUri = `data:application/pdf;base64,${b64}`;
        setBase64(dataUri);
        setStatus(`Done! Size: ${buf.byteLength} bytes, Base64 length: ${dataUri.length}`);
      } catch (err: any) {
        setStatus(`Error: ${err.message}`);
      }
    })();
  }, []);

  return (
    <div style={{ padding: 20 }}>
      <h1>PDF Base64 Extractor</h1>
      <p id="status-text">{status}</p>
      <p>Raw size: {size} bytes</p>
      <textarea
        id="base64-output"
        value={base64}
        readOnly
        style={{ width: "100%", height: 200, fontSize: 10 }}
      />
    </div>
  );
};

export default Base64Util;
