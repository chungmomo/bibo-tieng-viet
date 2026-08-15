/* Phát âm bằng Web Speech API có sẵn trong trình duyệt (giọng vi-VN / ja-JP). */
let voices = [];
function loadVoices() {
  if ("speechSynthesis" in window) voices = window.speechSynthesis.getVoices();
}
if ("speechSynthesis" in window) {
  loadVoices();
  window.speechSynthesis.onvoiceschanged = loadVoices;
}

/* Giọng "Google" (VD: "Google Tiếng Việt", "Google 日本語") nghe tự nhiên
   hơn hẳn giọng mặc định của hệ điều hành — ưu tiên chọn giọng này nếu
   trình duyệt có (Chrome/Edge trên máy có kết nối mạng). */
function isGoogleVoice(v) {
  return /google/i.test(v.name) || /google/i.test(v.voiceURI || "");
}

function pickVoice(lang) {
  const prefix = lang.split("-")[0];
  const matchesLang = (v) => v.lang === lang;
  const matchesPrefix = (v) => v.lang && v.lang.startsWith(prefix);

  return (
    voices.find((v) => matchesLang(v) && isGoogleVoice(v)) ||
    voices.find((v) => matchesPrefix(v) && isGoogleVoice(v)) ||
    voices.find(matchesLang) ||
    voices.find(matchesPrefix) ||
    null
  );
}

function speak(text, lang) {
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

export const VietKidSpeech = {
  speakVi: (text) => speak(text, "vi-VN"),
  speakJa: (text) => speak(text, "ja-JP"),
};
