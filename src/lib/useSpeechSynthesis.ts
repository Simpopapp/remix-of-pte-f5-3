import { useCallback, useEffect, useState } from "react";

export function useSpeechSynthesis() {
  // SSR e a primeira renderização do cliente devem concordar (hidratação):
  // `supported` só vira true após montar, via effect.
  const [supported, setSupported] = useState(false);
  useEffect(() => {
    setSupported(typeof window !== "undefined" && "speechSynthesis" in window);
  }, []);
  const [speaking, setSpeaking] = useState(false);

  const cancel = useCallback(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    setSpeaking(false);
  }, []);

  const speak = useCallback((text: string, rate = 1) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window) || !text) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    utterance.rate = rate;
    const voices = window.speechSynthesis.getVoices();
    const voice =
      voices.find((v) => v.lang.replace("_", "-").startsWith("en-US")) ??
      voices.find((v) => v.lang.toLowerCase().startsWith("en"));
    if (voice) utterance.voice = voice;
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    setSpeaking(true);
    window.speechSynthesis.speak(utterance);
  }, []);

  useEffect(() => cancel, [cancel]);

  return { supported, speaking, speak, cancel };
}
