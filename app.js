// app.js – JIA (just f'in do it already)
// DeepSeek API Configuration - replace with env variable for Vercel
const DEEPSEEK_API_URL = "https://api.groq.com/openai/v1/chat/completions";

// Mode configurations
const MODES = {
  "Locked In": { weight: 100, color: "#4a9e5c" },
  Moving: { weight: 60, color: "#378add" },
  Crawling: { weight: 30, color: "#ba7517" },
  Struggled: { weight: 10, color: "#d85a30" },
  Skipped: { weight: 0, color: "#888780" },
};

document.addEventListener("DOMContentLoaded", () => {
  initializeEmptyData();
  initializeUI();
  setupEventListeners();
  renderCheckinTab();
});

function initializeEmptyData() {
  if (!localStorage.getItem("jia_goals")) {
    localStorage.setItem("jia_goals", JSON.stringify([]));
    localStorage.setItem("jia_checkins", JSON.stringify({}));
    localStorage.setItem("jia_history", JSON.stringify({}));
    localStorage.setItem("jia_reflections", JSON.stringify({}));
    localStorage.setItem("jia_userProfile", JSON.stringify({}));
  }
}

function initializeUI() {
  updateDateDisplay();
  setupHeatmapLegend();
  initializeChat();
}

async function updateDateDisplay() {
  const realDate = await getRealTodayString();
  const dateObj = new Date(realDate);
  const dateStr = dateObj.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  document.getElementById("todayDate").textContent = dateStr;
}

function setupEventListeners() {
  // tab switching
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const tab = e.target.dataset.tab;
      switchTab(tab);
    });
  });

  // FAB open modal
  document.getElementById("fabAddGoal").addEventListener("click", () => {
    const goals = getGoals();
    if (goals.length >= 5) {
      alert("You already have 5 goals. Delete one to add a new one.");
      return;
    }
    openGoalModal();
  });

  // modal close
  document
    .getElementById("closeModalBtn")
    .addEventListener("click", closeGoalModal);
  document.getElementById("goalModal").addEventListener("click", (e) => {
    if (e.target.classList.contains("modal-overlay")) closeGoalModal();
  });

  // create goal
  document
    .getElementById("createGoalBtn")
    .addEventListener("click", createNewGoal);

  // importance selector inside modal
  document.querySelectorAll(".importance-option").forEach((opt) => {
    opt.addEventListener("click", (e) => {
      document
        .querySelectorAll(".importance-option")
        .forEach((o) => o.classList.remove("selected"));
      e.target.classList.add("selected");
    });
  });

  // reflect + chat
  document
    .getElementById("getAiFeedback")
    .addEventListener("click", getReflectionFeedback);
  document
    .getElementById("chatSend")
    .addEventListener("click", sendChatMessage);
  document.getElementById("chatInput").addEventListener("keypress", (e) => {
    if (e.key === "Enter") sendChatMessage();
  });
  document.querySelectorAll(".quick-prompt-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      document.getElementById("chatInput").value = e.target.dataset.prompt;
      sendChatMessage();
    });
  });

  // Profile save button
  const saveProfileBtn = document.getElementById("saveProfileBtn");
  if (saveProfileBtn) {
    saveProfileBtn.addEventListener("click", saveUserProfile);
  }

  // Setup sync modal
  setupSyncModal();
}

function switchTab(tabName) {
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.tab === tabName);
  });
  document.querySelectorAll(".tab-content").forEach((content) => {
    content.classList.toggle("active", content.id === `tab-${tabName}`);
  });

  if (tabName === "checkin") {
    renderCheckinTab();
    document.getElementById("fabAddGoal").style.display = "block";
  } else {
    document.getElementById("fabAddGoal").style.display = "none";
    if (tabName === "progress") renderProgressTab();
    else if (tabName === "reflect") renderReflectTab();
    else if (tabName === "profile") loadUserProfile();
  }
}

function openGoalModal() {
  document.getElementById("goalModal").classList.remove("hidden");
}

