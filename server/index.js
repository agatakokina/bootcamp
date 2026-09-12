import express from "express";
import cors from "cors";
import testCasesRouter from "./test-cases.js";
import testSuitesRouter from "./test-suites.js";
import bugsRouter from "./bugs.js";

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

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
