/* Đọc chữ bằng giọng nói (Web Speech API) - tiếng Việt & tiếng Nhật */
const VietKidSpeech = (() => {
  let voices = [];

  function loadVoices() {
    if (!("speechSynthesis" in window)) return;
    voices = window.speechSynthesis.getVoices();
  }

  if ("speechSynthesis" in window) {
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
  }

  function pickVoice(lang) {
    const exact = voices.find((v) => v.lang === lang);
    if (exact) return exact;
    const prefix = lang.split("-")[0];
    return voices.find((v) => v.lang && v.lang.startsWith(prefix)) || null;
  }

  function speak(text, lang = "vi-VN") {
    if (!("speechSynthesis" in window) || !text) return;
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = lang;
    utter.rate = 0.82;
    utter.pitch = 1.15;
    const voice = pickVoice(lang);
    if (voice) utter.voice = voice;
    window.speechSynthesis.speak(utter);
  }

  return {
    speakVi: (text) => speak(text, "vi-VN"),
    speakJa: (text) => speak(text, "ja-JP"),
    isSupported: () => "speechSynthesis" in window,
  };
})();
