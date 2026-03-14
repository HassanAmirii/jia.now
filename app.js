// DeepSeek API Configuration
const DEEPSEEK_API_KEY = 'PASTE_YOUR_KEY_HERE';
const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';

// Mode configurations with weights and colors
const MODES = {
  'Locked In': { weight: 100, color: '#4a9e5c' },
  'Moving': { weight: 60, color: '#378add' },
  'Crawling': { weight: 30, color: '#ba7517' },
  'Struggled': { weight: 10, color: '#d85a30' },
  'Skipped': { weight: 0, color: '#888780' }
};

// Sample goals for initial load
const SAMPLE_GOALS = [
  {
    id: '1',
    name: 'CBT Platform',
    timeframe: 'Q1',
    importance: 'high',
    why: 'To build something real and prove I can ship',
    progress: 68
  },
  {
    id: '2',
    name: 'Fitness 3x/week',
    timeframe: 'Q1',
    importance: 'high',
    why: 'Energy and discipline bleed into everything else',
    progress: 34
  },
  {
    id: '3',
    name: 'Master Node.js',
    timeframe: 'Full Year',
    importance: 'high',
    why: 'Core skill for everything I want to build',
    progress: 52
  },
  {
    id: '4',
    name: 'Read 12 books',
    timeframe: 'Full Year',
    importance: 'low',
    why: 'Stay sharp outside code',
    progress: 25
  },
  {
    id: '5',
    name: 'Ship JIA v1',
    timeframe: 'Q2',
    importance: 'high',
    why: 'Turn this idea into something real',
    progress: 10
  }
];

// Initialize app on load
document.addEventListener('DOMContentLoaded', () => {
  initializeData();
  initializeUI();
  setupEventListeners();
  renderCheckinTab();
});

// Initialize localStorage data on first load
function initializeData() {
  if (!localStorage.getItem('jia_goals')) {
    localStorage.setItem('jia_goals', JSON.stringify(SAMPLE_GOALS));
    localStorage.setItem('jia_checkins', JSON.stringify({}));

    // Generate fake historical data
    const history = {};
    const modes = Object.keys(MODES);

    SAMPLE_GOALS.forEach(goal => {
      history[goal.id] = [];
      for (let i = 13; i >= 0; i--) {
        const randomMode = modes[Math.floor(Math.random() * modes.length)];
        history[goal.id].push(randomMode);
      }
    });

    localStorage.setItem('jia_history', JSON.stringify(history));
  }
}

// Initialize UI elements
function initializeUI() {
  // Set today's date
  const today = new Date();
  const dateStr = today.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
  document.getElementById('todayDate').textContent = dateStr;

  // Setup heatmap legend
  setupHeatmapLegend();

  // Initialize AI chat with opening message
  initializeChat();
}

// Setup all event listeners
function setupEventListeners() {
  // Tab navigation
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const tab = e.target.dataset.tab;
      switchTab(tab);
    });
  });

  // Reflect tab AI feedback button
  document.getElementById('getAiFeedback').addEventListener('click', getReflectionFeedback);

  // Chat functionality
  document.getElementById('chatSend').addEventListener('click', sendChatMessage);
  document.getElementById('chatInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendChatMessage();
  });

  // Quick prompt buttons
  document.querySelectorAll('.quick-prompt-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const prompt = e.target.dataset.prompt;
      document.getElementById('chatInput').value = prompt;
      sendChatMessage();
    });
  });
}

// Switch between tabs
function switchTab(tabName) {
  // Update tab buttons
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabName);
  });

  // Update tab content
  document.querySelectorAll('.tab-content').forEach(content => {
    content.classList.toggle('active', content.id === `tab-${tabName}`);
  });

  // Render tab-specific content
  if (tabName === 'checkin') {
    renderCheckinTab();
  } else if (tabName === 'progress') {
    renderProgressTab();
  } else if (tabName === 'reflect') {
    renderReflectTab();
  }
}

