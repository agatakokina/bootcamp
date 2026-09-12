import SeverityBadge from "./SeverityBadge.jsx";
import TestTypeBadge from "./TestTypeBadge.jsx";
import { stripLeadingNumber } from "../utils/text.js";

function capitalize(word) {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

function TestCaseDetailsModal({ testCase, onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>{testCase.title}</h2>

        <dl className="details-grid">
          <dt>Severity</dt>
          <dd>
            <SeverityBadge severity={testCase.severity} />
          </dd>

          <dt>Status</dt>
          <dd>{capitalize(testCase.status)}</dd>

          <dt>Test Type</dt>
          <dd>
            <TestTypeBadge testType={testCase.test_type} />
          </dd>

          <dt>Updated</dt>
          <dd>{new Date(testCase.updated_at).toLocaleString()}</dd>
        </dl>

        {testCase.preconditions && (
          <section className="details-section">
            <h3>Preconditions</h3>
            <p>{testCase.preconditions}</p>
          </section>
        )}

        <section className="details-section">
          <h3>Steps</h3>
          <ol>
            {testCase.steps.map((step, i) => (
              <li key={i}>{stripLeadingNumber(step)}</li>
            ))}
          </ol>
        </section>

        <section className="details-section">
          <h3>Expected Result</h3>
          <p>{testCase.expected_result}</p>
        </section>

        <div className="modal-actions">
          <button type="button" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default TestCaseDetailsModal;