function closeGoalModal() {
  document.getElementById("goalModal").classList.add("hidden");
  document.getElementById("goalNameInput").value = "";
  document.getElementById("goalWhy").value = "";
  document.getElementById("goalTimeframe").value = "Q1";
  document
    .querySelectorAll(".importance-option")
    .forEach((o) => o.classList.remove("selected"));
  document
    .querySelector('.importance-option[data-imp="medium"]')
    .classList.add("selected");
}

function createNewGoal() {
  const name = document.getElementById("goalNameInput")?.value.trim();
  if (!name) return alert("goal name needed");
  const timeframe = document.getElementById("goalTimeframe")?.value || "Q1";
  const importanceEl = document.querySelector(".importance-option.selected");
  const importance = importanceEl ? importanceEl.dataset.imp : "medium";
  const why =
    document.getElementById("goalWhy")?.value.trim() || "just because";

  let goals = getGoals();
  if (goals.length >= 5) {
    alert("Maximum 5 goals reached. Delete one to add another.");
    closeGoalModal();
    return;
  }

  const newGoal = {
    id: Date.now().toString(),
    name,
    timeframe,
    importance,
    why,
    progress: 0,
  };
  goals.push(newGoal);
  localStorage.setItem("jia_goals", JSON.stringify(goals));
  closeGoalModal();
  renderCheckinTab();
}

async function renderCheckinTab() {
  const goals = getGoals();
  const today = await getTodayString();
  const checkins = getCheckins();
  const container = document.getElementById("goalsContainer");
  const completionDiv = document.getElementById("completionScreen");
  const fab = document.getElementById("fabAddGoal");

  if (goals.length >= 5) fab.style.display = "none";
  else fab.style.display = "block";

  const allCheckedIn =
    goals.length > 0 && goals.every((goal) => checkins[`${goal.id}_${today}`]);
  if (allCheckedIn && goals.length === 5) {
    completionDiv.classList.remove("hidden");
    container.innerHTML = "";
    return;
  } else {
    completionDiv.classList.add("hidden");
  }

  let html = "";
  if (goals.length === 0) {
    html =
      '<p style="color: var(--text-muted); text-align:center; margin-top: 40px;">✨ tap the + to create your first goal</p>';
  } else {
    goals.forEach((goal) => {
      html += renderGoalCard(goal, today, checkins);
    });
  }

  if (goals.length > 0 && goals.length < 5) {
    html += `<div class="max-goals-message">📌 ${5 - goals.length} slot${5 - goals.length > 1 ? "s" : ""} left · tap + to add more</div>`;
  } else if (goals.length === 5) {
    html += `<div class="max-goals-message"><span>max 5 reached</span> — delete one to replace</div>`;
  }

  container.innerHTML = html;

  document.querySelectorAll(".delete-goal-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const goalId = e.target.dataset.id;
      deleteGoalById(goalId);
    });
  });

  document.querySelectorAll(".goal-name").forEach((el) => {
    el.addEventListener("click", (e) => {
      const goalId = e.target.dataset.goalId;
      enableGoalNameEdit(goalId);
    });
  });

  goals.forEach((goal) => {
    document
      .querySelectorAll(`[data-goal-id="${goal.id}"] .mode-btn`)
      .forEach((btn) => {
        btn.addEventListener("click", (e) => {
          const mode = e.target.dataset.mode;
          handleModeSelection(goal.id, mode, today);
        });
      });
  });
}

function deleteGoalById(id) {
  let goals = getGoals();
  goals = goals.filter((g) => g.id !== id);
  localStorage.setItem("jia_goals", JSON.stringify(goals));
  renderCheckinTab();
}

