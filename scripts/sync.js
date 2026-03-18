// ========== SYNC/IMPORT/EXPORT ==========

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

  exportBtn.addEventListener("click", () => {
    const goals = getGoals();
    const checkins = getCheckins();
    const history = getHistory();
    const reflections = getReflections();
    const chatMessages = getChatMessages();
    const userProfile = getUserProfile();

    const convertedCheckins = {};
    Object.keys(checkins).forEach((key) => {
      const parts = key.split("_");
      if (parts.length === 2) {
        const goalId = parts[0];
        const dateStr = parts[1];
        convertedCheckins[`${goalId}_${dateStr}`] = checkins[key];
      } else {
        convertedCheckins[key] = checkins[key];
      }
    });

    const exportData = {
      version: "2.0",
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

        // Inside setupSyncModal, in the import section:
        if (
          confirm(
            "⚠️ This will replace all your current goals and progress. Continue?",
          )
        ) {
          // Store the imported data
          localStorage.setItem(
            "jia_goals",
            JSON.stringify(importData.goals || []),
          );
          localStorage.setItem(
            "jia_checkins",
            JSON.stringify(importData.checkins || {}),
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

          // RECALCULATE progress from history
          const goals = JSON.parse(localStorage.getItem("jia_goals"));
          const history = JSON.parse(localStorage.getItem("jia_history"));

          goals.forEach((goal) => {
            const goalHistory = history[goal.id] || [];
            if (goalHistory.length > 0) {
              const totalWeight = goalHistory.reduce(
                (sum, m) => sum + MODES[m].weight,
                0,
              );
              const avgEffort = totalWeight / goalHistory.length;
              goal.progress = Math.round(avgEffort);
            } else {
              goal.progress = 0;
            }
          });

          localStorage.setItem("jia_goals", JSON.stringify(goals));

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
