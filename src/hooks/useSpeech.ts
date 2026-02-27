import { useState, useCallback, useRef, useEffect } from "react";

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

/** Voice-to-text via Web Speech API */
export function useVoiceInput(onResult: (text: string) => void) {
  const [listening, setListening] = useState(false);
  const recRef = useRef<any>(null);

  const toggle = useCallback(() => {
    if (listening && recRef.current) {
      recRef.current.stop();
      setListening(false);
      return;
    }

    const SR = window.SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;

    const rec = new SR();
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.onresult = (e: SpeechRecognitionEvent) => {
      const text = e.results[0]?.[0]?.transcript;
      if (text) onResult(text);
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recRef.current = rec;
    rec.start();
    setListening(true);
  }, [listening, onResult]);

  return { listening, toggle, supported: typeof window !== "undefined" && !!(window.SpeechRecognition || (window as any).webkitSpeechRecognition) };
}

/** Text-to-speech via SpeechSynthesis API */
export function useTTS() {
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null);

  // Pick a warm female voice once voices load
  useEffect(() => {
    const pickVoice = () => {
      const voices = window.speechSynthesis?.getVoices() ?? [];
      // Prefer female English voices
      const female = voices.find(
        (v) => /female/i.test(v.name) && /en/i.test(v.lang)
      );
      const samantha = voices.find((v) => /samantha|zira|karen|fiona|victoria|google.*female|google.*us/i.test(v.name));
      const englishDefault = voices.find((v) => /en/i.test(v.lang));
      voiceRef.current = female || samantha || englishDefault || voices[0] || null;
    };
    pickVoice();
    window.speechSynthesis?.addEventListener("voiceschanged", pickVoice);
    return () => window.speechSynthesis?.removeEventListener("voiceschanged", pickVoice);
  }, []);

  const speak = useCallback((text: string) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    // Strip emoji characters
    const clean = text.replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, "").trim();
    if (!clean) return;
    const utter = new SpeechSynthesisUtterance(clean);
    utter.rate = 0.95;
    utter.pitch = 1.1;
    if (voiceRef.current) utter.voice = voiceRef.current;
    window.speechSynthesis.speak(utter);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => window.speechSynthesis?.cancel();
  }, []);

  return { speak };
}