// Render Check-in Tab
function renderCheckinTab() {
  const goals = getGoals();
  const today = getTodayString();
  const checkins = getCheckins();

  const allCheckedIn = goals.every(goal => checkins[`${goal.id}_${today}`]);

  if (allCheckedIn && goals.length > 0) {
    document.getElementById('goalsContainer').classList.add('hidden');
    document.getElementById('completionScreen').classList.remove('hidden');
    return;
  }

  document.getElementById('goalsContainer').classList.remove('hidden');
  document.getElementById('completionScreen').classList.add('hidden');

  const container = document.getElementById('goalsContainer');
  container.innerHTML = goals.map(goal => renderGoalCard(goal, today)).join('');

  // Attach event listeners for mode buttons and goal name editing
  goals.forEach(goal => {
    const modeButtons = document.querySelectorAll(`[data-goal-id="${goal.id}"] .mode-btn`);
    modeButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const mode = e.target.dataset.mode;
        handleModeSelection(goal.id, mode, today);
      });
    });

    // Goal name editing
    const nameEl = document.querySelector(`[data-goal-id="${goal.id}"] .goal-name`);
    if (nameEl) {
      nameEl.addEventListener('click', () => enableGoalNameEdit(goal.id));
    }
  });
}

// Render individual goal card
function renderGoalCard(goal, today) {
  const checkins = getCheckins();
  const checkinKey = `${goal.id}_${today}`;
  const isCheckedIn = checkins[checkinKey];

  let modeSection = '';

  if (isCheckedIn) {
    const mode = checkins[checkinKey];
    const modeColor = MODES[mode].color;
    modeSection = `
      <div class="mode-confirmation" style="background: ${modeColor};">
        ${mode}
      </div>
    `;
  } else {
    modeSection = `
      <div class="mode-buttons">
        ${Object.keys(MODES).map(mode => `
          <button class="mode-btn" data-mode="${mode}">${mode}</button>
        `).join('')}
      </div>
    `;
  }

  const progressColor = isCheckedIn ? MODES[checkins[checkinKey]].color : '#4a9e5c';

  return `
    <div class="goal-card" data-goal-id="${goal.id}">
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
        <div class="progress-bar">
          <div class="progress-fill" style="width: ${goal.progress}%; background: ${progressColor};"></div>
        </div>
      </div>
      ${modeSection}
    </div>
  `;
}

// Enable inline editing of goal name
function enableGoalNameEdit(goalId) {
  const nameEl = document.querySelector(`[data-goal-id="${goalId}"] .goal-name`);
  const currentName = nameEl.textContent;

  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'goal-name-input';
  input.value = currentName;

  const saveEdit = () => {
    const newName = input.value.trim();
    if (newName && newName !== currentName) {
      updateGoalName(goalId, newName);
    }
    renderCheckinTab();
  };

  input.addEventListener('blur', saveEdit);
  input.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') saveEdit();
  });

  nameEl.replaceWith(input);
  input.focus();
  input.select();
}

// Update goal name in localStorage
function updateGoalName(goalId, newName) {
  const goals = getGoals();
  const goal = goals.find(g => g.id === goalId);
  if (goal) {
    goal.name = newName;
    localStorage.setItem('jia_goals', JSON.stringify(goals));
  }
}

// Handle mode selection for a goal
function handleModeSelection(goalId, mode, today) {
  const goals = getGoals();
  const goal = goals.find(g => g.id === goalId);

  if (!goal) return;

  // Update progress
  const weight = MODES[mode].weight;
  const progressIncrease = weight * 2.5;
  goal.progress = Math.min(100, goal.progress + progressIncrease);

  // Save goal progress
  localStorage.setItem('jia_goals', JSON.stringify(goals));

  // Save checkin
  const checkins = getCheckins();
  checkins[`${goalId}_${today}`] = mode;
  localStorage.setItem('jia_checkins', JSON.stringify(checkins));

  // Update history
  const history = getHistory();
  if (!history[goalId]) history[goalId] = [];
  history[goalId].push(mode);
  if (history[goalId].length > 14) history[goalId].shift();
  localStorage.setItem('jia_history', JSON.stringify(history));

  // Re-render
  renderCheckinTab();
}

