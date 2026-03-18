// ========== PROFILE MANAGEMENT ==========

function loadUserProfile() {
  const profile = getUserProfile();
  const identityEl = document.getElementById("userIdentity");
  const challengesEl = document.getElementById("userChallenges");
  const supportEl = document.getElementById("userSupport");
  const contextEl = document.getElementById("userContext");

  if (identityEl) identityEl.value = profile.identity || "";
  if (challengesEl) challengesEl.value = profile.challenges || "";
  if (supportEl) supportEl.value = profile.support || "";
  if (contextEl) contextEl.value = profile.context || "";
}

function saveUserProfile() {
  const profile = {
    identity: document.getElementById("userIdentity")?.value.trim() || "",
    challenges: document.getElementById("userChallenges")?.value.trim() || "",
    support: document.getElementById("userSupport")?.value.trim() || "",
    context: document.getElementById("userContext")?.value.trim() || "",
    lastUpdated: new Date().toISOString(),
  };

  localStorage.setItem("jia_userProfile", JSON.stringify(profile));

  const msg = document.getElementById("profileSaveMessage");
  if (msg) {
    msg.classList.remove("hidden");
    setTimeout(() => msg.classList.add("hidden"), 2000);
  }
}

function getUserProfileForAI() {
  const profile = getUserProfile();
  const parts = [];

  if (profile.identity) parts.push(`👤 About me: ${profile.identity}`);
  if (profile.challenges) parts.push(`⚠️ My challenges: ${profile.challenges}`);
  if (profile.support) parts.push(`🤝 Support I need: ${profile.support}`);
  if (profile.context) parts.push(`📝 Extra context: ${profile.context}`);

  return parts.length > 0 ? parts.join("\n") : "No user profile set yet.";
}

function renderReflectTab() {
  const reflections = getReflections();
  document.getElementById("reflect1").value = reflections.q1 || "";
  document.getElementById("reflect2").value = reflections.q2 || "";
  document.getElementById("reflect3").value = reflections.q3 || "";
}
