// Minimal structured (JSON) logger for server-side code (server actions, route
// handlers, lib). Zero-dependency on purpose: pino's worker-thread transports are
// unreliable under the Next.js bundler, and we want logs that always reach stdout
// (and therefore `docker compose logs`). Never import this into a client component.

type Level = "debug" | "info" | "warn" | "error";
const ORDER: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 };

const MIN = ORDER[(process.env.LOG_LEVEL as Level) ?? "info"] ?? ORDER.info;
const SERVICE = "ca-frontend";
const REDACT = new Set(["password", "token", "passwordHash", "smtpPass", "backendToken"]);

function sanitize(ctx: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(ctx)) {
    if (REDACT.has(k)) out[k] = "[Redacted]";
    else if (v instanceof Error) out[k] = { message: v.message, stack: v.stack, name: v.name };
    else out[k] = v;
  }
  return out;
}

function emit(level: Level, msg: string, ctx?: Record<string, unknown>) {
  if (ORDER[level] < MIN) return;
  const line = JSON.stringify({
    level,
    time: new Date().toISOString(),
    service: SERVICE,
    msg,
    ...(ctx ? sanitize(ctx) : {}),
  });
  (level === "error" ? console.error : level === "warn" ? console.warn : console.log)(line);
}

export const logger = {
  debug: (msg: string, ctx?: Record<string, unknown>) => emit("debug", msg, ctx),
  info: (msg: string, ctx?: Record<string, unknown>) => emit("info", msg, ctx),
  warn: (msg: string, ctx?: Record<string, unknown>) => emit("warn", msg, ctx),
  error: (msg: string, ctx?: Record<string, unknown>) => emit("error", msg, ctx),
};
