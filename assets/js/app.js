/* VietKid - router (hash-based) + toàn bộ giao diện.
   Yêu cầu phụ huynh đăng nhập (Firebase Auth) trước khi dùng; dữ liệu hồ sơ
   + tiến trình học lưu trên Firestore (assets/js/store.js). */
import { onAuthChange, renderAuthGate, signOutParent } from "./auth.js";
import * as Store from "./store.js";
import { getContent } from "./data.js";
import { VietKidSpeech } from "./speech.js";
import { VietKidSound } from "./sound.js";

const AVATARS = [
  "👸", "🤴", "🧚", "🦄", "🧜", "🎀",
  "🦸", "🚀", "🤖", "🐉",
  "🐰", "🐱", "🐻", "🐨", "🦋", "🦁", "🐼", "🐧",
];

const app = document.getElementById("app");
const mainNav = document.getElementById("main-nav");
const headerProfileSlot = document.getElementById("header-profile-slot");
const headerAuthSlot = document.getElementById("header-auth-slot");

let currentUser = null;
let content = null; // { alphabet, vocabulary, vocabByID }
let redirectAfterSelect = null;
let selectedAvatar = null;

/* ==========================================================================
   0. KHỞI ĐỘNG + XÁC THỰC
   ========================================================================== */
onAuthChange(async (user) => {
  currentUser = user;

  if (!user) {
    mainNav.style.visibility = "hidden";
    headerProfileSlot.innerHTML = "";
    headerAuthSlot.innerHTML = "";
    renderAuthGate(app);
    return;
  }

  mainNav.style.visibility = "visible";
  headerAuthSlot.innerHTML = '<button class="btn btn-outline" id="signout-btn" style="background:transparent;border-color:#fff;color:#fff;">🚪 Đăng xuất</button>';
  document.getElementById("signout-btn").addEventListener("click", () => signOutParent());

  if (!content) content = await getContent();
  route();
});

window.addEventListener("hashchange", () => {
  if (currentUser) route();
});

function navigate(path) {
  location.hash = path;
}

