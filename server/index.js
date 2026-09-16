import express from "express";
import cors from "cors";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import testCasesRouter from "./test-cases.js";
import testSuitesRouter from "./test-suites.js";
import bugsRouter from "./bugs.js";
import testRunsRouter from "./test-runs.js";
import dashboardRouter from "./routes/dashboard.js";
import reportsRouter from "./reports.js";
import settingsRouter from "./settings.js";
import flakyTestsRouter from "./flaky-tests.js";

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && "body" in err) {
    return res.status(400).json({ success: false, data: null, error: "Invalid JSON body." });
  }
  next(err);
});

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/test-cases", testCasesRouter);
app.use("/api/test-suites", testSuitesRouter);
app.use("/api/bugs", bugsRouter);
app.use("/api/test-runs", testRunsRouter);
app.use("/api/dashboard", dashboardRouter);
app.use("/api/reports", reportsRouter);
app.use("/api/settings", settingsRouter);
app.use("/api/flaky-tests", flakyTestsRouter);

// Serve the built client (npm run build -w client) if it exists, so a single
// process can serve both the API and the frontend in production. In local
// dev no build has been run, so this stays a no-op and Vite's own dev
// server (port 5173) keeps handling the frontend exactly as before.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const clientDist = path.join(__dirname, "../client/dist");

if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get(/^(?!\/api\/).*/, (req, res) => {
    res.sendFile(path.join(clientDist, "index.html"));
  });
}

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