function renderGoalCard(goal, today, checkins) {
  const checkinKey = `${goal.id}_${today}`;
  const isCheckedIn = checkins[checkinKey];
  const mode = isCheckedIn ? checkins[checkinKey] : null;
  const progressColor = mode ? MODES[mode].color : "#4a9e5c";

  let modeSection = isCheckedIn
    ? `<div class="mode-confirmation" style="background: ${MODES[mode].color};">${mode}</div>`
    : `<div class="mode-buttons">${Object.keys(MODES)
        .map((m) => `<button class="mode-btn" data-mode="${m}">${m}</button>`)
        .join("")}</div>`;

  return `
    <div class="goal-card" data-goal-id="${goal.id}">
      <button class="delete-goal-btn" data-id="${goal.id}" aria-label="Delete goal">🗑️</button>
      <div class="goal-header">
        <span class="goal-name" data-goal-id="${goal.id}">${goal.name}</span>
      </div>
      <div class="goal-tags">
        <span class="timeframe-pill">${goal.timeframe}</span>
        <span class="priority-badge priority-${goal.importance}">${goal.importance}</span>
      </div>
      <div class="goal-why">${goal.why}</div>
      <div class="progress-section">
        <div class="progress-label">${goal.progress}%</div>
        <div class="progress-bar"><div class="progress-fill" style="width: ${goal.progress}%; background: ${progressColor};"></div></div>
      </div>
      ${modeSection}
    </div>`;
}

function enableGoalNameEdit(goalId) {
  const span = document.querySelector(`.goal-name[data-goal-id="${goalId}"]`);
  const current = span.textContent;
  const input = document.createElement("input");
  input.className = "goal-name-input";
  input.value = current;
  const save = () => {
    const newName = input.value.trim();
    if (newName && newName !== current) updateGoalName(goalId, newName);
    renderCheckinTab();
  };
  input.addEventListener("blur", save);
  input.addEventListener("keypress", (e) => {
    if (e.key === "Enter") save();
  });
  span.replaceWith(input);
  input.focus();
}

function updateGoalName(goalId, newName) {
  const goals = getGoals();
  const goal = goals.find((g) => g.id === goalId);
  if (goal) {
    goal.name = newName;
    localStorage.setItem("jia_goals", JSON.stringify(goals));
  }
}

async function handleModeSelection(goalId, mode, today) {
  const goals = getGoals();
  const goal = goals.find((g) => g.id === goalId);
  if (!goal) return;

  goal.progress = Math.min(100, goal.progress + MODES[mode].weight * 2.5);
  localStorage.setItem("jia_goals", JSON.stringify(goals));

  const checkins = getCheckins();
  checkins[`${goalId}_${today}`] = mode;
  localStorage.setItem("jia_checkins", JSON.stringify(checkins));

  const history = getHistory();
  if (!history[goalId]) history[goalId] = [];
  history[goalId].push(mode);
  if (history[goalId].length > 14) history[goalId].shift();
  localStorage.setItem("jia_history", JSON.stringify(history));

  renderCheckinTab();
}

// --- Progress, reflect, chat ---
function renderProgressTab() {
  renderStats();
  renderHeatmap();
  renderChart();
  renderGoalProgressList();
}

