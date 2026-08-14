/* Lưu trữ hồ sơ bé + tiến trình học bằng Firestore (thay cho SQLite).
   Cấu trúc dữ liệu:
     users/{uid}/profiles/{profileId}                        {name, avatar, createdAt}
     users/{uid}/profiles/{profileId}/progress/{topicId_gameType}     {topicId, gameType, score, stars, updatedAt}
     users/{uid}/profiles/{profileId}/writingProgress/{letterIndex}   {letterIndex, score, stars, updatedAt}
   Quyền đọc/ghi chỉ dành cho chính phụ huynh (uid == request.auth.uid) — xem firestore.rules. */
import { db } from "./firebase-init.js";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  writeBatch,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { getContent } from "./data.js";

export const GAME_TYPES = ["matching", "quiz", "spelling"];
export const MAX_STARS_PER_GAME = 3;

const MILESTONE_BADGES = [
  [10, "🌟", "Bé chăm học"],
  [25, "🎀", "Bé siêng năng"],
  [45, "💎", "Bé thông thái"],
  [70, "👑", "Bậc thầy tiếng Việt"],
];

function profilesCol(uid) {
  return collection(db, "users", uid, "profiles");
}
function profileDoc(uid, profileId) {
  return doc(db, "users", uid, "profiles", profileId);
}
function progressCol(uid, profileId) {
  return collection(db, "users", uid, "profiles", profileId, "progress");
}
function writingCol(uid, profileId) {
  return collection(db, "users", uid, "profiles", profileId, "writingProgress");
}

export async function createProfile(uid, name, avatar) {
  name = (name || "").trim();
  if (!name) throw new Error("Vui lòng nhập tên bé");
  if (name.length > 40) throw new Error("Tên quá dài");

  const ref = doc(profilesCol(uid));
  await setDoc(ref, { name, avatar, createdAt: serverTimestamp() });
  return { id: ref.id, name, avatar, total_stars: 0 };
}

export async function listProfiles(uid) {
  const snap = await getDocs(profilesCol(uid));
  const profiles = [];
  for (const d of snap.docs) {
    const summary = await computeSummary(uid, d.id);
    profiles.push({ id: d.id, name: d.data().name, avatar: d.data().avatar, total_stars: summary.total_stars });
  }
  return profiles;
}

export async function getProfile(uid, profileId) {
  const snap = await getDoc(profileDoc(uid, profileId));
  if (!snap.exists()) return null;
  const summary = await computeSummary(uid, profileId);
  return Object.assign({ id: snap.id, name: snap.data().name, avatar: snap.data().avatar }, summary);
}

export async function deleteProfile(uid, profileId) {
  const [progressSnap, writingSnap] = await Promise.all([
    getDocs(progressCol(uid, profileId)),
    getDocs(writingCol(uid, profileId)),
  ]);
  const batch = writeBatch(db);
  progressSnap.forEach((d) => batch.delete(d.ref));
  writingSnap.forEach((d) => batch.delete(d.ref));
  batch.delete(profileDoc(uid, profileId));
  await batch.commit();
}

export async function saveProgress(uid, profileId, topicId, gameType, score, stars) {
  stars = Math.max(0, Math.min(MAX_STARS_PER_GAME, Math.round(stars)));
  score = Math.round(score);
  const ref = doc(progressCol(uid, profileId), topicId + "_" + gameType);
  const existing = await getDoc(ref);
  const bestScore = existing.exists() ? Math.max(existing.data().score, score) : score;
  const bestStars = existing.exists() ? Math.max(existing.data().stars, stars) : stars;
  await setDoc(ref, { topicId, gameType, score: bestScore, stars: bestStars, updatedAt: serverTimestamp() });
  return computeSummary(uid, profileId);
}

export async function saveWritingProgress(uid, profileId, letterIndex, score, stars) {
  stars = Math.max(0, Math.min(MAX_STARS_PER_GAME, Math.round(stars)));
  score = Math.max(0, Math.min(100, Math.round(score)));
  const ref = doc(writingCol(uid, profileId), String(letterIndex));
  const existing = await getDoc(ref);
  const bestScore = existing.exists() ? Math.max(existing.data().score, score) : score;
  const bestStars = existing.exists() ? Math.max(existing.data().stars, stars) : stars;
  await setDoc(ref, { letterIndex, score: bestScore, stars: bestStars, updatedAt: serverTimestamp() });
  return computeSummary(uid, profileId);
}

export async function computeSummary(uid, profileId) {
  const { alphabet, vocabulary } = await getContent();
  const [progressSnap, writingSnap] = await Promise.all([
    getDocs(progressCol(uid, profileId)),
    getDocs(writingCol(uid, profileId)),
  ]);

  const byTopic = {};
  let vocabStars = 0;
  progressSnap.forEach((d) => {
    const r = d.data();
    vocabStars += r.stars;
    byTopic[r.topicId] = byTopic[r.topicId] || {};
    byTopic[r.topicId][r.gameType] = { score: r.score, stars: r.stars };
  });

  const topics = {};
  const badges = [];
  vocabulary.forEach((topic) => {
    const games = byTopic[topic.id] || {};
    const starsSum = Object.keys(games).reduce((s, gt) => s + games[gt].stars, 0);
    const mastered = GAME_TYPES.every((gt) => games[gt] && games[gt].stars >= 2);
    topics[topic.id] = {
      name: topic.name,
      icon: topic.icon,
      games,
      stars: starsSum,
      max_stars: GAME_TYPES.length * MAX_STARS_PER_GAME,
      mastered,
    };
    if (mastered) badges.push({ id: "master_" + topic.id, icon: topic.icon, label: "Chuyên gia " + topic.name });
  });

  const writingLetters = {};
  let writingStars = 0;
  writingSnap.forEach((d) => {
    const r = d.data();
    writingStars += r.stars;
    writingLetters[r.letterIndex] = { score: r.score, stars: r.stars };
  });
  const writingPracticedCount = Object.keys(writingLetters).length;

  const writingMilestones = [
    [5, "✏️", "Bé mới cầm bút"],
    [15, "✍️", "Bé viết chăm chỉ"],
    [alphabet.length, "🖋️", "Chuyên gia viết chữ"],
  ];
  writingMilestones.forEach(([threshold, icon, label]) => {
    if (writingPracticedCount >= threshold) badges.push({ id: "writing_" + threshold, icon, label });
  });

  const totalStars = vocabStars + writingStars;
  MILESTONE_BADGES.forEach(([threshold, icon, label]) => {
    if (totalStars >= threshold) badges.push({ id: "milestone_" + threshold, icon, label });
  });

  return {
    total_stars: totalStars,
    topics,
    writing: {
      letters: writingLetters,
      practiced_count: writingPracticedCount,
      total_letters: alphabet.length,
      stars: writingStars,
      max_stars: alphabet.length * MAX_STARS_PER_GAME,
    },
    badges,
  };
}

/* Hồ sơ đang chọn chỉ là trạng thái điều hướng cục bộ trên thiết bị này,
   không cần đồng bộ qua Firestore — namespaced theo uid để nhiều phụ
   huynh dùng chung máy không bị lẫn hồ sơ của nhau. */
export function getCurrentProfileId(uid) {
  return localStorage.getItem("vietkid_profile_id_" + uid) || null;
}
export function setCurrentProfileId(uid, id) {
  localStorage.setItem("vietkid_profile_id_" + uid, id);
}
export function clearCurrentProfile(uid) {
  localStorage.removeItem("vietkid_profile_id_" + uid);
}
