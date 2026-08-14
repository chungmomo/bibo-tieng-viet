/* Gọi API backend Flask + quản lý hồ sơ bé trong localStorage */
const VietKidAPI = (() => {
  async function request(url, options = {}) {
    const res = await fetch(url, {
      headers: { "Content-Type": "application/json" },
      ...options,
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || `Lỗi ${res.status}`);
    }
    return res.json();
  }

  return {
    getAvatars: () => request("/api/avatars"),
    getProfiles: () => request("/api/profiles"),
    createProfile: (name, avatar) =>
      request("/api/profiles", {
        method: "POST",
        body: JSON.stringify({ name, avatar }),
      }),
    getProfile: (id) => request(`/api/profiles/${id}`),
    deleteProfile: (id) => request(`/api/profiles/${id}`, { method: "DELETE" }),
    getVocabulary: () => request("/api/vocabulary"),
    getTopic: (id) => request(`/api/vocabulary/${id}`),
    getAlphabet: () => request("/api/alphabet"),
    saveProgress: (data) =>
      request("/api/progress", { method: "POST", body: JSON.stringify(data) }),
    getProgress: (profileId) => request(`/api/progress/${profileId}`),
    saveWritingProgress: (data) =>
      request("/api/writing-progress", { method: "POST", body: JSON.stringify(data) }),
  };
})();

const VietKidProfile = (() => {
  const KEY = "vietkid_profile_id";

  return {
    getId: () => {
      const id = localStorage.getItem(KEY);
      return id ? parseInt(id, 10) : null;
    },
    setId: (id) => localStorage.setItem(KEY, String(id)),
    clear: () => localStorage.removeItem(KEY),
  };
})();
