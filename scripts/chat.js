// ========== AI CHAT ==========
const DEEPSEEK_API_URL = "https://api.groq.com/openai/v1/chat/completions";

function initializeChat() {
  const messages = getChatMessages();
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
  const messages = getChatMessages();
  const container = document.getElementById("chatMessages");
  container.innerHTML = messages
    .map(
      (msg) =>
        `<div class="chat-message ${msg.role}"><div class="message-bubble">${formatChatMessageContent(msg.content)}</div></div>`,
    )
    .join("");
  container.scrollTop = container.scrollHeight;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatChatMessageContent(content) {
  if (typeof content !== "string") return "";
  if (content.startsWith('<div class="weekly-report"')) return content;
  return escapeHtml(content).replace(/\n/g, "<br>");
}

async function sendChatMessage() {
  const input = document.getElementById("chatInput");
  const message = input.value.trim();
  if (!message) return;

  const sendBtn = document.getElementById("chatSend");
  sendBtn.disabled = true;

  const messages = getChatMessages();
  messages.push({ role: "user", content: message });
  localStorage.setItem("jia_chat_messages", JSON.stringify(messages));
  input.value = "";
  renderChatMessages();

  try {
    if (isWeeklyReportRequest(message)) {
      messages.push({ role: "ai", content: buildWeeklyReportMarkdown() });
      localStorage.setItem("jia_chat_messages", JSON.stringify(messages));
      renderChatMessages();
      return;
    }

    const context = getGoalContext();
    const userProfile = getUserProfileForAI();

    const systemPrompt = `You are JIA, a goals manager only.\n\nVOICE:\n- Friendly but blunt.\n- Strictly evaluate progress and execution.\n- No therapy language, no life-coaching fluff, no unrelated topics.\n\nRULES:\n- Ground every claim in the provided goals/check-in data.\n- If performance is strong, acknowledge it directly before giving the next edge.\n- Do NOT claim burnout, overextension, or "too spread" unless evidence is present in the data.\n- If user asks for review, give: 1 short verdict, 2 evidence points, 1 next action.\n- Keep responses concise (3-5 sentences max).\n\nUSER PROFILE:\n${userProfile}\n\nCURRENT GOAL METRICS:\n${context || "none yet"}`;

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
You are JIA, a friendly-blunt goals manager. Be strict and data-focused.
Use only the provided profile/goals/reflection context.
If progress is solid, say it clearly before identifying the next risk.
No burnout/overload warning unless the reflection explicitly supports it.

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

async function callDeepSeekAPI(messages) {
  let response;

  try {
    response = await fetch("/api/groq", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages }),
    });
  } catch {
    throw new Error(
      "Failed to fetch AI service. Check your connection and function deployment.",
    );
  }

  const raw = await response.text();
  let data = {};

  if (raw) {
    try {
      data = JSON.parse(raw);
    } catch {
      if (!response.ok) {
        throw new Error(`AI request failed (${response.status}).`);
      }
      throw new Error("AI service returned invalid JSON.");
    }
  }

  if (!response.ok) {
    throw new Error(
      data.error?.message ||
        data.error ||
        data.message ||
        `AI request failed (${response.status}).`,
    );
  }

  if (
    !data.choices ||
    !data.choices.length ||
    !data.choices[0]?.message?.content
  ) {
    throw new Error("AI returned an empty response.");
  }

  return data.choices[0].message.content;
}

function getGoalContext() {
  const goals = getGoals();
  const checkins = getCheckins();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = toLocalDateStr(today);

  return goals
    .map((g) => {
      const progress = recalculateGoalProgress(g.id);
      const metrics =
        typeof getGoalMetrics === "function" ? getGoalMetrics(g.id) : null;
      const todayMode = checkins[`${g.id}_${todayStr}`] || "Not checked";
      if (!metrics)
        return `${g.name}: Progress ${progress}% | Today ${todayMode}`;

      return `${g.name}: Progress ${progress}% | Quality ${metrics.quality}% | Consistency ${metrics.consistency}% | Today ${todayMode}`;
    })
    .join("\n");
}

function isWeeklyReportRequest(message) {
  return /(^\/weekly\b)|(^\/report\b)|(weekly\s+report)|(week\s+report)/i.test(
    message.trim(),
  );
}

function buildWeeklyReportMarkdown() {
  const goals = getGoals();
  if (!goals.length) {
    return "No goals yet. Add a goal first, then use /weekly.";
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(today);
  start.setDate(today.getDate() - 6);
  const contracts = getCommitmentContracts();

  const checkins = getCheckins();
  const rows = goals.map((goal) => {
    let loggedDays = 0;
    let totalWeight = 0;
    let skippedDays = 0;

    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const dateStr = toLocalDateStr(d);
      const mode = checkins[`${goal.id}_${dateStr}`] || "Skipped";
      const weight = MODES[mode]?.weight ?? 0;

      if (checkins[`${goal.id}_${dateStr}`]) loggedDays += 1;
      if (mode === "Skipped") skippedDays += 1;
      totalWeight += weight;
    }

    const weeklyAvg = Math.round(totalWeight / 7);
    const coverage = Math.round((loggedDays / 7) * 100);
    const overallProgress = recalculateGoalProgress(goal.id);
    const targetDays = contracts[goal.id] || 5;
    const targetMet = loggedDays >= targetDays;

    return {
      name: goal.name,
      loggedDays,
      coverage,
      weeklyAvg,
      skippedDays,
      overallProgress,
      targetDays,
      targetMet,
    };
  });

  const tableRows = rows
    .map(
      (r) =>
        `<tr><td>${escapeHtml(r.name)}</td><td>${r.loggedDays}/7</td><td>${r.coverage}%</td><td>${r.weeklyAvg}%</td><td>${r.targetDays}/7</td><td>${r.targetMet ? "Yes" : "No"}</td><td>${r.overallProgress}%</td></tr>`,
    )
    .join("");

  const strongest = [...rows].sort((a, b) => b.weeklyAvg - a.weeklyAvg)[0];
  const weakest = [...rows].sort((a, b) => a.weeklyAvg - b.weeklyAvg)[0];

  return `
    <div class="weekly-report">
      <div class="weekly-report-title">Weekly report (${toLocalDateStr(start)} to ${toLocalDateStr(today)})</div>
      <div class="weekly-report-table-wrap">
        <table class="weekly-report-table">
          <thead>
            <tr>
              <th>Goal</th>
              <th>Check-ins</th>
              <th>Coverage</th>
              <th>Effort</th>
              <th>Target</th>
              <th>Met</th>
              <th>Progress</th>
            </tr>
          </thead>
          <tbody>${tableRows}</tbody>
        </table>
      </div>
      <div class="weekly-report-note">Verdict: Strongest execution is ${escapeHtml(strongest.name)}. Biggest risk is ${escapeHtml(weakest.name)}.</div>
      <div class="weekly-report-note">Next move: protect daily check-ins on the weakest goal for the next 7 days.</div>
    </div>
  `.trim();
}
