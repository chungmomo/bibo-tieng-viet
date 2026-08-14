/* Logic dùng chung cho mọi trang: hiển thị hồ sơ ở header, bắt buộc chọn hồ sơ */
async function vietkidInitHeader() {
  const slot = document.getElementById("header-profile-slot");
  if (!slot) return;

  const profileId = VietKidProfile.getId();
  if (!profileId) {
    slot.innerHTML = `<a href="/" class="btn btn-outline" style="background:transparent;border-color:#fff;color:#fff;">Chọn hồ sơ bé</a>`;
    return;
  }

  try {
    const profile = await VietKidAPI.getProfile(profileId);
    slot.innerHTML = `
      <a href="/progress" class="header-profile">
        <span class="avatar-badge">${profile.avatar}</span>
        <span>${profile.name} · ⭐ ${profile.total_stars}</span>
      </a>`;
  } catch (e) {
    VietKidProfile.clear();
    slot.innerHTML = `<a href="/" class="btn btn-outline" style="background:transparent;border-color:#fff;color:#fff;">Chọn hồ sơ bé</a>`;
  }
}

/* Phát lại animation "nảy vào" cho 1 emoji khi nội dung của nó đổi
   (VD: sang flashcard khác, câu hỏi mới) mà không cần tải lại trang */
function vietkidPopEmoji(el) {
  if (!el) return;
  el.classList.remove("emoji-pop");
  void el.offsetWidth;
  el.classList.add("emoji-pop");
}

function vietkidRequireProfile() {
  const id = VietKidProfile.getId();
  if (!id) {
    window.location.href = "/?redirect=" + encodeURIComponent(window.location.pathname);
    return null;
  }
  return id;
}

document.addEventListener("DOMContentLoaded", vietkidInitHeader);
