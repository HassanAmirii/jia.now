// scripts/goals.js

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
    progress: 0, // Make sure this is explicitly set to 0
  };

  // Initialize empty history for this goal
  const history = getHistory();
  history[newGoal.id] = []; // Empty array = no history = 0% progress
  localStorage.setItem("jia_history", JSON.stringify(history));

  goals.push(newGoal);
  localStorage.setItem("jia_goals", JSON.stringify(goals));
  closeGoalModal();
  renderCheckinTab();
}

function deleteGoalById(id) {
  // Get goal name directly from the DOM element that was clicked
  const goalCard = document.querySelector(`.goal-card[data-goal-id="${id}"]`);
  const goalNameElement = goalCard?.querySelector(".goal-name");
  const goalName = goalNameElement ? goalNameElement.textContent : "this goal";

  // Show confirmation dialog with the actual goal name
  if (
    confirm(
      `⚠️ Delete "${goalName}"?\n\nAll progress, check-ins, and history for this goal will be permanently removed. This cannot be undone.`,
    )
  ) {
    // Get fresh goals from localStorage
    let goals = JSON.parse(localStorage.getItem("jia_goals") || "[]");
    goals = goals.filter((g) => g.id !== id);
    localStorage.setItem("jia_goals", JSON.stringify(goals));

    // Clean up history
    const history = JSON.parse(localStorage.getItem("jia_history") || "{}");
    delete history[id];
    localStorage.setItem("jia_history", JSON.stringify(history));

    // Clean up checkins
    const checkins = JSON.parse(localStorage.getItem("jia_checkins") || "{}");
    Object.keys(checkins).forEach((key) => {
      if (key.startsWith(id + "_")) {
        delete checkins[key];
      }
    });
    localStorage.setItem("jia_checkins", JSON.stringify(checkins));

    renderCheckinTab();
  }
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

  const checkins = getCheckins();
  const checkinKey = `${goalId}_${today}`;

  // If already checked in today, do nothing
  if (checkins[checkinKey]) {
    renderCheckinTab();
    return;
  }

  // Get history
  const history = getHistory();
  const goalHistory = history[goalId] || [];

  // Add new check-in
  goalHistory.push(mode);

  // Calculate progress based on ALL historical check-ins
  // This overrides any stored progress value
  goal.progress = recalculateGoalProgress(goal.id);

  // Save everything
  localStorage.setItem("jia_goals", JSON.stringify(goals));
  checkins[checkinKey] = mode;
  localStorage.setItem("jia_checkins", JSON.stringify(checkins));

  history[goalId] = goalHistory;
  localStorage.setItem("jia_history", JSON.stringify(history));

  renderCheckinTab();
}

function renderGoalCard(goal, today, checkins) {
  const checkinKey = `${goal.id}_${today}`;
  const isCheckedIn = checkins[checkinKey];
  const mode = isCheckedIn ? checkins[checkinKey] : null;

  // Ensure progress is a number and default to 0 if undefined
  const progress = recalculateGoalProgress(goal.id);
  const progressColor = getProgressColor(progress);

  let modeSection = isCheckedIn
    ? `<div class="mode-confirmation" style="background: ${MODES[mode].color};">${mode}</div>`
    : `<div class="mode-buttons">${Object.keys(MODES)
        .map((m) => `<button class="mode-btn" data-mode="${m}">${m}</button>`)
        .join("")}</div>`;

  return `
    <div class="goal-card" data-goal-id="${goal.id}">
      <button class="delete-goal-btn" data-id="${goal.id}" aria-label="Delete goal" title="Delete goal">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M3 6h18"></path>
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"></path>
          <path d="M8 4V2h8v2"></path>
          <line x1="10" y1="11" x2="10" y2="17"></line>
          <line x1="14" y1="11" x2="14" y2="17"></line>
        </svg>
      </button>
      <div class="goal-header">
        <span class="goal-name" data-goal-id="${goal.id}">${goal.name}</span>
      </div>
      <div class="goal-tags">
        <span class="timeframe-pill">${goal.timeframe}</span>
        <span class="priority-badge priority-${goal.importance}">${goal.importance}</span>
      </div>
      <div class="goal-why">${goal.why}</div>
      <div class="progress-section">
        <div class="progress-label">${progress}% progress</div>
        <div class="progress-bar"><div class="progress-fill" style="width: ${progress}%; background: ${progressColor};"></div></div>
      </div>
      ${modeSection}
    </div>`;
}

async function renderCheckinTab() {
  const goals = getGoals();
  const today = await getTodayString();
  const checkins = getCheckins();
  const container = document.getElementById("goalsContainer");
  const fab = document.getElementById("fabAddGoal");

  if (goals.length >= 5) fab.style.display = "none";
  else fab.style.display = "block";

  let html = "";

  const allCheckedIn =
    goals.length > 0 && goals.every((goal) => checkins[`${goal.id}_${today}`]);

  // Sleek one-line banner that matches the bottom message style
  if (allCheckedIn && goals.length > 0) {
    html += `
      <div class="max-goals-message" style="color: white; margin-bottom: 16px;">
        <span style="font-weight: 600; color: #4a9e5c">✓ All checked in for today</span> — come back tomorrow. stay consistent.
      </div>
    `;
  }

  if (goals.length === 0) {
    html +=
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
