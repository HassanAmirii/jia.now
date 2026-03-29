// ========== PROGRESS TAB ==========

function toLocalDateStr(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getActivityStartDate() {
  const checkins = getCheckins();
  let earliest = null;

  Object.keys(checkins).forEach((key) => {
    const parts = key.split("_");
    const dateStr = parts[parts.length - 1];
    if (dateStr && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      const d = new Date(dateStr + "T00:00:00");
      if (!earliest || d < earliest) earliest = d;
    }
  });

  return earliest || new Date();
}

function getDisplayDates() {
  const start = getActivityStartDate();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  start.setHours(0, 0, 0, 0);

  const dates = [];
  const current = new Date(start);
  while (current <= today) {
    dates.push(toLocalDateStr(current));
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

function parseDateOnly(dateStr) {
  return new Date(`${dateStr}T00:00:00`);
}

function getGoalStartDate(goalId, entries) {
  const goals = getGoals();
  const goal = goals.find((g) => g.id === goalId);
  const rawId = goal?.id || goalId;
  const parsedId = Number(rawId);

  let createdDate = null;
  if (Number.isFinite(parsedId) && parsedId > 0) {
    const parsedDate = new Date(parsedId);
    if (!Number.isNaN(parsedDate.getTime())) {
      parsedDate.setHours(0, 0, 0, 0);
      createdDate = parsedDate;
    }
  }

  if (!entries.length) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return createdDate || today;
  }

  const firstEntryDate = parseDateOnly(entries[0].dateStr);
  if (!createdDate) return firstEntryDate;
  return createdDate < firstEntryDate ? createdDate : firstEntryDate;
}

function getDaysBetween(startDate, endDate) {
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.max(1, Math.floor((endDate - startDate) / msPerDay) + 1);
}

function getGoalCheckinEntries(goalId) {
  const checkins = getCheckins();
  const keyPrefix = `${goalId}_`;

  return Object.entries(checkins)
    .filter(([key]) => key.startsWith(keyPrefix))
    .map(([key, mode]) => {
      const dateStr = key.slice(keyPrefix.length);
      return { dateStr, mode };
    })
    .filter(
      ({ dateStr, mode }) => /^\d{4}-\d{2}-\d{2}$/.test(dateStr) && MODES[mode],
    )
    .sort((a, b) => a.dateStr.localeCompare(b.dateStr));
}

function getGoalMetrics(goalId) {
  const entries = getGoalCheckinEntries(goalId);
  const activeEntries = entries.filter(({ mode }) => mode !== "Skipped");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const startDate = getGoalStartDate(goalId, entries);

  const checkinDays = activeEntries.length;
  const totalDays = getDaysBetween(startDate, today);
  const totalWeight = activeEntries.reduce(
    (sum, { mode }) => sum + (MODES[mode]?.weight ?? 0),
    0,
  );

  // Missing days are treated as implicit skipped (weight 0) by dividing by totalDays.
  const quality = Math.round(totalWeight / totalDays);
  const consistency = Math.round((checkinDays / totalDays) * 100);

  // Blended score: effort quality matters most, consistency keeps the score honest.
  const progress = Math.round(quality * 0.7 + consistency * 0.3);

  return {
    progress,
    quality,
    consistency,
    checkinDays,
    totalDays,
  };
}

function getBestStreakForGoal(goalId) {
  const entries = getGoalCheckinEntries(goalId);
  if (!entries.length) return 0;

  let best = 0;
  let current = 0;
  let prevDate = null;

  entries.forEach(({ dateStr, mode }) => {
    const date = parseDateOnly(dateStr);
    const isConsecutive = prevDate && getDaysBetween(prevDate, date) === 2;
    const countsTowardStreak = mode !== "Skipped";

    if (!countsTowardStreak) {
      current = 0;
    } else if (!prevDate || isConsecutive) {
      current += 1;
    } else {
      current = 1;
    }

    best = Math.max(best, current);
    prevDate = date;
  });

  return best;
}

function getRecentTopMode(days = 7) {
  const checkins = getCheckins();
  const since = new Date();
  since.setHours(0, 0, 0, 0);
  since.setDate(since.getDate() - (days - 1));

  const modeCounts = {};

  Object.entries(checkins).forEach(([key, mode]) => {
    const parts = key.split("_");
    const dateStr = parts[parts.length - 1];
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr) || !MODES[mode]) return;

    const date = parseDateOnly(dateStr);
    if (date >= since) {
      modeCounts[mode] = (modeCounts[mode] || 0) + 1;
    }
  });

  return (
    Object.entries(modeCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "None"
  );
}

function recalculateGoalProgress(goalId) {
  return getGoalMetrics(goalId).progress;
}

function getCommitmentContracts() {
  return JSON.parse(localStorage.getItem("jia_commitment_contracts") || "{}");
}

function setCommitmentContracts(contracts) {
  localStorage.setItem("jia_commitment_contracts", JSON.stringify(contracts));
}

function getWeeklyWindow() {
  const end = new Date();
  end.setHours(0, 0, 0, 0);
  const start = new Date(end);

  // Calendar week reset: Monday is day 1, Sunday is day 0.
  const day = end.getDay();
  const daysSinceMonday = (day + 6) % 7;
  start.setDate(end.getDate() - daysSinceMonday);

  return { start, end };
}

function getGoalWeeklyCheckinCount(goalId, startDate, endDate) {
  const checkins = getCheckins();
  let count = 0;

  const current = new Date(startDate);
  while (current <= endDate) {
    const dateStr = toLocalDateStr(current);
    const mode = checkins[`${goalId}_${dateStr}`];
    if (mode && mode !== "Skipped") count += 1;
    current.setDate(current.getDate() + 1);
  }

  return count;
}

function renderProgressTab() {
  renderStats();
  renderHeatmap();
  renderChart();
  renderCommitmentContracts();
  renderGoalProgressList();
}

function renderCommitmentContracts() {
  const goals = getGoals();
  const container = document.getElementById("contractList");
  if (!container) return;

  if (!goals.length) {
    container.innerHTML =
      '<div class="contract-empty">Add goals to create weekly commitment contracts.</div>';
    return;
  }

  const contracts = getCommitmentContracts();
  const { start, end } = getWeeklyWindow();

  container.innerHTML = goals
    .map((goal) => {
      const target = contracts[goal.id] || 5;
      const loggedDays = getGoalWeeklyCheckinCount(goal.id, start, end);
      const met = loggedDays >= target;
      const remaining = Math.max(0, target - loggedDays);

      return `
        <div class="contract-item" data-goal-id="${goal.id}">
          <div class="contract-item-top">
            <div class="contract-goal-name">${goal.name}</div>
            <label class="contract-target-wrap">Target
              <select class="contract-target-select" data-goal-id="${goal.id}">
                ${[1, 2, 3, 4, 5, 6, 7]
                  .map(
                    (n) =>
                      `<option value="${n}" ${target === n ? "selected" : ""}>${n}/7</option>`,
                  )
                  .join("")}
              </select>
            </label>
          </div>
          <div class="contract-status ${met ? "met" : "behind"}">
            ${loggedDays}/7 done · ${met ? "target met" : `${remaining} check-in${remaining > 1 ? "s" : ""} needed`}
          </div>
        </div>
      `;
    })
    .join("");

  container.querySelectorAll(".contract-target-select").forEach((select) => {
    select.addEventListener("change", (e) => {
      const goalId = e.target.dataset.goalId;
      const target = Number(e.target.value);
      const latest = getCommitmentContracts();
      latest[goalId] = target;
      setCommitmentContracts(latest);
      renderCommitmentContracts();
    });
  });
}

function renderStats() {
  const goals = getGoals();
  const metrics = goals.map((g) => getGoalMetrics(g.id));
  const consistency = metrics.length
    ? Math.round(
        metrics.reduce((sum, m) => sum + m.consistency, 0) / metrics.length,
      )
    : 0;
  let bestStreak = 0;

  goals.forEach((g) => {
    bestStreak = Math.max(bestStreak, getBestStreakForGoal(g.id));
  });

  const onTrack = goals.filter(
    (g) => recalculateGoalProgress(g.id) >= 60,
  ).length;
  const topMode = getRecentTopMode(7);

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
        `<div class="legend-item" data-mode="${m}"><div class="legend-color" style="background:${c.color};"></div><span>${m}</span></div>`,
    )
    .join("");
  document.querySelector(".heatmap-legend").innerHTML = legend;
}

