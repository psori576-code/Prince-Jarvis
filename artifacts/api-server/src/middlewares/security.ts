import type { Request, Response, NextFunction } from "express";

const WINDOW_MS = 60_000;
const MAX_REQUESTS = 60;
const hits = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(req: Request, res: Response, next: NextFunction) {
  const now = Date.now();
  const key = req.ip || "unknown";
  const current = hits.get(key);

  if (!current || current.resetAt <= now) {
    hits.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return next();
  }

  current.count += 1;
  if (current.count > MAX_REQUESTS) {
    res.status(429).json({ error: "Too many requests. Try again shortly." });
    return;
  }
  next();
}

export function requireServerToken(req: Request, res: Response, next: NextFunction) {
  const expected = process.env.PRINCE_JARVIS_SERVER_TOKEN;
  if (!expected) {
    res.status(503).json({ error: "Server authentication is not configured." });
    return;
  }

  const supplied = req.header("authorization")?.replace(/^Bearer\s+/i, "");
  if (!supplied || supplied !== expected) {
    res.status(401).json({ error: "Unauthorized." });
    return;
  }
  next();
}
