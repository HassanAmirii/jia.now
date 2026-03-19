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
          max: 100,
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
