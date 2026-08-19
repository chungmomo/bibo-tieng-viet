/* Phát âm bằng giọng Google Translate (chất lượng ổn định, giống nhau
   trên mọi máy/trình duyệt, không phụ thuộc giọng đã cài sẵn của hệ
   điều hành). Đây là endpoint không chính thức của Google Translate nên
   không đảm bảo 100% — thử vài biến thể URL trước khi bỏ cuộc, rồi mới
   chuyển sang giọng có sẵn của trình duyệt (Web Speech API). */
const GOOGLE_TTS_LANG = { "vi-VN": "vi", "ja-JP": "ja" };
const audioEl = new Audio();

const GOOGLE_TTS_URL_BUILDERS = [
  (text, tl) => "https://translate.google.com/translate_tts?ie=UTF-8&q=" + encodeURIComponent(text) + "&tl=" + tl + "&client=gtx",
  (text, tl) => "https://translate.googleapis.com/translate_tts?ie=UTF-8&q=" + encodeURIComponent(text) + "&tl=" + tl + "&client=gtx",
];

/* Nhớ lại giọng nào đã từng phát thành công cho mỗi (giọng, từ) — tránh
   gọi lại Google mỗi lần bé bấm nghe lại cùng 1 từ. */
const knownGoodCache = new Set();

function playUrl(url, timeoutMs) {
  return new Promise((resolve, reject) => {
    audioEl.pause();
    audioEl.onended = null;
    audioEl.onerror = null;
    const timer = setTimeout(() => reject(new Error("timeout")), timeoutMs);
    audioEl.onended = () => {
      clearTimeout(timer);
      resolve();
    };
    audioEl.onerror = () => {
      clearTimeout(timer);
      reject(new Error("format-error"));
    };
    audioEl.src = url;
    audioEl.play().catch((e) => {
      clearTimeout(timer);
      reject(e);
    });
  });
}

async function speakViaGoogleTranslate(text, lang) {
  const tl = GOOGLE_TTS_LANG[lang] || lang;
  const cacheKey = tl + ":" + text;
  const timeoutMs = knownGoodCache.has(cacheKey) ? 2500 : 1500;

  let lastError;
  for (const buildUrl of GOOGLE_TTS_URL_BUILDERS) {
    try {
      await playUrl(buildUrl(text, tl), timeoutMs);
      knownGoodCache.add(cacheKey);
      return;
    } catch (e) {
      lastError = e;
    }
  }
  throw lastError || new Error("google-tts-failed");
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

function normLang(l) {
  return (l || "").toLowerCase().replace("_", "-");
}

function pickVoice(lang) {
  const target = normLang(lang);
  const prefix = target.split("-")[0];
  const matchesLang = (v) => normLang(v.lang) === target;
  const matchesPrefix = (v) => normLang(v.lang).startsWith(prefix);

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
  // Nếu máy không có giọng khớp đúng ngôn ngữ, vẫn đọc bằng giọng gần
  // nhất trình duyệt tự chọn (có thể lệch giọng) — bé vẫn nghe được âm
  // thanh khi bấm nút, còn hơn im lặng hoàn toàn.
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
