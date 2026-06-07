import express from "express";
import cors from "cors";
import authRouter from "./routes/auth";
import clientsRouter from "./routes/clients";
import categoriesRouter from "./routes/categories";
import employeesRouter from "./routes/employees";
import templatesRouter from "./routes/templates";
import ticketsRouter from "./routes/tickets";
import recurringRouter from "./routes/recurring";
import analyticsRouter from "./routes/analytics";
import cronRouter from "./routes/cron";
import { errorHandler } from "./middleware/error";

const app = express();
const PORT = process.env.PORT ?? 4000;
const FRONTEND_URL = process.env.FRONTEND_URL ?? "http://localhost:3000";

app.use(cors({ origin: FRONTEND_URL, credentials: true }));
app.use(express.json());

app.get("/health", (_req, res) => res.json({ ok: true }));

app.use("/api/auth",       authRouter);
app.use("/api/clients",    clientsRouter);
app.use("/api/categories", categoriesRouter);
app.use("/api/employees",  employeesRouter);
app.use("/api/templates",  templatesRouter);
app.use("/api/tickets",    ticketsRouter);
app.use("/api/recurring",  recurringRouter);
app.use("/api/analytics",  analyticsRouter);
app.use("/api/cron",       cronRouter);

app.use(errorHandler);

app.listen(PORT, () => console.log(`[backend] Running on http://localhost:${PORT}`));