function renderStats() {
  const goals = getGoals();
  const history = getHistory();
  let totalEffort = 0,
    count = 0;
  goals.forEach((g) => {
    (history[g.id] || []).forEach((m) => {
      totalEffort += MODES[m]?.weight || 0;
      count++;
    });
  });
  const consistency = count ? Math.round(totalEffort / count) : 0;
  let bestStreak = 0;
  goals.forEach((g) => {
    let s = 0;
    (history[g.id] || []).forEach((m) => {
      if (m !== "Skipped") {
        s++;
        bestStreak = Math.max(bestStreak, s);
      } else s = 0;
    });
  });
  const onTrack = goals.filter((g) => g.progress > 40).length;
  const modeCounts = {};
  goals.forEach((g) => {
    (history[g.id] || [])
      .slice(-7)
      .forEach((m) => (modeCounts[m] = (modeCounts[m] || 0) + 1));
  });
  const topMode =
    Object.entries(modeCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "None";
  document.getElementById("statsGrid").innerHTML = `
    <div class="stat-card"><div class="stat-label">Consistency</div><div class="stat-value">${consistency}%</div></div>
    <div class="stat-card"><div class="stat-label">Best Streak</div><div class="stat-value">${bestStreak}</div></div>
    <div class="stat-card"><div class="stat-label">On Track</div><div class="stat-value">${onTrack}/${goals.length}</div></div>
    <div class="stat-card"><div class="stat-label">Top Mode</div><div class="stat-value" style="font-size:18px;">${topMode}</div></div>`;
}

function setupHeatmapLegend() {
  const legend = Object.entries(MODES)
    .map(
      ([m, c]) =>
        `<div class="legend-item"><div class="legend-color" style="background:${c.color};"></div><span>${m}</span></div>`,
    )
    .join("");
  document.querySelector(".heatmap-legend").innerHTML = legend;
}

function renderHeatmap() {
  const goals = getGoals();
  const history = getHistory();
  document.getElementById("heatmap").innerHTML = goals
    .map(
      (g) =>
        `<div class="heatmap-row"><div class="heatmap-label">${g.name}</div><div class="heatmap-cells">${(history[g.id] || []).map((m) => `<div class="heatmap-cell" style="background:${MODES[m]?.color || "#e5e7eb"};"></div>`).join("")}</div></div>`,
    )
    .join("");
}

function renderChart() {
  const goals = getGoals();
  const history = getHistory();
  if (window.effortChartInstance) window.effortChartInstance.destroy();
  const ctx = document.getElementById("effortChart");
  if (!ctx) return;
  const datasets = goals.map((g, i) => ({
    label: g.name,
    data: (history[g.id] || []).map((m) => MODES[m].weight),
    borderColor: ["#4a9e5c", "#378add", "#ba7517", "#d85a30", "#888780"][i % 5],
    tension: 0.4,
  }));
  window.effortChartInstance = new Chart(ctx, {
    type: "line",
    data: {
      labels: Array.from({ length: 14 }, (_, i) => `D${i + 1}`),
      datasets,
    },
    options: {
      responsive: true,
      scales: { y: { beginAtZero: true, max: 100 } },
    },
  });
}

function renderGoalProgressList() {
  const goals = getGoals();
  const history = getHistory();
  document.getElementById("goalProgressList").innerHTML = goals
    .map((g) => {
      const h = history[g.id] || [];
      const avg = Math.round(
        h.reduce((s, m) => s + MODES[m].weight, 0) / (h.length || 1),
      );
      return `<div class="goal-progress-item"><div class="goal-progress-header"><div class="goal-progress-name">${g.name}</div><div class="goal-progress-meta"><span>Avg effort: ${avg}%</span></div></div><div class="progress-bar"><div class="progress-fill" style="width:${g.progress}%;"></div></div></div>`;
    })
    .join("");
}

function renderReflectTab() {
  const reflections = JSON.parse(
    localStorage.getItem("jia_reflections") || "{}",
  );
  document.getElementById("reflect1").value = reflections.q1 || "";
  document.getElementById("reflect2").value = reflections.q2 || "";
  document.getElementById("reflect3").value = reflections.q3 || "";
}

// ========== USER PROFILE FUNCTIONS ==========
function loadUserProfile() {
  const profile = JSON.parse(localStorage.getItem("jia_userProfile") || "{}");
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
  const profile = JSON.parse(localStorage.getItem("jia_userProfile") || "{}");
  const parts = [];

  if (profile.identity) parts.push(`👤 About me: ${profile.identity}`);
  if (profile.challenges) parts.push(`⚠️ My challenges: ${profile.challenges}`);
  if (profile.support) parts.push(`🤝 Support I need: ${profile.support}`);
  if (profile.context) parts.push(`📝 Extra context: ${profile.context}`);

  return parts.length > 0 ? parts.join("\n") : "No user profile set yet.";
}

// ========== UPDATED AI FUNCTIONS WITH PROFILE ==========
async function getReflectionFeedback() {
  const answer1 = document.getElementById("reflect1").value.trim();
  const answer2 = document.getElementById("reflect2").value.trim();
  const answer3 = document.getElementById("reflect3").value.trim();

  if (!answer1 && !answer2 && !answer3) {
    alert("Please answer at least one reflection question.");
    return;
  }

  const reflections = { q1: answer1, q2: answer2, q3: answer3 };
  localStorage.setItem("jia_reflections", JSON.stringify(reflections));

  const btn = document.getElementById("getAiFeedback");
  const resultDiv = document.getElementById("aiFeedbackResult");
  btn.disabled = true;
  resultDiv.innerHTML = '<div class="spinner">thinking...</div>';
  resultDiv.classList.remove("hidden");

  const context = getGoalContext();
  const userProfile = getUserProfileForAI();

  const prompt = `
USER PROFILE CONTEXT (know this person):
${userProfile}

CURRENT GOALS:
${context}

TODAY'S REFLECTION:
1. What made this week hard or easy? ${answer1}
2. Which goal deserves more attention? ${answer2}
3. New idea competing for focus? ${answer3}

Based on everything you know about this person, their challenges, and their goals - provide honest, specific feedback in 3-4 sentences and one concrete recommendation. Be personal and reference their profile.
  `.trim();

  try {
    const response = await callDeepSeekAPI([{ role: "user", content: prompt }]);
    resultDiv.innerHTML = `<p>${response.replace(/\n/g, "<br>")}</p>`;
  } catch (error) {
    resultDiv.innerHTML = `<p style="color: var(--mode-struggled);">⚠️ ${error.message}</p>`;
  } finally {
    btn.disabled = false;
  }
}

async function sendChatMessage() {
  const input = document.getElementById("chatInput");
  const message = input.value.trim();
  if (!message) return;

  const sendBtn = document.getElementById("chatSend");
  sendBtn.disabled = true;

  const messages = JSON.parse(
    localStorage.getItem("jia_chat_messages") || "[]",
  );
  messages.push({ role: "user", content: message });
  localStorage.setItem("jia_chat_messages", JSON.stringify(messages));
  input.value = "";
  renderChatMessages();

  try {
    const context = getGoalContext();
    const userProfile = getUserProfileForAI();

    const systemPrompt = `You are JIA, a sharp AI goal partner. You know this person deeply:

${userProfile}

Their current goals: ${context || "none yet"}

Use their profile context to give personalized advice. Reference their challenges and what they've told you. Be honest, direct, and supportive in the way they need. Keep responses to 3-4 sentences.`;

    const history = messages.slice(-6).map((m) => ({
      role: m.role === "ai" ? "assistant" : "user",
      content: m.content,
    }));

    const response = await callDeepSeekAPI([
      { role: "system", content: systemPrompt },
      ...history,
    ]);

    messages.push({ role: "ai", content: response });
    localStorage.setItem("jia_chat_messages", JSON.stringify(messages));
    renderChatMessages();
  } catch (error) {
    messages.push({ role: "ai", content: `⚠️ ${error.message}` });
    localStorage.setItem("jia_chat_messages", JSON.stringify(messages));
    renderChatMessages();
  } finally {
    sendBtn.disabled = false;
  }
}

function initializeChat() {
  const messages = JSON.parse(
    localStorage.getItem("jia_chat_messages") || "[]",
  );
  if (messages.length === 0) {
    messages.push({
      role: "ai",
      content: "Hey. Add some goals first – head to Check-in.",
    });
    localStorage.setItem("jia_chat_messages", JSON.stringify(messages));
  }
  renderChatMessages();
}

function renderChatMessages() {
  const messages = JSON.parse(
    localStorage.getItem("jia_chat_messages") || "[]",
  );
  const container = document.getElementById("chatMessages");
  container.innerHTML = messages
    .map((msg) => {
      return `<div class="chat-message ${msg.role}"><div class="message-bubble">${msg.content}</div></div>`;
    })
    .join("");
  container.scrollTop = container.scrollHeight;
}

async function callDeepSeekAPI(messages) {
  const response = await fetch("/api/groq", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error?.message || data.error || "API failed");
  }

  if (!data.choices || !data.choices.length) {
    throw new Error("Invalid AI response");
  }

  return data.choices[0].message.content;
}

