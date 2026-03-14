
export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const messages = body?.messages;
    if (!messages) return res.status(400).json({ error: "messages missing" });

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages,
        temperature: 0.7
      })
    });

    const text = await response.text();
    let data;
    try { data = JSON.parse(text); } catch (e) {
      return res.status(500).json({ error: "Invalid JSON from Groq", raw: text });
    }

    if (!response.ok) return res.status(response.status).json(data);

    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
