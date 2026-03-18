# JIA.

### _just f'in do it already_

An AI-powered goal accountability manager. Set your goals, track your effort, reflect weekly, and get honest feedback from an AI advisor that actually knows your patterns.

---

## Features

- **Check-in** — Add up to 5 goals with timeframe, importance level, and a "why it matters" note. Log daily effort on each goal.
- **Progress** — Visualize your consistency with an effort heatmap, daily trend chart (Chart.js), and a per-goal overview.
- **Reflect** — Answer three weekly reflection prompts and get AI-generated feedback on your answers.
- **AI Advisor** — Chat with JIA, an AI that has context on all your goals and progress patterns. Powered by Groq (`llama-3.3-70b-versatile`) via a Netlify serverless function.
- **Profile** — Give JIA personal context (your background, challenges, support style) to make advice more relevant.
- **Sync** — Export your goals and progress as a JSON file, or import from a previous export.

---

## Tech Stack

| Layer               | Tech                                 |
| ------------------- | ------------------------------------ |
| Frontend            | Vanilla HTML, CSS, JavaScript        |
| Charts              | Chart.js                             |
| AI chat layer       | Groq API (`llama-3.3-70b-versatile`) |
| Backend / API proxy | Netlify Functions (serverless)       |
| Deployment          | Netlify                              |
| Data persistence    | localStorage                         |

---

## Project Structure

```
jia.now/
├── index.html              # Main app shell (all tabs)
├── docs.html               # Documentation page
├── netlify.toml            # Netlify config & function routing
├── favicon.svg
├── styles/
│   ├── style.css
│   └── footer.css
├── scripts/
│   ├── utils.js
│   ├── goals.js
│   ├── progress.js
│   ├── profile.js
│   ├── chat.js
│   ├── sync.js
│   └── main.js
└── netlify/
    └── functions/
        └── groq.js             # Serverless proxy for Groq API
```

---

## Getting Started

### Prerequisites

- A [Netlify](https://netlify.com) account
- A [DeepSeek API](https://platform.deepseek.com) key

### Local Development

1. **Clone the repo**

   ```bash
   git clone https://github.com/HassanAmirii/jia.now.git
   cd jia.now
   ```

2. **Install Netlify CLI**

   ```bash
   npm install -g netlify-cli
   ```

3. **Set up environment variables**

   Create a `.env` file at the root (use `.env.example` as a reference):

   ```
   GROQ_API_KEY=your_api_key_here
   ```

4. **Run locally**

   ```bash
   netlify dev
   ```

   This starts the app and the Netlify Functions together at `http://localhost:8888`.

### Deploying to Netlify

1. Push to GitHub.
2. Connect the repo on [netlify.com](https://netlify.com).
3. Add `GROQ_API_KEY` as an environment variable in **Site Settings → Environment Variables**.
4. Deploy.

---

## Environment Variables

| Variable       | Description                                                                                                 |
| -------------- | ----------------------------------------------------------------------------------------------------------- |
| `GROQ_API_KEY` | Your Groq API key. Used by `netlify/functions/groq.js` to proxy chat requests. Never exposed to the client. |

---

## Data & Privacy

All goal data is stored in your browser's `localStorage` — nothing is sent to any server except the AI chat messages (which go through the Netlify function to Groq). Clearing your browser data will erase your goals and progress. Use the **Sync → Export** feature to back up your data.

---

## License

MIT