// Render Progress Tab
function renderProgressTab() {
  renderStats();
  renderHeatmap();
  renderChart();
  renderGoalProgressList();
}

// Render statistics cards
function renderStats() {
  const goals = getGoals();
  const history = getHistory();

  // Calculate consistency (average effort over last 14 days)
  let totalEffort = 0;
  let count = 0;

  goals.forEach(goal => {
    const goalHistory = history[goal.id] || [];
    goalHistory.forEach(mode => {
      totalEffort += MODES[mode].weight;
      count++;
    });
  });

  const consistency = count > 0 ? Math.round(totalEffort / count) : 0;

  // Calculate best streak
  let bestStreak = 0;
  goals.forEach(goal => {
    const goalHistory = history[goal.id] || [];
    let currentStreak = 0;
    goalHistory.forEach(mode => {
      if (mode !== 'Skipped') {
        currentStreak++;
        bestStreak = Math.max(bestStreak, currentStreak);
      } else {
        currentStreak = 0;
      }
    });
  });

  // On track count
  const onTrack = goals.filter(g => g.progress > 40).length;

  // Top mode
  const modeCounts = {};
  goals.forEach(goal => {
    const goalHistory = history[goal.id] || [];
    goalHistory.slice(-7).forEach(mode => {
      modeCounts[mode] = (modeCounts[mode] || 0) + 1;
    });
  });

  const topMode = Object.entries(modeCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'None';

  const statsHTML = `
    <div class="stat-card">
      <div class="stat-label">Consistency</div>
      <div class="stat-value">${consistency}%</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Best Streak</div>
      <div class="stat-value">${bestStreak}</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">On Track</div>
      <div class="stat-value">${onTrack}/${goals.length}</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Top Mode</div>
      <div class="stat-value" style="font-size: 18px;">${topMode}</div>
    </div>
  `;

  document.getElementById('statsGrid').innerHTML = statsHTML;
}

// Setup heatmap legend
function setupHeatmapLegend() {
  const legendHTML = Object.entries(MODES).map(([mode, config]) => `
    <div class="legend-item">
      <div class="legend-color" style="background: ${config.color};"></div>
      <span>${mode}</span>
    </div>
  `).join('');

  document.querySelector('.heatmap-legend').innerHTML = legendHTML;
}

// Render heatmap
function renderHeatmap() {
  const goals = getGoals();
  const history = getHistory();

  const heatmapHTML = goals.map(goal => {
    const goalHistory = history[goal.id] || [];
    const cellsHTML = goalHistory.map(mode => {
      const color = MODES[mode]?.color || '#e5e7eb';
      return `<div class="heatmap-cell" style="background: ${color};"></div>`;
    }).join('');

    return `
      <div class="heatmap-row">
        <div class="heatmap-label">${goal.name}</div>
        <div class="heatmap-cells">${cellsHTML}</div>
      </div>
    `;
  }).join('');

  document.getElementById('heatmap').innerHTML = heatmapHTML;
}

// Render effort chart
function renderChart() {
  const goals = getGoals();
  const history = getHistory();

  const datasets = goals.map((goal, index) => {
    const goalHistory = history[goal.id] || [];
    const data = goalHistory.map(mode => MODES[mode].weight);

    const colors = ['#4a9e5c', '#378add', '#ba7517', '#d85a30', '#888780'];

    return {
      label: goal.name,
      data: data,
      borderColor: colors[index % colors.length],
      backgroundColor: colors[index % colors.length] + '33',
      tension: 0.4,
      pointRadius: 3
    };
  });

  const ctx = document.getElementById('effortChart');

  // Destroy existing chart if it exists
  if (window.effortChartInstance) {
    window.effortChartInstance.destroy();
  }

  window.effortChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: Array.from({ length: 14 }, (_, i) => `D${i + 1}`),
      datasets: datasets
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          position: 'top',
          labels: {
            boxWidth: 12,
            font: { size: 11 }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          max: 100,
          ticks: {
            callback: (value) => value + '%'
          }
        }
      }
    }
  });
}

