import { Hono } from "hono";

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

export const aiRouter = new Hono();

// POST /api/ai/ask
aiRouter.post("/ask", async (c) => {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return c.json({ error: "GROQ_API_KEY not configured on server" }, 503);

  const body = await c.req.json<{
    question?: string;
    brand?: string;
    model?: string;
    year?: number;
    odometer?: number;
    overdueItems?: string[];
    dueSoonItems?: string[];
  }>();

  const {
    question,
    brand = "Unknown",
    model = "Unknown",
    year = 2020,
    odometer = 0,
    overdueItems = [],
    dueSoonItems = [],
  } = body;
  if (!question?.trim()) return c.json({ error: "question is required" }, 400);

  const systemPrompt = [
    `You are a motorcycle mechanic AI for a ${year} ${brand} ${model} with ${odometer.toLocaleString()} km.`,
    overdueItems.length ? `OVERDUE maintenance: ${overdueItems.join(", ")}.` : "No overdue maintenance.",
    dueSoonItems.length ? `Due soon: ${dueSoonItems.join(", ")}.` : "",
    "Reply in plain text. Be concise (under 200 words). Use numbered steps for procedures. Be practical.",
  ].filter(Boolean).join(" ");

  const response = await fetch(GROQ_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "llama-3.1-8b-instant",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: question },
      ],
      max_tokens: 350,
      temperature: 0.6,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    return c.json({ error: `Groq error: ${errText}` }, 502);
  }

  const result = await response.json() as {
    choices?: { message?: { content?: string } }[];
  };
  const answer =
    result.choices?.[0]?.message?.content ??
    "Unable to generate a response. Please try again.";

  return c.json({ answer });
});
