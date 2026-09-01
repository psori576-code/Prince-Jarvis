import { Router, type IRouter } from "express";
import { requireServerToken } from "../middlewares/security";

const router: IRouter = Router();

type CommandAction = "open_app" | "web_search" | "say" | "unknown";

function parseCommand(input: string): { action: CommandAction; value?: string } {
  const text = input.trim();
  const lower = text.toLowerCase();

  if (lower.startsWith("open ")) return { action: "open_app", value: text.slice(5).trim() };
  if (lower.startsWith("search ")) return { action: "web_search", value: text.slice(7).trim() };
  if (lower.startsWith("say ")) return { action: "say", value: text.slice(4).trim() };
  return { action: "unknown" };
}

router.post("/commands", requireServerToken, (req, res) => {
  const command = typeof req.body?.command === "string" ? req.body.command : "";
  if (!command || command.length > 500) {
    res.status(400).json({ error: "command must be a non-empty string up to 500 characters" });
    return;
  }

  const result = parseCommand(command);
  res.json({ ok: true, command, ...result, executable: result.action !== "unknown" });
});

export default router;
