import { useEffect, useState } from "react";
import { Link, Route, Routes } from "react-router-dom";
import TestCasesPage from "./pages/TestCasesPage.jsx";
import TestSuitesPage from "./pages/TestSuitesPage.jsx";
import TestSuiteDetailPage from "./pages/TestSuiteDetailPage.jsx";
import BugsPage from "./pages/BugsPage.jsx";
import BugDetailPage from "./pages/BugDetailPage.jsx";

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
        <Link to="/test-cases">Go to Test Cases →</Link>
      </p>
      <p>
        <Link to="/test-suites">Go to Test Suites →</Link>
      </p>
      <p>
        <Link to="/bugs">Go to Bugs →</Link>
      </p>
    </main>
  );
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/test-cases" element={<TestCasesPage />} />
      <Route path="/test-suites" element={<TestSuitesPage />} />
      <Route path="/test-suites/:id" element={<TestSuiteDetailPage />} />
      <Route path="/bugs" element={<BugsPage />} />
      <Route path="/bugs/:id" element={<BugDetailPage />} />
    </Routes>
  );
}

export default App;
