
export async function handler(event) {
  console.log("Incoming event:", event.body);

  try {
    if (event.httpMethod !== "POST") {
      return {
        statusCode: 405,
        body: JSON.stringify({ error: "Method not allowed" }),
      };
    }

    const body = JSON.parse(event.body || "{}");
    const messages = body.messages;
    if (!messages) {
      console.log("Missing messages");
      return { statusCode: 400, body: JSON.stringify({ error: "messages missing" }) };
    }

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages,
        temperature: 0.7,
      }),
    });

    const text = await response.text();
    console.log("Raw Groq response:", text);

    let data;
    try {
      data = JSON.parse(text);
    } catch (err) {
      console.log("JSON parse error:", err);
      return { statusCode: 500, body: JSON.stringify({ error: "Invalid JSON from Groq", raw: text }) };
    }

    console.log("Returning data:", data);
    return { statusCode: 200, body: JSON.stringify(data) };
  } catch (err) {
    console.log("Function error:", err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
}
