// ========== UTILITIES ==========

// Mode configurations
const MODES = {
  "Locked In": { weight: 100, color: "#4a9e5c" },
  Moving: { weight: 75, color: "#378add" },
  Crawling: { weight: 50, color: "#ba7517" },
  Struggled: { weight: 25, color: "#d85a30" },
  Skipped: { weight: 0, color: "#888780" },
};

// LocalStorage helpers
function getGoals() {
  return JSON.parse(localStorage.getItem("jia_goals") || "[]");
}

function getCheckins() {
  return JSON.parse(localStorage.getItem("jia_checkins") || "{}");
}

function getHistory() {
  return JSON.parse(localStorage.getItem("jia_history") || "{}");
}

function getReflections() {
  return JSON.parse(localStorage.getItem("jia_reflections") || "{}");
}

function getUserProfile() {
  return JSON.parse(localStorage.getItem("jia_userProfile") || "{}");
}

function getChatMessages() {
  return JSON.parse(localStorage.getItem("jia_chat_messages") || "[]");
}

// Date functions
async function getRealTodayString() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

async function getTodayString() {
  return await getRealTodayString();
}

// Progress color helper
function getProgressColor(progress) {
  if (progress >= 70) return "#4a9e5c";
  if (progress >= 40) return "#378add";
  if (progress >= 20) return "#ba7517";
  return "#d85a30";
}
