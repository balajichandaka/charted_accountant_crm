import express from "express";
import cors from "cors";
import { randomUUID } from "crypto";
import { pinoHttp } from "pino-http";
import { logger } from "./lib/logger";
import authRouter from "./routes/auth";
import clientsRouter from "./routes/clients";
import categoriesRouter from "./routes/categories";
import employeesRouter from "./routes/employees";
import templatesRouter from "./routes/templates";
import ticketsRouter from "./routes/tickets";
import recurringRouter from "./routes/recurring";
import analyticsRouter from "./routes/analytics";
import timesheetRouter from "./routes/timesheet";
import attachmentsRouter from "./routes/attachments";
import cronRouter from "./routes/cron";
import platformRouter from "./routes/platform";
import firmRouter from "./routes/firm";
import { errorHandler } from "./middleware/error";

const app = express();
const PORT = process.env.PORT ?? 4000;
const corsOrigins = (process.env.FRONTEND_URL ?? "http://localhost:3000")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(cors({ origin: corsOrigins, credentials: true }));
app.use(express.json());

// Structured request logging with a per-request correlation id (also returned as
// the x-request-id header). Attaches a child logger at req.log for handlers.
app.use(
  pinoHttp({
    logger,
    genReqId: (req, res) => {
      const existing = req.headers["x-request-id"];
      const id = (Array.isArray(existing) ? existing[0] : existing) || randomUUID();
      res.setHeader("x-request-id", id);
      return id;
    },
    customLogLevel: (_req, res, err) => {
      if (err || res.statusCode >= 500) return "error";
      if (res.statusCode >= 400) return "warn";
      return "info";
    },
  })
);

app.get("/health", (_req, res) => res.json({ ok: true }));

app.use("/api/auth",       authRouter);
app.use("/api/clients",    clientsRouter);
app.use("/api/categories", categoriesRouter);
app.use("/api/employees",  employeesRouter);
app.use("/api/templates",  templatesRouter);
app.use("/api/tickets",    ticketsRouter);
app.use("/api/recurring",  recurringRouter);
app.use("/api/analytics",  analyticsRouter);
app.use("/api/timesheet",  timesheetRouter);
app.use("/api/attachments", attachmentsRouter);
app.use("/api/cron",       cronRouter);
app.use("/api/platform",   platformRouter);
app.use("/api/firm",       firmRouter);

app.use(errorHandler);

app.listen(PORT, () => logger.info({ port: PORT }, "backend started"));

// Last-resort handlers so crashes are logged instead of vanishing.
process.on("unhandledRejection", (reason) => {
  logger.error({ err: reason }, "unhandledRejection");
});
process.on("uncaughtException", (err) => {
  logger.fatal({ err }, "uncaughtException");
  process.exit(1);
});
