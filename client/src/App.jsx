import { useEffect, useState } from "react";
import { Link, Route, Routes } from "react-router-dom";
import TestCasesPage from "./pages/TestCasesPage.jsx";
import TestCasesImportPage from "./pages/TestCasesImportPage.jsx";
import TestSuitesPage from "./pages/TestSuitesPage.jsx";
import TestSuiteDetailPage from "./pages/TestSuiteDetailPage.jsx";
import BugsPage from "./pages/BugsPage.jsx";
import BugDetailPage from "./pages/BugDetailPage.jsx";
import TestRunsPage from "./pages/TestRunsPage.jsx";
import TestRunDetailPage from "./pages/TestRunDetailPage.jsx";
import DashboardPage from "./pages/DashboardPage.jsx";
import ReportsPage from "./pages/ReportsPage.jsx";
import ReportDetailPage from "./pages/ReportDetailPage.jsx";
import SettingsPage from "./pages/SettingsPage.jsx";
import KeyboardShortcuts from "./components/KeyboardShortcuts.jsx";
import NavBar from "./components/NavBar.jsx";

function Home() {
  const [status, setStatus] = useState("checking...");

  useEffect(() => {
    fetch("/api/health")
      .then((res) => res.json())
      .then((data) => setStatus(data.status))
      .catch(() => setStatus("server unreachable"));
  }, []);

  return (
    <main className="page">
      <h1>Bootcamp App</h1>
      <p>Server status: {status}</p>
      <p>
        <Link to="/dashboard">Go to Dashboard →</Link>
      </p>
      <p>
        <Link to="/test-cases">Go to Test Cases →</Link>
      </p>
      <p>
        <Link to="/test-suites">Go to Test Suites →</Link>
      </p>
      <p>
        <Link to="/bugs">Go to Bugs →</Link>
      </p>
      <p>
        <Link to="/test-runs">Go to Test Runs →</Link>
      </p>
      <p>
        <Link to="/reports">Go to Reports →</Link>
      </p>
      <p>
        <Link to="/settings">Go to Settings →</Link>
      </p>
    </main>
  );
}

function App() {
  return (
    <>
      <KeyboardShortcuts />
      <NavBar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/test-cases" element={<TestCasesPage />} />
        <Route path="/test-cases/import" element={<TestCasesImportPage />} />
        <Route path="/test-suites" element={<TestSuitesPage />} />
        <Route path="/test-suites/:id" element={<TestSuiteDetailPage />} />
        <Route path="/bugs" element={<BugsPage />} />
        <Route path="/bugs/:id" element={<BugDetailPage />} />
        <Route path="/test-runs" element={<TestRunsPage />} />
        <Route path="/test-runs/:id" element={<TestRunDetailPage />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/reports/:id" element={<ReportDetailPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Routes>
    </>
  );
}

export default App;
