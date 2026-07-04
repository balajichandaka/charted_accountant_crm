import pino from "pino";

// Central structured logger for the API service.
// - Level from LOG_LEVEL (default "info"); set "debug" to trace request internals.
// - Dev: human-readable via pino-pretty. Prod: raw JSON to stdout (aggregator-ready).
// - Secrets are redacted so passwords/tokens/auth headers never reach the logs.

const isProd = process.env.NODE_ENV === "production";

export const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  base: { service: "ca-backend" },
  timestamp: pino.stdTimeFunctions.isoTime,
  redact: {
    paths: [
      "req.headers.authorization",
      "req.headers.cookie",
      "*.password",
      "*.passwordHash",
      "*.smtpPass",
      "*.token",
      "*.backendToken",
      "password",
      "passwordHash",
      "smtpPass",
      "token",
    ],
    censor: "[Redacted]",
  },
  ...(isProd
    ? {}
    : {
        transport: {
          target: "pino-pretty",
          options: { colorize: true, translateTime: "SYS:standard", ignore: "pid,hostname,service" },
        },
      }),
});