// Render goal progress list
function renderGoalProgressList() {
  const goals = getGoals();
  const history = getHistory();

  const listHTML = goals.map(goal => {
    const goalHistory = history[goal.id] || [];

    // Calculate trend
    const recent3 = goalHistory.slice(-3);
    const first3 = goalHistory.slice(0, 3);

    const recentAvg = recent3.reduce((sum, mode) => sum + MODES[mode].weight, 0) / recent3.length;
    const firstAvg = first3.reduce((sum, mode) => sum + MODES[mode].weight, 0) / first3.length;

    const trending = recentAvg > firstAvg;

    // Calculate average effort
    const avgEffort = Math.round(
      goalHistory.reduce((sum, mode) => sum + MODES[mode].weight, 0) / goalHistory.length
    );

    return `
      <div class="goal-progress-item">
        <div class="goal-progress-header">
          <div class="goal-progress-name">${goal.name}</div>
          <div class="goal-progress-meta">
            <span class="trend-indicator ${trending ? 'trend-up' : 'trend-down'}">
              ${trending ? '↑ Trending up' : '↓ Needs push'}
            </span>
            <span>Avg effort: ${avgEffort}%</span>
          </div>
        </div>
        <div class="progress-bar">
          <div class="progress-fill" style="width: ${goal.progress}%;"></div>
        </div>
      </div>
    `;
  }).join('');

  document.getElementById('goalProgressList').innerHTML = listHTML;
}

// Render Reflect Tab
function renderReflectTab() {
  // Load saved reflections if any
  const reflections = JSON.parse(localStorage.getItem('jia_reflections') || '{}');
  document.getElementById('reflect1').value = reflections.q1 || '';
  document.getElementById('reflect2').value = reflections.q2 || '';
  document.getElementById('reflect3').value = reflections.q3 || '';
}

// Get AI feedback on reflections
async function getReflectionFeedback() {
  const answer1 = document.getElementById('reflect1').value.trim();
  const answer2 = document.getElementById('reflect2').value.trim();
  const answer3 = document.getElementById('reflect3').value.trim();

  if (!answer1 && !answer2 && !answer3) {
    alert('Please answer at least one reflection question.');
    return;
  }

  // Save reflections
  const reflections = { q1: answer1, q2: answer2, q3: answer3 };
  localStorage.setItem('jia_reflections', JSON.stringify(reflections));

  const btn = document.getElementById('getAiFeedback');
  const resultDiv = document.getElementById('aiFeedbackResult');

  btn.disabled = true;
  resultDiv.innerHTML = '<div class="spinner">Loading...</div>';
  resultDiv.classList.remove('hidden');

  const context = getGoalContext();
  const prompt = `
Reflection answers:
1. What made this week hard or easy? ${answer1}
2. Which goal deserves more attention? ${answer2}
3. New idea competing for focus? ${answer3}

Goal Context:
${context}

Provide honest, specific feedback in 3-4 sentences and one concrete recommendation.
  `.trim();

  try {
    const response = await callDeepSeekAPI([
      {
        role: 'user',
        content: prompt
      }
    ]);

    resultDiv.innerHTML = `<p>${response}</p>`;
  } catch (error) {
    resultDiv.innerHTML = `<p style="color: var(--mode-struggled);">Error: ${error.message}</p>`;
  } finally {
    btn.disabled = false;
  }
}

// Initialize chat with opening message
function initializeChat() {
  const messages = JSON.parse(localStorage.getItem('jia_chat_messages') || '[]');

  if (messages.length === 0) {
    const openingMessage = {
      role: 'ai',
      content: "Hey. I've been watching your patterns. CBT Platform is your strongest goal. But Fitness has been struggling — want to talk about why, or figure out if it still fits?"
    };
    messages.push(openingMessage);
    localStorage.setItem('jia_chat_messages', JSON.stringify(messages));
  }

  renderChatMessages();
}

