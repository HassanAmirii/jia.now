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
        `<div class="chat-message ${msg.role}"><div class="message-bubble">${msg.content}</div></div>`,
    )
    .join("");
  container.scrollTop = container.scrollHeight;
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
    const context = getGoalContext();
    const userProfile = getUserProfileForAI();

    const systemPrompt = `You are JIA, a sharp AI goal partner. You know this person deeply:\n\n${userProfile}\n\nTheir current goals: ${context || "none yet"}\n\nUse their profile context to give personalized advice. Reference their challenges and what they've told you. Be honest, direct, and supportive in the way they need. Keep responses to 3-4 sentences.`;

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
