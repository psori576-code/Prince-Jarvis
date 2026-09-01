import { Router, type IRouter } from "express";

const router: IRouter = Router();

const SYSTEM_PROMPT =
  "You are Prince Jarvis, a helpful, concise Hindi-English personal AI assistant. Never expose secrets. For device actions, return a clear intent rather than pretending the action was executed.";

router.post("/chat", async (req, res) => {
  const message = typeof req.body?.message === "string" ? req.body.message.trim() : "";
  if (!message || message.length > 4000) {
    res.status(400).json({ error: "message must be 1-4000 characters" });
    return;
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    res.status(503).json({ error: "AI service is not configured on the server" });
    return;
  }

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL ?? "gpt-5-mini",
        instructions: SYSTEM_PROMPT,
        input: message,
      }),
    });

    if (!response.ok) {
      res.status(502).json({ error: "AI provider request failed" });
      return;
    }

    const data = (await response.json()) as { output_text?: string };
    res.json({ ok: true, reply: data.output_text ?? "I couldn't generate a response." });
  } catch {
    res.status(502).json({ error: "AI service temporarily unavailable" });
  }
});

export default router;