// Render chat messages
function renderChatMessages() {
  const messages = JSON.parse(localStorage.getItem('jia_chat_messages') || '[]');
  const container = document.getElementById('chatMessages');

  container.innerHTML = messages.map(msg => {
    const verdictMatch = msg.content.match(/\b(STICK|ADJUST|DROP|PURSUE|PARK|REPLACE)\b/);
    let verdictHTML = '';

    if (verdictMatch && msg.role === 'ai') {
      const verdict = verdictMatch[1].toLowerCase();
      verdictHTML = `<div class="verdict-box verdict-${verdict}">${verdictMatch[1]}</div>`;
    }

    return `
      <div class="chat-message ${msg.role}">
        <div class="message-bubble">
          ${msg.content}
          ${verdictHTML}
        </div>
      </div>
    `;
  }).join('');

  container.scrollTop = container.scrollHeight;
}

// Send chat message
async function sendChatMessage() {
  const input = document.getElementById('chatInput');
  const message = input.value.trim();

  if (!message) return;

  const sendBtn = document.getElementById('chatSend');
  sendBtn.disabled = true;

  // Add user message
  const messages = JSON.parse(localStorage.getItem('jia_chat_messages') || '[]');
  messages.push({ role: 'user', content: message });
  localStorage.setItem('jia_chat_messages', JSON.stringify(messages));

  input.value = '';
  renderChatMessages();

  // Get AI response
  try {
    const context = getGoalContext();
    const systemPrompt = `You are JIA, a sharp and direct AI goal accountability partner. You know the user's goals, their progress, and their recent check-in patterns. Be honest, not a cheerleader. Keep responses to 3-4 sentences max. For any decision about a goal end with STICK, ADJUST, or DROP in caps. For evaluating new ideas end with PURSUE, PARK, or REPLACE in caps.

Goal Context:
${context}`;

    const conversationHistory = messages.slice(-6).map(m => ({
      role: m.role === 'ai' ? 'assistant' : 'user',
      content: m.content
    }));

    const response = await callDeepSeekAPI([
      { role: 'system', content: systemPrompt },
      ...conversationHistory
    ]);

    messages.push({ role: 'ai', content: response });
    localStorage.setItem('jia_chat_messages', JSON.stringify(messages));
    renderChatMessages();
  } catch (error) {
    messages.push({
      role: 'ai',
      content: `Error: ${error.message}. Please check your API key.`
    });
    localStorage.setItem('jia_chat_messages', JSON.stringify(messages));
    renderChatMessages();
  } finally {
    sendBtn.disabled = false;
  }
}

// Call DeepSeek API
async function callDeepSeekAPI(messages) {
  if (DEEPSEEK_API_KEY === 'PASTE_YOUR_KEY_HERE') {
    throw new Error('Please set your DeepSeek API key in app.js');
  }

  const response = await fetch(DEEPSEEK_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: messages,
      temperature: 0.7
    })
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.statusText}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

// Get goal context for AI
function getGoalContext() {
  const goals = getGoals();
  const history = getHistory();

  return goals.map(goal => {
    const goalHistory = history[goal.id] || [];
    const last7 = goalHistory.slice(-7);

    return `
Goal: ${goal.name}
Progress: ${goal.progress}%
Timeframe: ${goal.timeframe}
Importance: ${goal.importance}
Why: ${goal.why}
Last 7 days: ${last7.join(', ')}
    `.trim();
  }).join('\n\n');
}

// Helper functions for localStorage
function getGoals() {
  return JSON.parse(localStorage.getItem('jia_goals') || '[]');
}

function getCheckins() {
  return JSON.parse(localStorage.getItem('jia_checkins') || '{}');
}

function getHistory() {
  return JSON.parse(localStorage.getItem('jia_history') || '{}');
}

function getTodayString() {
  const today = new Date();
  return today.toISOString().split('T')[0];
}
