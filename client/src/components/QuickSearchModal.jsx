import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchTestCases } from "../api/test-cases.js";
import { fetchBugs } from "../api/bugs.js";
import { fetchSuites } from "../api/test-suites.js";

const RESULTS_PER_TYPE = 5;
const DEBOUNCE_MS = 200;

function QuickSearchModal({ onClose }) {
  const navigate = useNavigate();
  const inputRef = useRef(null);
  const allSuitesRef = useRef(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setResults([]);
      setActiveIndex(0);
      setLoading(false);
      return undefined;
    }

    let cancelled = false;
    setLoading(true);

    const timer = setTimeout(() => {
      Promise.all([
        fetchTestCases({ page: 1, pageSize: RESULTS_PER_TYPE, search: trimmed, sortBy: "updated_at", sortDir: "desc" }),
        fetchBugs({ page: 1, pageSize: RESULTS_PER_TYPE, search: trimmed, sortBy: "updated_at", sortDir: "desc" }),
        allSuitesRef.current ? Promise.resolve(allSuitesRef.current) : fetchSuites(),
      ])
        .then(([testCasesData, bugsData, suites]) => {
          if (cancelled) return;
          allSuitesRef.current = suites;

          const lowerQuery = trimmed.toLowerCase();
          const matchedSuites = suites.filter((s) => s.name.toLowerCase().includes(lowerQuery)).slice(0, RESULTS_PER_TYPE);

          const combined = [
            ...testCasesData.items.map((tc) => ({
              type: "Test Case",
              id: tc.id,
              title: tc.title,
              meta: tc.severity,
              testCase: tc,
            })),
            ...bugsData.items.map((b) => ({
              type: "Bug",
              id: b.id,
              title: b.title,
              meta: b.severity,
            })),
            ...matchedSuites.map((s) => ({
              type: "Test Suite",
              id: s.id,
              title: s.name,
              meta: s.feature,
            })),
          ];

          setResults(combined);
          setActiveIndex(0);
        })
        .catch(() => {
          if (!cancelled) setResults([]);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  function selectResult(result) {
    if (!result) return;
    onClose();
    if (result.type === "Bug") {
      navigate(`/bugs/${result.id}`);
    } else if (result.type === "Test Suite") {
      navigate(`/test-suites/${result.id}`);
    } else if (result.type === "Test Case") {
      navigate("/test-cases", { state: { openTestCase: result.testCase } });
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      selectResult(results[activeIndex]);
    }
  }

  const activeResult = results[activeIndex];
  const activeOptionId = activeResult ? `quick-search-option-${activeResult.type}-${activeResult.id}` : undefined;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal quick-search-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Quick search"
        onClick={(e) => e.stopPropagation()}
      >
        <input
          ref={inputRef}
          type="text"
          className="quick-search-input"
          role="combobox"
          aria-label="Search test cases, bugs, and suites"
          aria-expanded={Boolean(query.trim())}
          aria-controls="quick-search-listbox"
          aria-autocomplete="list"
          aria-activedescendant={activeOptionId}
          placeholder="Search test cases, bugs, and suites..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        {query.trim() && (
          <ul className="quick-search-results" id="quick-search-listbox" role="listbox">
            {results.length === 0 && !loading && <li className="quick-search-empty">No results found.</li>}
            {results.map((result, index) => (
              <li
                key={`${result.type}-${result.id}`}
                id={`quick-search-option-${result.type}-${result.id}`}
                role="option"
                aria-selected={index === activeIndex}
                className={`quick-search-result${index === activeIndex ? " active" : ""}`}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => selectResult(result)}
              >
                <span className="quick-search-result-type">{result.type}</span>
                <span className="quick-search-result-title">{result.title}</span>
                {result.meta && <span className="quick-search-result-meta">{result.meta}</span>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default QuickSearchModal;
