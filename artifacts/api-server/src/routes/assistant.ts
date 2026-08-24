import { Router, type IRouter } from "express";
import OpenAI, { toFile } from "openai";
import { logger } from "../lib/logger";

const router: IRouter = Router();

function getClient() {
  const key = process.env.OPENAI_API_KEY;
  return key ? new OpenAI({ apiKey: key }) : null;
}

router.post("/assistant/chat", async (req, res) => {
  const content = typeof req.body?.content === "string" ? req.body.content.trim() : "";
  if (!content) {
    res.status(400).json({ error: "Message content is required." });
    return;
  }

  const client = getClient();
  if (!client) {
    res.status(503).json({ error: "AI service is not configured." });
    return;
  }

  try {
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 700,
      messages: [
        {
          role: "system",
          content:
            "You are Prince Jarvis, a warm, concise personal AI assistant. Reply naturally in the language the user uses, including Hindi and Hinglish. Be helpful and clear.",
        },
        { role: "user", content },
      ],
    });
    res.json({ content: response.choices[0]?.message?.content ?? "I’m ready to help." });
  } catch (error) {
    logger.error({ err: error }, "OpenAI chat request failed");
    res.status(502).json({ error: "Prince Jarvis could not reach the AI service." });
  }
});

router.post("/assistant/transcribe", async (req, res) => {
  const audio = typeof req.body?.audio === "string" ? req.body.audio : "";
  if (!audio) {
    res.status(400).json({ error: "Base64 audio is required." });
    return;
  }

  const client = getClient();
  if (!client) {
    res.status(503).json({ error: "AI service is not configured." });
    return;
  }

  try {
    const buffer = Buffer.from(audio, "base64");
    const file = await toFile(buffer, "prince-jarvis-audio.m4a", { type: "audio/mp4" });
    const result = await client.audio.transcriptions.create({
      file,
      model: "gpt-4o-mini-transcribe",
      response_format: "json",
    });
    res.json({ text: result.text });
  } catch (error) {
    logger.error({ err: error }, "OpenAI transcription request failed");
    res.status(502).json({ error: "Prince Jarvis could not transcribe that recording." });
  }
});

export default router;