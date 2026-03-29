// netlify/functions/groq.js

export async function handler(event) {
  try {
    if (event.httpMethod !== "POST") {
      return {
        statusCode: 405,
        body: JSON.stringify({ error: "Method not allowed" }),
      };
    }

    let body = {};
    try {
      body = JSON.parse(event.body || "{}");
    } catch {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Invalid JSON body" }),
      };
    }

    const messages = body.messages;
    if (!Array.isArray(messages) || !messages.length) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "messages missing" }),
      };
    }

    if (!process.env.GROQ_API_KEY) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "GROQ_API_KEY is not configured" }),
      };
    }

    let response;
    try {
      response = await fetch(
        "https://api.groq.com/openai/v1/chat/completions",
        {
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
        },
      );
    } catch {
      return {
        statusCode: 502,
        body: JSON.stringify({ error: "Failed to reach Groq API" }),
      };
    }

    const text = await response.text();
    let data = {};

    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        return {
          statusCode: 502,
          body: JSON.stringify({
            error: "Invalid JSON from Groq",
            upstreamStatus: response.status,
          }),
        };
      }
    }

    if (!response.ok) {
      return {
        statusCode: response.status,
        body: JSON.stringify({
          error:
            data.error?.message ||
            data.error ||
            `Groq API request failed (${response.status})`,
        }),
      };
    }

    if (!data.choices || !data.choices.length) {
      return {
        statusCode: 502,
        body: JSON.stringify({ error: "Groq returned empty choices" }),
      };
    }

    return { statusCode: 200, body: JSON.stringify(data) };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: error.message || "Unexpected server error",
      }),
    };
  }
}