function renderHeatmap() {
  const goals = getGoals();
  const checkins = getCheckins();
  const displayDates = getDisplayDates();

  document.getElementById("heatmap").innerHTML = goals
    .map((g) => {
      const cells = displayDates
        .map((dateStr) => {
          const checkinKey = `${g.id}_${dateStr}`;
          const mode = checkins[checkinKey] || null;

          if (!mode) {
            const skippedColor = MODES["Skipped"]?.color || "#e5e7eb";
            return `<div class="heatmap-cell" style="background:${skippedColor};" data-mode="Skipped" title="${dateStr}: No entry"></div>`;
          }

          const color = MODES[mode]?.color || "#e5e7eb";
          return `<div class="heatmap-cell" style="background:${color};" data-mode="${mode}" title="${dateStr}: ${mode}"></div>`;
        })
        .join("");

      return `<div class="heatmap-row"><div class="heatmap-label">${g.name}</div><div class="heatmap-cells">${cells}</div></div>`;
    })
    .join("");
}

function renderChart() {
  const goals = getGoals();
  if (window.effortChartInstance) window.effortChartInstance.destroy();
  const ctx = document.getElementById("effortChart");
  if (!ctx) return;

  const checkins = getCheckins();
  const displayDates = getDisplayDates();

  const datasets = goals.map((g, i) => {
    const data = displayDates.map((dateStr) => {
      const key = `${g.id}_${dateStr}`;
      const mode = checkins[key] || "Skipped";
      return MODES[mode].weight;
    });

    return {
      label: g.name,
      data,
      borderColor: ["#4a9e5c", "#378add", "#ba7517", "#d85a30", "#888780"][
        i % 5
      ],
      tension: 0.4,
      spanGaps: false,
    };
  });

  window.effortChartInstance = new Chart(ctx, {
    type: "line",
    data: {
      labels: displayDates.map((dateStr) => {
        const d = new Date(dateStr + "T00:00:00");
        return d.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        });
      }),
      datasets,
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "bottom",
          align: "start",
          labels: {
            boxWidth: 12,
            boxHeight: 3,
            padding: 8,
            font: { size: 9 },
          },
        },
        tooltip: {
          callbacks: {
            title: (context) => {
              const dateStr = displayDates[context[0].dataIndex];
              const d = new Date(dateStr + "T00:00:00");
              return d.toLocaleDateString("en-US", {
                weekday: "short",
                month: "short",
                day: "numeric",
              });
            },
          },
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          max: 102,
          ticks: { stepSize: 20 },
        },
      },
    },
  });
}

function renderGoalProgressList() {
  const goals = getGoals();
  document.getElementById("goalProgressList").innerHTML = goals
    .map((g) => {
      const metrics = getGoalMetrics(g.id);
      const progress = metrics.progress;
      const progressColor = getProgressColor(progress);
      return `<div class="goal-progress-item"><div class="goal-progress-header"><div class="goal-progress-name">${g.name}</div><div class="goal-progress-meta"><span>Quality ${metrics.quality}% · Consistency ${metrics.consistency}%</span></div></div><div class="progress-bar"><div class="progress-fill" style="width:${progress}%; background: ${progressColor};"></div></div></div>`;
    })
    .join("");
}
