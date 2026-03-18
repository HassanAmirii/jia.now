// ========== PROGRESS TAB ==========

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
        `<div class="legend-item" data-mode="${m}"><div class="legend-color" style="background:${c.color};"></div><span>${m}</span></div>`,
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
        `<div class="heatmap-row"><div class="heatmap-label">${g.name}</div><div class="heatmap-cells">${(history[g.id] || []).map((m) => `<div class="heatmap-cell" style="background:${MODES[m]?.color || "#e5e7eb"};" data-mode="${m}"></div>`).join("")}</div></div>`,
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
      },
      scales: {
        y: {
          beginAtZero: true,
          max: 110,
          ticks: { stepSize: 20 },
        },
      },
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
      const progressColor = getProgressColor(g.progress);
      return `<div class="goal-progress-item"><div class="goal-progress-header"><div class="goal-progress-name">${g.name}</div><div class="goal-progress-meta"><span>Avg effort: ${avg}%</span></div></div><div class="progress-bar"><div class="progress-fill" style="width:${g.progress}%; background: ${progressColor};"></div></div></div>`;
    })
    .join("");
}