function getGoalContext() {
  return getGoals()
    .map((g) => `${g.name} (${g.progress}%)`)
    .join(", ");
}

// Sync/Import/Export functionality
function setupSyncModal() {
  const syncBtn = document.getElementById("syncBtn");
  const syncModal = document.getElementById("syncModal");
  const closeSyncModalBtn = document.getElementById("closeSyncModalBtn");
  const cancelSyncBtn = document.getElementById("cancelSyncBtn");
  const exportBtn = document.getElementById("exportBtn");
  const importFile = document.getElementById("importFile");

  if (!syncBtn) return;

  syncBtn.addEventListener("click", () => {
    syncModal.classList.remove("hidden");
  });

  function closeSyncModal() {
    syncModal.classList.add("hidden");
  }

  closeSyncModalBtn.addEventListener("click", closeSyncModal);
  cancelSyncBtn.addEventListener("click", closeSyncModal);
  syncModal.addEventListener("click", (e) => {
    if (e.target.classList.contains("modal-overlay")) closeSyncModal();
  });

  // Export data
  exportBtn.addEventListener("click", () => {
    const goals = getGoals();
    const checkins = getCheckins();
    const history = getHistory();
    const reflections = JSON.parse(
      localStorage.getItem("jia_reflections") || "{}",
    );
    const chatMessages = JSON.parse(
      localStorage.getItem("jia_chat_messages") || "[]",
    );
    const userProfile = JSON.parse(
      localStorage.getItem("jia_userProfile") || "{}",
    );

    // Convert checkins to use 24-hour format dates
    const convertedCheckins = {};
    Object.keys(checkins).forEach((key) => {
      // Check if the key has a date in YYYY-MM-DD format
      const parts = key.split("_");
      if (parts.length === 2) {
        const goalId = parts[0];
        const dateStr = parts[1];
        // Convert to 24-hour format date (YYYY-MM-DD)
        convertedCheckins[`${goalId}_${dateStr}`] = checkins[key];
      } else {
        // Keep as is if format is different
        convertedCheckins[key] = checkins[key];
      }
    });

    const exportData = {
      version: "2.0", // Updated version
      timestamp: new Date().toISOString(),
      goals,
      checkins: convertedCheckins,
      history,
      reflections,
      chatMessages,
      userProfile,
    };

    const dataStr = JSON.stringify(exportData, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `jia-backup-${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    alert("✅ Progress exported successfully! (v2.0 format)");
  });

  // Import data
  importFile.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const importData = JSON.parse(event.target.result);

        if (!importData.goals || !importData.checkins || !importData.history) {
          throw new Error("Invalid backup file format");
        }

        if (
          confirm(
            "⚠️ This will replace all your current goals and progress. Continue?",
          )
        ) {
          // Handle version 1.0 data (convert if needed)
          let checkinsToImport = importData.checkins;

          // If it's version 1.0, ensure dates are in correct format
          if (importData.version === "1.0") {
            console.log("Converting v1.0 data to v2.0 format");
            // v1.0 already uses YYYY-MM-DD format, so no conversion needed
            // Just pass through
          }

          localStorage.setItem(
            "jia_goals",
            JSON.stringify(importData.goals || []),
          );
          localStorage.setItem(
            "jia_checkins",
            JSON.stringify(checkinsToImport || {}),
          );
          localStorage.setItem(
            "jia_history",
            JSON.stringify(importData.history || {}),
          );
          localStorage.setItem(
            "jia_reflections",
            JSON.stringify(importData.reflections || {}),
          );
          localStorage.setItem(
            "jia_chat_messages",
            JSON.stringify(importData.chatMessages || []),
          );
          localStorage.setItem(
            "jia_userProfile",
            JSON.stringify(importData.userProfile || {}),
          );

          alert("✅ Import successful! Refreshing...");
          location.reload();
        }
      } catch (error) {
        alert("❌ Invalid backup file: " + error.message);
      }
    };
    reader.readAsText(file);
    importFile.value = "";
  });
}

// ========== INSTANT LOCAL DATE ==========
async function getRealTodayString() {
  // Just use local date - instant, no waiting
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

async function getTodayString() {
  return await getRealTodayString();
}

// helpers
function getGoals() {
  return JSON.parse(localStorage.getItem("jia_goals") || "[]");
}
function getCheckins() {
  return JSON.parse(localStorage.getItem("jia_checkins") || "{}");
}
function getHistory() {
  return JSON.parse(localStorage.getItem("jia_history") || "{}");
}
