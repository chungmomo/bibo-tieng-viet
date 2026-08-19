/* Phát âm bằng giọng Google Translate (chất lượng ổn định, giống nhau
   trên mọi máy/trình duyệt, không phụ thuộc giọng đã cài sẵn của hệ
   điều hành). Đây là endpoint không chính thức của Google Translate nên
   không đảm bảo 100% — nếu tải lỗi (mất mạng, bị chặn...), tự động
   chuyển sang giọng có sẵn của trình duyệt (Web Speech API) để bé vẫn
   nghe được. */
const GOOGLE_TTS_LANG = { "vi-VN": "vi", "ja-JP": "ja" };
const audioEl = new Audio();

function speakViaGoogleTranslate(text, lang) {
  const playPromise = new Promise((resolve, reject) => {
    const tl = GOOGLE_TTS_LANG[lang] || lang;
    const url =
      "https://translate.google.com/translate_tts?ie=UTF-8&q=" +
      encodeURIComponent(text) +
      "&tl=" + tl + "&client=tw-ob";

    audioEl.pause();
    audioEl.onended = null;
    audioEl.onerror = null;
    audioEl.src = url;
    audioEl.onended = resolve;
    audioEl.onerror = () => reject(new Error("google-tts-failed"));
    audioEl.play().catch(reject);
  });

  // Đây là endpoint không chính thức — nếu bị chặn/chậm, đừng để bé chờ
  // lâu mới nghe được giọng dự phòng.
  const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error("google-tts-timeout")), 3000));
  return Promise.race([playPromise, timeout]);
}

/* ---- Dự phòng: giọng có sẵn của trình duyệt (Web Speech API) ---- */
let voices = [];
function loadVoices() {
  if ("speechSynthesis" in window) voices = window.speechSynthesis.getVoices();
}
if ("speechSynthesis" in window) {
  loadVoices();
  window.speechSynthesis.onvoiceschanged = loadVoices;
}

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

function speakViaBrowserVoice(text, lang) {
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

function speak(text, lang) {
  if (!text) return;
  speakViaGoogleTranslate(text, lang).catch(() => speakViaBrowserVoice(text, lang));
}

export const VietKidSpeech = {
  speakVi: (text) => speak(text, "vi-VN"),
  speakJa: (text) => speak(text, "ja-JP"),
};
