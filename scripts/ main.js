// ========== MAIN APPLICATION ==========

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
  setupAutoResizeTextareas();
}

function autoResizeTextarea(el) {
  if (!el) return;
  el.style.height = "auto";
  el.style.height = `${el.scrollHeight}px`;
}

function setupAutoResizeTextareas() {
  const textareas = document.querySelectorAll(
    ".profile-textarea, .reflection-textarea, .chat-input",
  );

  textareas.forEach((el) => {
    autoResizeTextarea(el);
    el.addEventListener("input", () => autoResizeTextarea(el));
  });
}

function refreshAutoResizeTextareas() {
  document
    .querySelectorAll(".profile-textarea, .reflection-textarea, .chat-input")
    .forEach((el) => autoResizeTextarea(el));
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
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const tab = e.target.dataset.tab;
      switchTab(tab);
    });
  });

  document.getElementById("fabAddGoal").addEventListener("click", () => {
    const goals = getGoals();
    if (goals.length >= 5) {
      alert("You already have 5 goals. Delete one to add a new one.");
      return;
    }
    openGoalModal();
  });

  document
    .getElementById("closeModalBtn")
    .addEventListener("click", closeGoalModal);
  document.getElementById("goalModal").addEventListener("click", (e) => {
    if (e.target.classList.contains("modal-overlay")) closeGoalModal();
  });

  document
    .getElementById("createGoalBtn")
    .addEventListener("click", createNewGoal);

  document.querySelectorAll(".importance-option").forEach((opt) => {
    opt.addEventListener("click", (e) => {
      document
        .querySelectorAll(".importance-option")
        .forEach((o) => o.classList.remove("selected"));
      e.target.classList.add("selected");
    });
  });

  document
    .getElementById("getAiFeedback")
    .addEventListener("click", getReflectionFeedback);
  document
    .getElementById("chatSend")
    .addEventListener("click", sendChatMessage);
  document.getElementById("chatInput").addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendChatMessage();
    }
  });

  document.querySelectorAll(".quick-prompt-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      document.getElementById("chatInput").value = e.target.dataset.prompt;
      sendChatMessage();
    });
  });

  const saveProfileBtn = document.getElementById("saveProfileBtn");
  if (saveProfileBtn) {
    saveProfileBtn.addEventListener("click", saveUserProfile);
  }

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
    else if (tabName === "reflect") {
      renderReflectTab();
      refreshAutoResizeTextareas();
    } else if (tabName === "profile") {
      loadUserProfile();
      refreshAutoResizeTextareas();
    } else if (tabName === "advisor") {
      renderChatMessages();
      refreshAutoResizeTextareas();
    }
  }
}