function requireProfile() {
  const id = Store.getCurrentProfileId(currentUser.uid);
  if (!id) {
    redirectAfterSelect = location.hash.replace(/^#/, "") || "/";
    navigate("/");
    return null;
  }
  return id;
}

async function renderHeader() {
  const parts = parseHash();
  [...mainNav.children].forEach((a) => {
    const r = a.getAttribute("data-route");
    const isActive = (r === "" && parts.length === 0) || (r !== "" && parts[0] === r);
    a.classList.toggle("active", isActive);
  });

  const profileId = Store.getCurrentProfileId(currentUser.uid);
  if (!profileId) {
    headerProfileSlot.innerHTML = '<a href="#/" class="btn btn-outline" style="background:transparent;border-color:#fff;color:#fff;">Chọn hồ sơ bé</a>';
    return;
  }
  const profile = await Store.getProfile(currentUser.uid, profileId);
  if (!profile) {
    Store.clearCurrentProfile(currentUser.uid);
    headerProfileSlot.innerHTML = '<a href="#/" class="btn btn-outline" style="background:transparent;border-color:#fff;color:#fff;">Chọn hồ sơ bé</a>';
    return;
  }
  headerProfileSlot.innerHTML =
    '<a href="#/progress" class="header-profile">' +
    '<span class="avatar-badge">' + profile.avatar + '</span>' +
    '<span>' + escapeHtml(profile.name) + ' · ⭐ ' + profile.total_stars + '</span>' +
    '</a>';
}

function parseHash() {
  const h = location.hash.replace(/^#/, "");
  if (!h || h === "/") return [];
  return h.split("/").filter(Boolean);
}

async function route() {
  window.scrollTo(0, 0);
  stopMascot();
  const parts = parseHash();
  await renderHeader();
  if (parts.length === 0) return renderHome();
  if (parts[0] === "alphabet") return renderAlphabet();
  if (parts[0] === "letter-hunt" && parts.length === 1) return renderLetterHuntList();
  if (parts[0] === "letter-hunt" && parts.length === 2) return renderLetterHuntGame(parts[1]);
  if (parts[0] === "writing" && parts.length === 1) return renderWritingList();
  if (parts[0] === "writing" && parts.length === 2) return renderWritingPractice(parts[1]);
  if (parts[0] === "topics" && parts.length === 1) return renderTopics();
  if (parts[0] === "topics" && parts.length === 2) return renderVocabulary(parts[1]);
  if (parts[0] === "games" && parts.length === 3) return renderGame(parts[1], parts[2]);
  if (parts[0] === "progress") return renderProgress();
  return renderNotFound();
}

function renderNotFound() {
  app.innerHTML =
    '<h1 class="page-title">Không tìm thấy trang 😢</h1>' +
    '<p class="page-subtitle">Trang bé đang tìm không tồn tại.</p>' +
    '<div style="text-align:center;"><a class="btn btn-primary" href="#/">🏠 Về trang chủ</a></div>';
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* Lời khen + emoji thay đổi theo số sao đạt được, chọn ngẫu nhiên trong vài
   biến thể mỗi bậc để không lặp lại y hệt nhau mỗi lần chơi xong. */
const RESULT_MESSAGES = {
  3: { emojis: ["🌟", "🏆", "👑", "🎉"], titles: ["Xuất sắc!", "Tuyệt vời!", "Giỏi quá đi mất!", "Quá đỉnh luôn!"] },
  2: { emojis: ["😊", "👏", "✨"], titles: ["Giỏi lắm!", "Làm tốt lắm!", "Cố thêm xíu nữa là max sao!"] },
  1: { emojis: ["🙂", "💪", "🌱"], titles: ["Cố lên nhé!", "Sắp được rồi!", "Luyện thêm chút nữa nhé!"] },
  0: { emojis: ["🙂", "💪", "🌱"], titles: ["Cố lên nhé!", "Sắp được rồi!", "Luyện thêm chút nữa nhé!"] },
};
function pickResultMessage(stars) {
  const tier = RESULT_MESSAGES[stars] || RESULT_MESSAGES[0];
  return {
    emoji: tier.emojis[Math.floor(Math.random() * tier.emojis.length)],
    title: tier.titles[Math.floor(Math.random() * tier.titles.length)],
  };
}

/* Phát lại animation "nảy vào" cho 1 emoji khi nội dung của nó đổi
   (VD: sang flashcard khác, câu hỏi mới) mà không cần render lại cả trang */
function popEmoji(el) {
  if (!el) return;
  el.classList.remove("emoji-pop");
  void el.offsetWidth;
  el.classList.add("emoji-pop");
}

/* ==========================================================================
   1. TRANG CHỦ (chọn hồ sơ + dashboard)
   ========================================================================== */
async function renderHome() {
  const currentId = Store.getCurrentProfileId(currentUser.uid);
  if (currentId) {
    const profile = await Store.getProfile(currentUser.uid, currentId);
    if (profile) return renderDashboard(profile);
    Store.clearCurrentProfile(currentUser.uid);
  }
  renderProfileSelect();
}

async function renderProfileSelect() {
  app.innerHTML =
    '<h1 class="page-title">Chào mừng bé đến với VietKid! 👑✨</h1>' +
    '<p class="page-subtitle">Chọn hồ sơ của bé để bắt đầu học tiếng Việt nhé</p>' +
    '<div id="profile-grid" class="profile-grid"></div>' +
    '<div id="create-form" class="card-panel" style="display:none; margin-top:20px;">' +
    '  <h3>Tạo hồ sơ mới 🎀</h3>' +
    '  <p class="page-subtitle" style="margin-bottom:10px;">Bé tên là gì?</p>' +
    '  <input id="name-input" class="text-input" maxlength="40" placeholder="Nhập tên của bé...">' +
    '  <p class="page-subtitle" style="margin:14px 0 4px;">Chọn hình đại diện cho bé</p>' +
    '  <div id="avatar-picker" class="avatar-picker"></div>' +
    '  <button class="btn btn-primary btn-block btn-lg" id="create-btn" style="margin-top:10px;">Bắt đầu học! ✨</button>' +
    '  <p id="create-error" style="color:var(--red); font-weight:700; display:none; margin-top:10px;"></p>' +
    '</div>' +
    '<div style="text-align:center; margin-top:20px;">' +
    '  <button class="btn btn-outline" id="show-create-btn">➕ Tạo hồ sơ mới</button>' +
    '</div>';

  const grid = document.getElementById("profile-grid");
  const profiles = await Store.listProfiles(currentUser.uid);
  profiles.forEach((p) => {
    const card = document.createElement("button");
    card.className = "profile-card";
    card.style = "width:100%;";
    card.innerHTML = '<div class="avatar">' + p.avatar + '</div><div class="name">' + escapeHtml(p.name) + '</div><div class="stars">⭐ ' + p.total_stars + '</div>';
    card.onclick = () => chooseProfile(p.id);
    grid.appendChild(card);
  });
  const newCard = document.createElement("button");
  newCard.className = "new-profile-card";
  newCard.innerHTML = '<span style="font-size:2rem;">➕</span><span>Hồ sơ mới</span>';
  newCard.onclick = showCreateForm;
  grid.appendChild(newCard);

  document.getElementById("show-create-btn").addEventListener("click", showCreateForm);
  document.getElementById("create-btn").addEventListener("click", submitCreateProfile);

  if (profiles.length === 0) showCreateForm();
}

function showCreateForm() {
  const form = document.getElementById("create-form");
  form.style.display = "block";
  const picker = document.getElementById("avatar-picker");
  if (picker.childElementCount === 0) {
    AVATARS.forEach((a) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = a;
      btn.addEventListener("click", () => {
        selectedAvatar = a;
        [...picker.children].forEach((c) => c.classList.remove("selected"));
        btn.classList.add("selected");
      });
      picker.appendChild(btn);
    });
    picker.firstChild.click();
  }
}

async function submitCreateProfile() {
  const nameInput = document.getElementById("name-input");
  const createBtn = document.getElementById("create-btn");
  const errorEl = document.getElementById("create-error");
  errorEl.style.display = "none";
  createBtn.disabled = true;
  try {
    const profile = await Store.createProfile(currentUser.uid, nameInput.value, selectedAvatar || AVATARS[0]);
    await chooseProfile(profile.id);
  } catch (e) {
    errorEl.textContent = e.message;
    errorEl.style.display = "block";
  } finally {
    createBtn.disabled = false;
  }
}

async function chooseProfile(id) {
  Store.setCurrentProfileId(currentUser.uid, id);
  VietKidSound.playCorrect();
  selectedAvatar = null;
  const target = redirectAfterSelect;
  redirectAfterSelect = null;
  if (target && target !== "/") {
    if (location.hash.replace(/^#/, "") === target) await route();
    else navigate(target);
  } else {
    if (location.hash.replace(/^#/, "") === "/" || !location.hash) await route();
    else navigate("/");
  }
}

const MASCOT_MESSAGES = [
  "Học từ mới mỗi ngày, bé sẽ giỏi tiếng Việt cực nhanh đó! 🚀",
  "Rồng Con tin bé làm được! Cố lên nào! 💪",
  "Bé nhớ nghe phát âm thật kỹ trước khi làm bài nhé! 👂",
  "Sao lấp lánh đang chờ bé đó, đi lấy thôi! ⭐",
  "Học một chút mỗi ngày, giỏi hơn mỗi ngày nha bé! 🌱",
  "Rồng Con rất vui khi được học cùng bé! 🐉💕",
];
let mascotInterval = null;

function stopMascot() {
  if (mascotInterval) {
    clearInterval(mascotInterval);
    mascotInterval = null;
  }
}

function renderMascotBuddy() {
  stopMascot();
  const bubble = document.getElementById("mascot-bubble");
  const face = document.getElementById("mascot-face");
  if (!bubble || !face) return;

  let idx = Math.floor(Math.random() * MASCOT_MESSAGES.length);
  function showMessage() {
    bubble.textContent = MASCOT_MESSAGES[idx];
    idx = (idx + 1) % MASCOT_MESSAGES.length;
    popEmoji(bubble);
  }
  showMessage();
  mascotInterval = setInterval(showMessage, 6000);
  face.addEventListener("click", () => {
    showMessage();
    popEmoji(face);
    VietKidSound.playClick();
  });
}

function renderDashboard(profile) {
  app.innerHTML =
    '<div class="welcome-banner">' +
    '  <div class="floaty-decor" aria-hidden="true">' +
    '    <span style="left:5%; animation-delay:0s;">⭐</span>' +
    '    <span style="left:20%; top:60%; animation-delay:0.6s;">🎈</span>' +
    '    <span style="left:75%; animation-delay:1.1s;">✨</span>' +
    '    <span style="left:88%; top:55%; animation-delay:0.3s;">💫</span>' +
    '  </div>' +
    '  <div class="who">' +
    '    <span class="avatar">' + profile.avatar + '</span>' +
    '    <div>' +
    '      <h2>Chào ' + escapeHtml(profile.name) + '! Hôm nay học gì nào?</h2>' +
    '      <div class="badge-row">' + renderBadgeChips(profile.badges) + '</div>' +
    '    </div>' +
    '  </div>' +
    '  <div class="stars-total">⭐ ' + profile.total_stars + ' sao</div>' +
    '</div>' +
    '<div class="quick-links">' +
    '  <a class="quick-link-card" href="#/alphabet"><span class="icon">🔤</span><div class="title">Bảng chữ cái</div><div class="desc">Học 29 chữ cái tiếng Việt</div></a>' +
    '  <a class="quick-link-card" href="#/writing"><span class="icon">✍️</span><div class="title">Tập viết</div><div class="desc">Tô theo hình chữ mờ</div></a>' +
    '  <a class="quick-link-card" href="#/topics"><span class="icon">📚</span><div class="title">Từ vựng</div><div class="desc">Nhiều chủ đề thú vị</div></a>' +
    '  <a class="quick-link-card" href="#/letter-hunt"><span class="icon">🔍</span><div class="title">Tìm chữ cái</div><div class="desc">Bấm đúng hết chữ giống nhau</div></a>' +
    '  <a class="quick-link-card" href="#/progress"><span class="icon">🏆</span><div class="title">Thành tích</div><div class="desc">Xem sao và huy hiệu của bé</div></a>' +
    '</div>' +
    '<div style="text-align:center;"><button class="btn btn-outline" id="switch-profile-btn">🔄 Đổi hồ sơ khác</button></div>' +
    '<div class="mascot-buddy">' +
    '  <div class="mascot-bubble" id="mascot-bubble"></div>' +
    '  <button class="mascot-face" id="mascot-face" type="button" aria-label="Rồng Con động viên bé">🐉</button>' +
    '</div>';

  document.getElementById("switch-profile-btn").addEventListener("click", async () => {
    Store.clearCurrentProfile(currentUser.uid);
    await renderHeader();
    route();
  });
  renderMascotBuddy();
}

function renderBadgeChips(badges) {
  if (!badges.length) return '<span class="badge-chip">🌸 Bé mới bắt đầu hành trình!</span>';
  return badges.map((b) => '<span class="badge-chip"><span class="badge-icon">' + b.icon + '</span> ' + escapeHtml(b.label) + "</span>").join("");
}

/* ==========================================================================
   2. BẢNG CHỮ CÁI
   ========================================================================== */
function renderAlphabet() {
  app.innerHTML =
    '<span class="section-badge">📖 Tập đọc</span>' +
    '<h1 class="page-title">Bảng chữ cái tiếng Việt 🔤</h1>' +
    '<p class="page-subtitle">Chạm vào từng chữ để nghe cách đọc nhé!</p>' +
    '<div style="text-align:center; margin-bottom:20px;"><a class="btn btn-primary" href="#/letter-hunt">🔍 Chơi tìm chữ cái</a></div>' +
    '<div id="alphabet-grid" class="alphabet-grid"></div>';

  const grid = document.getElementById("alphabet-grid");
  content.alphabet.forEach((item) => {
    const card = document.createElement("div");
    card.className = "letter-card";
    card.innerHTML =
      '<div class="letter-card-inner">' +
      '  <div class="letter-face letter-front">' + item.letter + '</div>' +
      '  <div class="letter-face letter-back">' +
      '    <div class="emoji">' + item.emoji + '</div>' +
      '    <div class="word">' + item.word + '</div>' +
      '    <div class="ja">' + item.ja + '</div>' +
      '  </div>' +
      '</div>';
    card.addEventListener("click", () => {
      const wasFlipped = card.classList.contains("flipped");
      card.classList.toggle("flipped");
      VietKidSound.playClick();
      VietKidSpeech.speakVi(wasFlipped ? item.letter : item.word);
    });
    grid.appendChild(card);
  });
}

/* ==========================================================================
   2b. TÌM CHỮ CÁI (nhận diện chữ giữa các chữ giống nhau)
   ========================================================================== */
async function renderLetterHuntList() {
  app.innerHTML =
    '<span class="section-badge gold">💡 Nhận biết</span>' +
    '<h1 class="page-title">🔍 Bé tìm chữ cái</h1>' +
    '<p class="page-subtitle">Chọn 1 chữ cái, rồi bấm hết các ô có đúng chữ đó giữa các chữ trông giống nhau nhé!</p>' +
    '<div class="writing-select-grid" id="hunt-list-grid"></div>';

  const grid = document.getElementById("hunt-list-grid");
  const profileId = Store.getCurrentProfileId(currentUser.uid);
  const summary = profileId ? await Store.computeSummary(currentUser.uid, profileId) : null;

  content.alphabet.forEach((item, idx) => {
    const a = document.createElement("a");
    a.className = "writing-select-card";
    a.href = "#/letter-hunt/" + idx;
    let starsText = "";
    if (summary && summary.letterHunt.letters[idx]) {
      starsText = "⭐".repeat(summary.letterHunt.letters[idx].stars);
    }
    a.innerHTML = '<span class="letter">' + item.letter + '</span><span class="stars">' + starsText + '</span>';
    grid.appendChild(a);
  });
}

const HUNT_GRID_SIZE = 24;

function buildHuntCells(letterIndex) {
  const target = content.alphabet[letterIndex];
  const others = content.alphabet.filter((_, i) => i !== letterIndex);
  const sameType = others.filter((a) => a.type === target.type).map((a) => a.letter);
  const otherType = others.filter((a) => a.type !== target.type).map((a) => a.letter);

  const targetCount = 5 + Math.floor(Math.random() * 3); // 5–7
  const cells = new Array(targetCount).fill(target.letter);
  for (let i = targetCount; i < HUNT_GRID_SIZE; i++) {
    const useSame = sameType.length > 0 && Math.random() < 0.7;
    const pool = useSame ? sameType : otherType.length ? otherType : sameType;
    cells.push(pool[Math.floor(Math.random() * pool.length)]);
  }
  return { cells: shuffle(cells), targetCount };
}

async function renderLetterHuntGame(idxParam) {
  const letterIndex = parseInt(idxParam, 10);
  if (isNaN(letterIndex) || letterIndex < 0 || letterIndex >= content.alphabet.length) return renderNotFound();
  if (!requireProfile()) return;

  const letter = content.alphabet[letterIndex];
  const total = content.alphabet.length;
  const prevLink = letterIndex > 0 ? '<a class="btn" href="#/letter-hunt/' + (letterIndex - 1) + '">⬅️ Chữ trước</a>' : "<span></span>";
  const nextLink = letterIndex < total - 1 ? '<a class="btn" href="#/letter-hunt/' + (letterIndex + 1) + '">Chữ tiếp ➡️</a>' : "";
  const nextModalLink = letterIndex < total - 1
    ? '<a class="btn btn-green" href="#/letter-hunt/' + (letterIndex + 1) + '">➡️ Chữ tiếp theo</a>'
    : "";

  app.innerHTML =
    '<span class="section-badge gold">💡 Nhận biết</span>' +
    '<h1 class="page-title">🔍 Tìm chữ "' + letter.letter + '"</h1>' +
    '<p class="page-subtitle">Bấm vào tất cả ô có đúng chữ "' + letter.letter + '" nhé, coi chừng nhầm với chữ khác!</p>' +
    '<div class="game-header">' +
    '  <div id="hunt-stats"></div>' +
    '  <a class="btn btn-outline" href="#/letter-hunt">⬅️ Danh sách chữ</a>' +
    '</div>' +
    '<div class="exercise-panel" style="max-width:580px;"><div class="hunt-grid" id="hunt-grid"></div></div>' +
    '<div class="writing-nav" style="max-width:520px; margin:20px auto 0;">' + prevLink + nextLink + '</div>' +
    '<div id="result-modal" class="modal-overlay" style="display:none;">' +
    '  <div class="modal-box">' +
    '    <div class="big-emoji" id="modal-emoji">🔍</div>' +
    '    <h2 id="modal-title">Giỏi quá!</h2>' +
    '    <div class="stars-earned" id="stars-earned"></div>' +
    '    <div class="score-text" id="score-text"></div>' +
    '    <div class="modal-actions">' +
    '      <button class="btn btn-primary" id="retry-btn">🔄 Chơi lại</button>' +
    nextModalLink +
    '      <a class="btn btn-outline" href="#/letter-hunt">🔍 Danh sách chữ</a>' +
    '    </div>' +
    '  </div>' +
    '</div>';

  let targetCount, foundCount, wrongCount;

  function updateStats() {
    document.getElementById("hunt-stats").innerHTML =
      '<div class="game-stat">🔎 Tìm được: ' + foundCount + ' / ' + targetCount + '</div>' +
      '<div class="game-stat" style="margin-left:8px;">❌ Bấm sai: ' + wrongCount + '</div>';
  }

  function renderGrid() {
    const { cells, targetCount: tc } = buildHuntCells(letterIndex);
    targetCount = tc;
    foundCount = 0;
    wrongCount = 0;
    updateStats();

    const gridEl = document.getElementById("hunt-grid");
    gridEl.innerHTML = "";
    cells.forEach((ch) => {
      const btn = document.createElement("button");
      btn.className = "hunt-tile";
      btn.textContent = ch;
      btn.addEventListener("click", () => onTileClick(btn, ch));
      gridEl.appendChild(btn);
    });
  }

  function onTileClick(btn, ch) {
    if (btn.classList.contains("found")) return;
    if (ch === letter.letter) {
      btn.classList.add("found");
      foundCount++;
      updateStats();
      VietKidSound.playCorrect();
      if (foundCount === targetCount) setTimeout(finishGame, 400);
    } else {
      wrongCount++;
      updateStats();
      VietKidSound.playWrong();
      btn.classList.add("wrong");
      setTimeout(() => btn.classList.remove("wrong"), 400);
    }
  }

  async function finishGame() {
    let stars;
    if (wrongCount === 0) stars = 3;
    else if (wrongCount <= 2) stars = 2;
    else stars = 1;
    const score = Math.round((targetCount / (targetCount + wrongCount)) * 100);

    const msg = pickResultMessage(stars);
    document.getElementById("modal-emoji").textContent = msg.emoji;
    document.getElementById("modal-title").textContent = msg.title;
    document.getElementById("stars-earned").textContent = "⭐".repeat(stars) + "☆".repeat(3 - stars);
    document.getElementById("score-text").textContent = "Tìm đúng " + targetCount + "/" + targetCount + " chữ, bấm sai " + wrongCount + " lần!";
    document.getElementById("result-modal").style.display = "flex";
    VietKidSound.playCheer();
    VietKidSound.confettiBurst();

    const profileId = Store.getCurrentProfileId(currentUser.uid);
    if (profileId) await Store.saveLetterHuntProgress(currentUser.uid, profileId, letterIndex, score, stars);
    await renderHeader();
  }

  function resetGame() {
    document.getElementById("result-modal").style.display = "none";
    renderGrid();
  }

  document.getElementById("retry-btn").addEventListener("click", resetGame);
  renderGrid();
}

/* ==========================================================================
   3. TẬP VIẾT CHỮ (canvas tô theo hình mờ)
   ========================================================================== */
async function renderWritingList() {
  app.innerHTML =
    '<span class="section-badge accent2">✏️ Tập viết</span>' +
    '<h1 class="page-title">Bé tập viết chữ ✍️</h1>' +
    '<p class="page-subtitle">Chọn 1 chữ cái để tô theo hình mờ nhé!</p>' +
    '<div class="writing-select-grid" id="writing-grid"></div>';

  const grid = document.getElementById("writing-grid");
  const profileId = Store.getCurrentProfileId(currentUser.uid);
  const summary = profileId ? await Store.computeSummary(currentUser.uid, profileId) : null;

  content.alphabet.forEach((item, idx) => {
    const a = document.createElement("a");
    a.className = "writing-select-card";
    a.href = "#/writing/" + idx;
    let starsText = "";
    if (summary && summary.writing.letters[idx]) {
      starsText = "⭐".repeat(summary.writing.letters[idx].stars);
    }
    a.innerHTML = '<span class="letter">' + item.letter + '</span><span class="stars">' + starsText + '</span>';
    grid.appendChild(a);
  });
}

async function renderWritingPractice(idxParam) {
  const letterIndex = parseInt(idxParam, 10);
  if (isNaN(letterIndex) || letterIndex < 0 || letterIndex >= content.alphabet.length) return renderNotFound();
  if (!requireProfile()) return;

  const letter = content.alphabet[letterIndex];
  const total = content.alphabet.length;
  const prevLink = letterIndex > 0 ? '<a class="btn" href="#/writing/' + (letterIndex - 1) + '">⬅️ Chữ trước</a>' : "<span></span>";
  const nextLink = letterIndex < total - 1 ? '<a class="btn" href="#/writing/' + (letterIndex + 1) + '">Chữ tiếp ➡️</a>' : "";
  const nextModalLink = letterIndex < total - 1
    ? '<a class="btn btn-green" href="#/writing/' + (letterIndex + 1) + '">➡️ Chữ tiếp theo</a>'
    : "";

  app.innerHTML =
    '<span class="section-badge accent2">✏️ Tập viết</span>' +
    '<h1 class="page-title">✍️ Tập viết chữ "' + letter.letter + '"</h1>' +
    '<p class="page-subtitle">Dùng ngón tay hoặc chuột tô đầy vào hình chữ mờ bên dưới nhé!</p>' +
    '<div class="game-header">' +
    '  <div class="game-stat">🔤 Chữ ' + (letterIndex + 1) + ' / ' + total + '</div>' +
    '  <div class="game-stat" id="letter-stars-stat">⭐ Chưa tập</div>' +
    '  <a class="btn btn-outline" href="#/writing">⬅️ Danh sách chữ</a>' +
    '</div>' +
    '<div class="writing-canvas-wrap">' +
    '  <div class="writing-canvas-stack emoji-pop" id="canvas-stack">' +
    '    <canvas id="guide-canvas"></canvas>' +
    '    <canvas id="ink-canvas"></canvas>' +
    '  </div>' +
    '  <div class="writing-toolbar">' +
    '    <button class="btn btn-blue" id="speak-btn">🔊 Nghe</button>' +
    '    <button class="btn btn-outline" id="clear-btn">🧹 Xóa</button>' +
    '    <button class="btn btn-primary" id="check-btn">✅ Kiểm tra</button>' +
    '  </div>' +
    '  <div class="writing-nav">' + prevLink + nextLink + '</div>' +
    '</div>' +
    '<div id="result-modal" class="modal-overlay" style="display:none;">' +
    '  <div class="modal-box">' +
    '    <div class="big-emoji" id="modal-emoji">🌟</div>' +
    '    <h2 id="modal-title">Giỏi quá!</h2>' +
    '    <div class="stars-earned" id="stars-earned"></div>' +
    '    <div class="score-text" id="score-text"></div>' +
    '    <div class="modal-actions">' +
    '      <button class="btn btn-primary" id="retry-btn">🔄 Tô lại</button>' +
    nextModalLink +
    '      <a class="btn btn-outline" href="#/writing">🔤 Danh sách chữ</a>' +
    '    </div>' +
    '  </div>' +
    '</div>';

  const INK_COLOR = "#d9642e";
  const DISPLAY_SIZE = Math.min(320, window.innerWidth - 64);
  let guideCtx, inkCtx, dpr, hasInk = false, drawing = false;

  function setupCanvas(canvas) {
    dpr = window.devicePixelRatio || 1;
    canvas.width = DISPLAY_SIZE * dpr;
    canvas.height = DISPLAY_SIZE * dpr;
    canvas.style.width = DISPLAY_SIZE + "px";
    canvas.style.height = DISPLAY_SIZE + "px";
    const c = canvas.getContext("2d");
    c.scale(dpr, dpr);
    return c;
  }

  function drawGuide() {
    guideCtx.clearRect(0, 0, DISPLAY_SIZE, DISPLAY_SIZE);
    guideCtx.fillStyle = "rgba(242, 136, 75, 0.32)";
    guideCtx.font = "700 " + Math.floor(DISPLAY_SIZE * 0.7) + "px 'Baloo 2', sans-serif";
    guideCtx.textAlign = "center";
    guideCtx.textBaseline = "middle";
    guideCtx.fillText(letter.letter, DISPLAY_SIZE / 2, DISPLAY_SIZE / 2 + DISPLAY_SIZE * 0.05);
  }

  function clearInk() {
    inkCtx.clearRect(0, 0, DISPLAY_SIZE, DISPLAY_SIZE);
    hasInk = false;
  }

  function pointerPos(e) {
    const rect = document.getElementById("ink-canvas").getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function startDraw(e) {
    drawing = true;
    hasInk = true;
    const p = pointerPos(e);
    inkCtx.beginPath();
    inkCtx.moveTo(p.x, p.y);
    e.target.setPointerCapture(e.pointerId);
    e.preventDefault();
  }

  function moveDraw(e) {
    if (!drawing) return;
    const p = pointerPos(e);
    inkCtx.lineTo(p.x, p.y);
    inkCtx.stroke();
    e.preventDefault();
  }

  function endDraw() {
    drawing = false;
  }

  function computeCoverage() {
    const guideData = guideCtx.getImageData(0, 0, DISPLAY_SIZE * dpr, DISPLAY_SIZE * dpr).data;
    const inkData = inkCtx.getImageData(0, 0, DISPLAY_SIZE * dpr, DISPLAY_SIZE * dpr).data;
    let guideCount = 0, overlapCount = 0;
    for (let i = 3; i < guideData.length; i += 4) {
      if (guideData[i] > 20) {
        guideCount++;
        if (inkData[i] > 20) overlapCount++;
      }
    }
    return guideCount === 0 ? 0 : overlapCount / guideCount;
  }

  function starsForRatio(ratio) {
    if (ratio >= 0.35) return 3;
    if (ratio >= 0.18) return 2;
    if (ratio >= 0.05) return 1;
    return 0;
  }

  async function checkWriting() {
    if (!hasInk) {
      alert("Bé hãy tô vào bên trong hình chữ mờ trước đã nhé! 🖍️");
      return;
    }
    const ratio = computeCoverage();
    const stars = starsForRatio(ratio);
    const score = Math.round(ratio * 100);

    const messages = {
      0: ["🖍️", "Bé thử tô lại nhé!", "Tô đầy vào bên trong hình chữ mờ mờ đó."],
      1: ["🙂", "Cố lên nhé!", "Bé tô được một phần rồi, cố thêm chút nữa!"],
      2: ["😊", "Giỏi lắm!", "Bé tô khá đầy đủ rồi đó!"],
      3: ["🌟", "Tuyệt vời!", "Bé đã tô rất đẹp và đầy đủ!"],
    };
    const m = messages[stars];
    document.getElementById("modal-emoji").textContent = m[0];
    document.getElementById("modal-title").textContent = m[1];
    document.getElementById("stars-earned").textContent = "⭐".repeat(stars) + "☆".repeat(3 - stars);
    document.getElementById("score-text").textContent = m[2] + " (" + score + "%)";
    document.getElementById("result-modal").style.display = "flex";

    if (stars >= 2) { VietKidSound.playCheer(); VietKidSound.confettiBurst(); }
    else if (stars === 1) VietKidSound.playClick();
    else VietKidSound.playWrong();

    const profileId = Store.getCurrentProfileId(currentUser.uid);
    if (profileId) {
      await Store.saveWritingProgress(currentUser.uid, profileId, letterIndex, score, stars);
      await updateStarsStat();
      await renderHeader();
    }
  }

  async function updateStarsStat() {
    const profileId = Store.getCurrentProfileId(currentUser.uid);
    const statEl = document.getElementById("letter-stars-stat");
    if (!profileId) { statEl.textContent = "⭐ Chưa tập"; return; }
    const summary = await Store.computeSummary(currentUser.uid, profileId);
    const info = summary.writing.letters[letterIndex];
    statEl.textContent = info ? "⭐ " + info.stars + "/3 sao" : "⭐ Chưa tập";
  }

  guideCtx = setupCanvas(document.getElementById("guide-canvas"));
  inkCtx = setupCanvas(document.getElementById("ink-canvas"));
  inkCtx.strokeStyle = INK_COLOR;
  inkCtx.lineWidth = Math.max(12, DISPLAY_SIZE * 0.05);
  inkCtx.lineCap = "round";
  inkCtx.lineJoin = "round";
  drawGuide();

  const inkCanvas = document.getElementById("ink-canvas");
  inkCanvas.addEventListener("pointerdown", startDraw);
  inkCanvas.addEventListener("pointermove", moveDraw);
  inkCanvas.addEventListener("pointerup", endDraw);
  inkCanvas.addEventListener("pointercancel", endDraw);
  inkCanvas.addEventListener("pointerleave", endDraw);

  document.getElementById("speak-btn").addEventListener("click", () => VietKidSpeech.speakVi(letter.word));
  document.getElementById("clear-btn").addEventListener("click", clearInk);
  document.getElementById("check-btn").addEventListener("click", checkWriting);
  document.getElementById("retry-btn").addEventListener("click", () => {
    document.getElementById("result-modal").style.display = "none";
    clearInk();
  });

  await updateStarsStat();
}

/* ==========================================================================
   4. CHỦ ĐỀ TỪ VỰNG + FLASHCARD
   ========================================================================== */
async function renderTopics() {
  app.innerHTML =
    '<span class="section-badge">📚 Từ vựng</span>' +
    '<h1 class="page-title">Chọn chủ đề từ vựng 📚</h1>' +
    '<p class="page-subtitle">Mỗi chủ đề có từ mới, thẻ ghi nhớ và trò chơi vui nhộn!</p>' +
    '<div class="topic-grid" id="topic-grid"></div>';

  const grid = document.getElementById("topic-grid");
  const profileId = Store.getCurrentProfileId(currentUser.uid);
  const summary = profileId ? await Store.computeSummary(currentUser.uid, profileId) : null;

  content.vocabulary.forEach((t) => {
    const a = document.createElement("a");
    a.className = "topic-card";
    a.href = "#/topics/" + t.id;
    a.style.background = t.color;
    let masteredTag = "";
    if (summary) {
      const info = summary.topics[t.id];
      if (info.mastered) masteredTag = "✅ Đã giỏi!";
      else if (info.stars > 0) masteredTag = "⭐ " + info.stars + "/" + info.max_stars;
    }
    a.innerHTML =
      '<span class="icon">' + t.icon + '</span>' +
      '<div class="name">' + t.name + '</div>' +
      '<div class="name-ja">' + t.name_ja + '</div>' +
      '<div class="mastered-tag">' + masteredTag + '</div>';
    grid.appendChild(a);
  });
}

function renderVocabulary(topicId) {
  const topic = content.vocabByID[topicId];
  if (!topic) return renderNotFound();

  app.innerHTML =
    '<h1 class="page-title">' + topic.icon + ' ' + topic.name + ' <span style="color:var(--text-soft); font-size:1.1rem;">(' + topic.name_ja + ')</span></h1>' +
    '<p class="page-subtitle">Chạm vào thẻ để xem nghĩa tiếng Nhật, rồi bấm loa để nghe cách đọc!</p>' +
    '<div class="flashcard-wrap">' +
    '  <div class="flashcard-dots" id="dots"></div>' +
    '  <div class="flashcard" id="flashcard">' +
    '    <div class="flashcard-inner">' +
    '      <div class="flashcard-face flashcard-front"><div class="emoji" id="card-emoji"></div><div class="vi" id="card-vi"></div></div>' +
    '      <div class="flashcard-face flashcard-back"><div class="ja" id="card-ja"></div><div class="hint">Chạm lại để quay về</div></div>' +
    '    </div>' +
    '  </div>' +
    '  <div class="sound-buttons">' +
    '    <button class="btn btn-blue" id="speak-vi">🔊 Tiếng Việt</button>' +
    '    <button class="btn btn-outline" id="speak-ja">🔊 日本語</button>' +
    '  </div>' +
    '  <div class="flashcard-nav">' +
    '    <button class="btn" id="prev-btn">⬅️ Trước</button>' +
    '    <button class="btn" id="next-btn">Tiếp ➡️</button>' +
    '  </div>' +
    '</div>' +
    '<div class="game-launch-row">' +
    '  <a class="btn btn-primary btn-lg" href="#/games/' + topic.id + '/matching">🧩 Trò chơi nối cặp</a>' +
    '  <a class="btn btn-green btn-lg" href="#/games/' + topic.id + '/quiz">❓ Đố vui</a>' +
    '  <a class="btn" style="background:var(--accent2); color:#fff;" href="#/games/' + topic.id + '/spelling">🔡 Ghép chữ</a>' +
    '  <a class="btn" style="background:var(--blue); color:#fff;" href="#/games/' + topic.id + '/listening">👂 Nghe và đoán</a>' +
    '</div>';

  const words = topic.words;
  let index = 0;

  function renderDots() {
    document.getElementById("dots").innerHTML = words.map((_, i) => '<span class="' + (i === index ? "active" : "") + '"></span>').join("");
  }
  function renderCard() {
    const card = document.getElementById("flashcard");
    card.classList.remove("flipped");
    const w = words[index];
    document.getElementById("card-emoji").textContent = w.emoji;
    document.getElementById("card-vi").textContent = w.vi;
    document.getElementById("card-ja").textContent = w.ja;
    popEmoji(document.getElementById("card-emoji"));
    renderDots();
  }

  document.getElementById("flashcard").addEventListener("click", () => {
    document.getElementById("flashcard").classList.toggle("flipped");
    VietKidSound.playClick();
  });
  document.getElementById("prev-btn").addEventListener("click", () => { index = (index - 1 + words.length) % words.length; renderCard(); });
  document.getElementById("next-btn").addEventListener("click", () => { index = (index + 1) % words.length; renderCard(); });
  document.getElementById("speak-vi").addEventListener("click", () => VietKidSpeech.speakVi(words[index].vi));
  document.getElementById("speak-ja").addEventListener("click", () => VietKidSpeech.speakJa(words[index].ja));

  renderCard();
}

/* ==========================================================================
   5. TRÒ CHƠI (nối cặp / đố vui / ghép chữ)
   ========================================================================== */
function renderGame(topicId, gameType) {
  const topic = content.vocabByID[topicId];
  if (!topic || Store.GAME_TYPES.indexOf(gameType) === -1) return renderNotFound();
  if (!requireProfile()) return;

  if (gameType === "matching") return renderMatchingGame(topic);
  if (gameType === "quiz") return renderQuizGame(topic);
  if (gameType === "spelling") return renderSpellingGame(topic);
  if (gameType === "listening") return renderListeningGame(topic);
}

function gameShell(topic, titleIcon, titleText, subtitle, bodyHtml, modalIcon, modalTitle) {
  app.innerHTML =
    '<h1 class="page-title">' + titleIcon + ' ' + titleText + ': ' + topic.name + '</h1>' +
    '<p class="page-subtitle">' + subtitle + '</p>' +
    '<div class="game-header">' +
    '  <div id="game-stats"></div>' +
    '  <a class="btn btn-outline" href="#/topics/' + topic.id + '">⬅️ Quay lại</a>' +
    '</div>' +
    bodyHtml +
    '<div id="result-modal" class="modal-overlay" style="display:none;">' +
    '  <div class="modal-box">' +
    '    <div class="big-emoji" id="modal-emoji">' + modalIcon + '</div>' +
    '    <h2 id="modal-title">' + modalTitle + '</h2>' +
    '    <div class="stars-earned" id="stars-earned"></div>' +
    '    <div class="score-text" id="score-text"></div>' +
    '    <div class="modal-actions">' +
    '      <button class="btn btn-primary" id="retry-btn">🔄 Chơi lại</button>' +
    '      <a class="btn btn-outline" href="#/topics/' + topic.id + '">📚 Về chủ đề</a>' +
    '    </div>' +
    '  </div>' +
    '</div>';
}

/* ---- Nối cặp (matching) ---- */
function renderMatchingGame(topic) {
  gameShell(
    topic, "🧩", "Nối cặp", "Lật 2 thẻ giống nhau (từ và hình) để ghép cặp nhé!",
    '<div class="exercise-panel" style="max-width:680px;"><div id="grid" class="matching-grid"></div></div>',
    "🎉", "Giỏi quá!"
  );

  const allWords = topic.words;
  const PAIR_COUNT = Math.min(6, allWords.length);
  let moves = 0, matchesFound = 0, lockBoard = false, firstCard = null;

  function updateStats() {
    document.getElementById("game-stats").innerHTML =
      '<div class="game-stat">🔁 Lượt lật: ' + moves + '</div>' +
      '<div class="game-stat" style="margin-left:8px;">✅ Cặp đúng: ' + matchesFound + ' / ' + PAIR_COUNT + '</div>';
  }

  function buildDeck() {
    const chosen = shuffle(allWords).slice(0, PAIR_COUNT);
    const cards = [];
    chosen.forEach((w, i) => {
      cards.push({ pairId: i, display: w.emoji });
      cards.push({ pairId: i, display: w.vi });
    });
    return shuffle(cards);
  }

  function renderGrid() {
    const grid = document.getElementById("grid");
    grid.innerHTML = "";
    const deck = buildDeck();
    deck.forEach((cardData) => {
      const el = document.createElement("div");
      el.className = "match-card";
      el.dataset.pairId = cardData.pairId;
      el.innerHTML = '<span class="back-icon">❓</span><span class="content">' + cardData.display + '</span>';
      el.addEventListener("click", () => onCardClick(el));
      grid.appendChild(el);
    });
  }

  function onCardClick(el) {
    if (lockBoard || el.classList.contains("revealed") || el.classList.contains("matched")) return;
    el.classList.add("revealed");
    VietKidSound.playClick();
    if (!firstCard) { firstCard = el; return; }

    moves++;
    updateStats();

    if (firstCard.dataset.pairId === el.dataset.pairId && firstCard !== el) {
      firstCard.classList.add("matched");
      el.classList.add("matched");
      matchesFound++;
      updateStats();
      firstCard = null;
      VietKidSound.playCorrect();
      if (matchesFound === PAIR_COUNT) setTimeout(finishGame, 500);
    } else {
      lockBoard = true;
      VietKidSound.playWrong();
      const wrongFirst = firstCard, wrongSecond = el;
      wrongFirst.classList.add("wrong");
      wrongSecond.classList.add("wrong");
      setTimeout(() => {
        wrongFirst.classList.remove("revealed", "wrong");
        wrongSecond.classList.remove("revealed", "wrong");
        firstCard = null;
        lockBoard = false;
      }, 800);
    }
  }

  async function finishGame() {
    const minMoves = PAIR_COUNT;
    let stars;
    if (moves <= minMoves * 1.4) stars = 3;
    else if (moves <= minMoves * 2.2) stars = 2;
    else stars = 1;

    const msg = pickResultMessage(stars);
    document.getElementById("modal-emoji").textContent = msg.emoji;
    document.getElementById("modal-title").textContent = msg.title;
    document.getElementById("stars-earned").textContent = "⭐".repeat(stars) + "☆".repeat(3 - stars);
    document.getElementById("score-text").textContent = "Hoàn thành với " + moves + " lượt lật!";
    document.getElementById("result-modal").style.display = "flex";
    VietKidSound.playCheer();
    VietKidSound.confettiBurst();

    const profileId = Store.getCurrentProfileId(currentUser.uid);
    if (profileId) await Store.saveProgress(currentUser.uid, profileId, topic.id, "matching", moves, stars);
    await renderHeader();
  }

  function resetGame() {
    moves = 0; matchesFound = 0; firstCard = null; lockBoard = false;
    document.getElementById("result-modal").style.display = "none";
    updateStats();
    renderGrid();
  }

  document.getElementById("retry-btn").addEventListener("click", resetGame);
  updateStats();
  renderGrid();
}

/* ---- Đố vui (quiz) ---- */
function renderQuizGame(topic) {
  gameShell(
    topic, "❓", "Đố vui", "Xem hình và nghĩa tiếng Nhật, chọn từ tiếng Việt đúng nhé!",
    '<div class="quiz-prompt">' +
    '  <div class="emoji-big" id="prompt-emoji"></div>' +
    '  <div class="ja-text" id="prompt-ja"></div>' +
    '  <button class="btn btn-blue" id="hint-btn" style="margin-top:14px;">🔊 Nghe gợi ý</button>' +
    '</div>' +
    '<div class="quiz-options" id="options"></div>',
    "👑", "Xong rồi!"
  );

  const allWords = topic.words;
  let order = [], qIndex = 0, correctCount = 0, answered = false;

  function updateStats() {
    document.getElementById("game-stats").innerHTML =
      '<div class="game-stat">📋 Câu: ' + (qIndex + 1) + ' / ' + order.length + '</div>' +
      '<div class="game-stat" style="margin-left:8px;">✅ Đúng: ' + correctCount + '</div>';
  }

  function buildOptions(correctWord) {
    const distractors = shuffle(allWords.filter((w) => w.vi !== correctWord.vi)).slice(0, 3);
    return shuffle([correctWord].concat(distractors));
  }

  function renderQuestion() {
    answered = false;
    const word = order[qIndex];
    updateStats();
    document.getElementById("prompt-emoji").textContent = word.emoji;
    document.getElementById("prompt-ja").textContent = word.ja;
    popEmoji(document.getElementById("prompt-emoji"));

    const optionsEl = document.getElementById("options");
    optionsEl.innerHTML = "";
    buildOptions(word).forEach((opt) => {
      const btn = document.createElement("button");
      btn.className = "quiz-option";
      btn.textContent = opt.vi;
      btn.addEventListener("click", () => onAnswer(btn, opt, word));
      optionsEl.appendChild(btn);
    });
  }

  function onAnswer(btn, opt, correctWord) {
    if (answered) return;
    answered = true;
    const isCorrect = opt.vi === correctWord.vi;
    btn.classList.add(isCorrect ? "correct" : "incorrect");
    if (isCorrect) {
      correctCount++;
      updateStats();
      VietKidSound.playCorrect();
    } else {
      VietKidSound.playWrong();
      [...document.getElementById("options").children].forEach((c) => {
        if (c.textContent === correctWord.vi) c.classList.add("correct");
      });
    }
    VietKidSpeech.speakVi(correctWord.vi);

    setTimeout(() => {
      qIndex++;
      if (qIndex < order.length) renderQuestion();
      else finishGame();
    }, 1300);
  }

  async function finishGame() {
    const pct = correctCount / order.length;
    let stars;
    if (pct >= 0.9) stars = 3;
    else if (pct >= 0.6) stars = 2;
    else stars = 1;

    const msg = pickResultMessage(stars);
    document.getElementById("modal-emoji").textContent = msg.emoji;
    document.getElementById("modal-title").textContent = msg.title;
    document.getElementById("stars-earned").textContent = "⭐".repeat(stars) + "☆".repeat(3 - stars);
    document.getElementById("score-text").textContent = "Đúng " + correctCount + "/" + order.length + " câu!";
    document.getElementById("result-modal").style.display = "flex";
    VietKidSound.playCheer();
    VietKidSound.confettiBurst();

    const profileId = Store.getCurrentProfileId(currentUser.uid);
    if (profileId) await Store.saveProgress(currentUser.uid, profileId, topic.id, "quiz", correctCount, stars);
    await renderHeader();
  }

  function startGame() {
    order = shuffle(allWords);
    qIndex = 0; correctCount = 0;
    document.getElementById("result-modal").style.display = "none";
    renderQuestion();
  }

  document.getElementById("hint-btn").addEventListener("click", () => VietKidSpeech.speakVi(order[qIndex].vi));
  document.getElementById("retry-btn").addEventListener("click", startGame);
  startGame();
}

/* ---- Ghép chữ (spelling) ---- */
function renderSpellingGame(topic) {
  gameShell(
    topic, "🔡", "Ghép chữ", "Xem hình rồi bấm các chữ cái theo đúng thứ tự để ghép thành từ!",
    '<div class="spelling-target">' +
    '  <div class="emoji-big" id="prompt-emoji"></div>' +
    '  <div class="ja-text" id="prompt-ja"></div>' +
    '  <button class="btn btn-blue" id="hint-btn" style="margin-top:10px;">🔊 Nghe từ</button>' +
    '</div>' +
    '<div class="spelling-slots" id="slots"></div>' +
    '<div class="spelling-letters" id="letters"></div>' +
    '<div style="text-align:center;"><button class="btn btn-outline" id="clear-btn">🧹 Xóa hết</button></div>',
    "💖", "Bé giỏi quá!"
  );

  const allWords = topic.words.filter((w) => w.vi.indexOf(" ") === -1);
  let order = [], qIndex = 0, mistakesTotal = 0, currentAttemptWrong = false, correctCount = 0;
  let targetChars = [], filled = [], letterState = [];

  if (allWords.length === 0) {
    app.querySelector(".spelling-target").insertAdjacentHTML(
      "afterend",
      '<p class="page-subtitle">Chủ đề này chưa có từ phù hợp cho trò chơi ghép chữ.</p>'
    );
    document.getElementById("slots").style.display = "none";
    document.getElementById("letters").style.display = "none";
    document.getElementById("hint-btn").style.display = "none";
    document.getElementById("clear-btn").style.display = "none";
    return;
  }

  function updateStats() {
    document.getElementById("game-stats").innerHTML =
      '<div class="game-stat">📋 Từ: ' + (qIndex + 1) + ' / ' + order.length + '</div>' +
      '<div class="game-stat" style="margin-left:8px;">✅ Đúng ngay: ' + correctCount + '</div>';
  }

  function renderQuestion() {
    const word = order[qIndex];
    updateStats();
    document.getElementById("prompt-emoji").textContent = word.emoji;
    document.getElementById("prompt-ja").textContent = word.ja;
    popEmoji(document.getElementById("prompt-emoji"));
    currentAttemptWrong = false;

    targetChars = [...word.vi.normalize("NFC")];
    filled = new Array(targetChars.length).fill(null);
    letterState = shuffle(targetChars.map((ch, i) => ({ ch, id: i }))).map((item) => Object.assign({ used: false }, item));

    renderSlots();
    renderLetters();
  }

  function renderSlots() {
    document.getElementById("slots").innerHTML = filled.map((ch) => '<div class="spelling-slot">' + (ch || "") + '</div>').join("");
  }

  function renderLetters() {
    const lettersEl = document.getElementById("letters");
    lettersEl.innerHTML = "";
    letterState.forEach((item, idx) => {
      const btn = document.createElement("button");
      btn.className = "letter-btn" + (item.used ? " used" : "");
      btn.textContent = item.ch;
      btn.addEventListener("click", () => onLetterClick(idx));
      lettersEl.appendChild(btn);
    });
  }

  function onLetterClick(idx) {
    const item = letterState[idx];
    if (item.used) return;
    const nextEmpty = filled.findIndex((c) => c === null);
    if (nextEmpty === -1) return;

    item.used = true;
    filled[nextEmpty] = item.ch;
    VietKidSound.playClick();
    renderSlots();
    renderLetters();

    if (filled.every((c) => c !== null)) checkAnswer();
  }

  function checkAnswer() {
    const assembled = filled.join("");
    const target = targetChars.join("");
    if (assembled === target) {
      VietKidSound.playCorrect();
      if (!currentAttemptWrong) { correctCount++; updateStats(); }
      setTimeout(nextQuestion, 900);
    } else {
      currentAttemptWrong = true;
      mistakesTotal++;
      VietKidSound.playWrong();
      document.querySelectorAll(".spelling-slot").forEach((s) => s.classList.add("wrong"));
      setTimeout(() => {
        filled = new Array(targetChars.length).fill(null);
        letterState.forEach((item) => (item.used = false));
        renderSlots();
        renderLetters();
      }, 700);
    }
  }

  function clearSlots() {
    filled = new Array(targetChars.length).fill(null);
    letterState.forEach((item) => (item.used = false));
    renderSlots();
    renderLetters();
  }

  function nextQuestion() {
    qIndex++;
    if (qIndex < order.length) renderQuestion();
    else finishGame();
  }

  async function finishGame() {
    let stars;
    if (mistakesTotal === 0) stars = 3;
    else if (mistakesTotal <= order.length) stars = 2;
    else stars = 1;

    const msg = pickResultMessage(stars);
    document.getElementById("modal-emoji").textContent = msg.emoji;
    document.getElementById("modal-title").textContent = msg.title;
    document.getElementById("stars-earned").textContent = "⭐".repeat(stars) + "☆".repeat(3 - stars);
    document.getElementById("score-text").textContent = "Ghép đúng ngay " + correctCount + "/" + order.length + " từ!";
    document.getElementById("result-modal").style.display = "flex";
    VietKidSound.playCheer();
    VietKidSound.confettiBurst();

    const profileId = Store.getCurrentProfileId(currentUser.uid);
    if (profileId) await Store.saveProgress(currentUser.uid, profileId, topic.id, "spelling", correctCount, stars);
    await renderHeader();
  }

  function startGame() {
    order = shuffle(allWords);
    qIndex = 0; mistakesTotal = 0; correctCount = 0;
    document.getElementById("result-modal").style.display = "none";
    renderQuestion();
  }

  document.getElementById("hint-btn").addEventListener("click", () => VietKidSpeech.speakVi(order[qIndex].vi));
  document.getElementById("clear-btn").addEventListener("click", clearSlots);
  document.getElementById("retry-btn").addEventListener("click", startGame);
  startGame();
}

/* ---- Nghe và đoán (listening) ---- */
function renderListeningGame(topic) {
  gameShell(
    topic, "👂", "Nghe và đoán", "Bấm loa để nghe từ tiếng Việt, rồi chọn đúng hình nhé!",
    '<div class="listening-prompt">' +
    '  <button class="btn btn-blue btn-lg" id="play-btn">🔊 Nghe từ</button>' +
    '</div>' +
    '<div class="quiz-options" id="options"></div>',
    "🎧", "Tai bé thính quá!"
  );

  const allWords = topic.words;
  let order = [], qIndex = 0, correctCount = 0, answered = false;

  function updateStats() {
    document.getElementById("game-stats").innerHTML =
      '<div class="game-stat">📋 Câu: ' + (qIndex + 1) + ' / ' + order.length + '</div>' +
      '<div class="game-stat" style="margin-left:8px;">✅ Đúng: ' + correctCount + '</div>';
  }

  function buildOptions(correctWord) {
    const distractors = shuffle(allWords.filter((w) => w.vi !== correctWord.vi)).slice(0, 3);
    return shuffle([correctWord].concat(distractors));
  }

  function renderQuestion() {
    answered = false;
    const word = order[qIndex];
    updateStats();

    const optionsEl = document.getElementById("options");
    optionsEl.innerHTML = "";
    buildOptions(word).forEach((opt) => {
      const btn = document.createElement("button");
      btn.className = "quiz-option emoji-option";
      btn.textContent = opt.emoji;
      btn.setAttribute("aria-label", opt.vi);
      btn.addEventListener("click", () => onAnswer(btn, opt, word));
      optionsEl.appendChild(btn);
    });

    VietKidSpeech.speakVi(word.vi);
  }

  function onAnswer(btn, opt, correctWord) {
    if (answered) return;
    answered = true;
    const isCorrect = opt.vi === correctWord.vi;
    btn.classList.add(isCorrect ? "correct" : "incorrect");
    if (isCorrect) {
      correctCount++;
      updateStats();
      VietKidSound.playCorrect();
    } else {
      VietKidSound.playWrong();
      [...document.getElementById("options").children].forEach((c) => {
        if (c.getAttribute("aria-label") === correctWord.vi) c.classList.add("correct");
      });
    }

    setTimeout(() => {
      qIndex++;
      if (qIndex < order.length) renderQuestion();
      else finishGame();
    }, 1300);
  }

  async function finishGame() {
    const pct = correctCount / order.length;
    let stars;
    if (pct >= 0.9) stars = 3;
    else if (pct >= 0.6) stars = 2;
    else stars = 1;

    const msg = pickResultMessage(stars);
    document.getElementById("modal-emoji").textContent = msg.emoji;
    document.getElementById("modal-title").textContent = msg.title;
    document.getElementById("stars-earned").textContent = "⭐".repeat(stars) + "☆".repeat(3 - stars);
    document.getElementById("score-text").textContent = "Nghe đúng " + correctCount + "/" + order.length + " từ!";
    document.getElementById("result-modal").style.display = "flex";
    VietKidSound.playCheer();
    VietKidSound.confettiBurst();

    const profileId = Store.getCurrentProfileId(currentUser.uid);
    if (profileId) await Store.saveProgress(currentUser.uid, profileId, topic.id, "listening", correctCount, stars);
    await renderHeader();
  }

  function startGame() {
    order = shuffle(allWords);
    qIndex = 0; correctCount = 0;
    document.getElementById("result-modal").style.display = "none";
    renderQuestion();
  }

  document.getElementById("play-btn").addEventListener("click", () => VietKidSpeech.speakVi(order[qIndex].vi));
  document.getElementById("retry-btn").addEventListener("click", startGame);
  startGame();
}

/* ==========================================================================
   6. THÀNH TÍCH
   ========================================================================== */
async function renderProgress() {
  const profileId = requireProfile();
  if (!profileId) return;
  const profile = await Store.getProfile(currentUser.uid, profileId);

  const topicsEntries = Object.entries(profile.topics);
  const masteredCount = topicsEntries.filter(([, info]) => info.mastered).length;

  app.innerHTML =
    '<span class="section-badge gold">🏆 Thành tích</span>' +
    '<h1 class="page-title">🏆 Thành tích của bé</h1>' +
    '<p class="page-subtitle">' + profile.avatar + ' ' + escapeHtml(profile.name) + '</p>' +
    '<div class="progress-summary">' +
    '  <div class="progress-stat"><div class="num">' + profile.total_stars + '</div><div class="label">⭐ Tổng số sao</div></div>' +
    '  <div class="progress-stat"><div class="num">' + profile.badges.length + '</div><div class="label">🎖️ Huy hiệu</div></div>' +
    '  <div class="progress-stat"><div class="num">' + masteredCount + '</div><div class="label">✅ Chủ đề đã giỏi</div></div>' +
    '</div>' +
    '<h3>Huy hiệu đã đạt được</h3>' +
    '<div class="badge-row" style="margin-bottom:30px;">' + renderBadgeChips(profile.badges) + '</div>' +
    '<h3>Tiến trình từng chủ đề</h3>' +
    '<div id="topics-list">' +
    topicsEntries.map(([id, info]) => {
      const pct = Math.round((info.stars / info.max_stars) * 100);
      return (
        '<div class="progress-topic">' +
        '  <div class="icon">' + info.icon + '</div>' +
        '  <div class="info">' +
        '    <div class="name">' + info.name + (info.mastered ? " ✅" : "") + '</div>' +
        '    <div class="progress-bar-track"><div class="progress-bar-fill" style="width:' + pct + '%;"></div></div>' +
        '  </div>' +
        '  <div>⭐ ' + info.stars + '/' + info.max_stars + '</div>' +
        '</div>'
      );
    }).join("") +
    '</div>' +
    '<div style="text-align:center; margin-top:20px;"><a class="btn btn-outline" href="#/topics">📚 Học thêm từ vựng</a></div>';
}
