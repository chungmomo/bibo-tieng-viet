/* Hiệu ứng âm thanh + confetti (không cần file audio ngoài) */
const VietKidSound = (() => {
  let ctx = null;

  function getCtx() {
    if (!ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return null;
      ctx = new AudioCtx();
    }
    return ctx;
  }

  function tone(freq, start, duration, type = "sine", gain = 0.15) {
    const audio = getCtx();
    if (!audio) return;
    const osc = audio.createOscillator();
    const g = audio.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    g.gain.value = gain;
    osc.connect(g);
    g.connect(audio.destination);
    osc.start(audio.currentTime + start);
    g.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + start + duration);
    osc.stop(audio.currentTime + start + duration + 0.02);
  }

  function playCorrect() {
    tone(523.25, 0, 0.12);
    tone(659.25, 0.1, 0.12);
    tone(783.99, 0.2, 0.2);
  }

  function playWrong() {
    tone(220, 0, 0.25, "sawtooth", 0.1);
  }

  function playClick() {
    tone(440, 0, 0.06, "triangle", 0.08);
  }

  function playCheer() {
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(f, i * 0.1, 0.18));
  }

  const CONFETTI_EMOJI = ["🎉", "⭐", "🎊", "🌟", "✨", "👑", "💖", "🎀"];

  function confettiBurst(count = 24) {
    for (let i = 0; i < count; i++) {
      const el = document.createElement("div");
      el.className = "confetti";
      el.textContent = CONFETTI_EMOJI[Math.floor(Math.random() * CONFETTI_EMOJI.length)];
      el.style.left = Math.random() * 100 + "vw";
      el.style.animationDuration = 1.6 + Math.random() * 1.4 + "s";
      el.style.fontSize = 1 + Math.random() * 1.4 + "rem";
      document.body.appendChild(el);
      setTimeout(() => el.remove(), 3200);
    }
  }

  return { playCorrect, playWrong, playClick, playCheer, confettiBurst };
})();
