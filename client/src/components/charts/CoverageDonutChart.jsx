import { useState } from "react";
import ChartTooltip from "./ChartTooltip.jsx";

const SIZE = 200;
const CENTER = SIZE / 2;
const RADIUS = 70;
const STROKE_WIDTH = 28;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const STATUS_COLORS = {
  draft: "#94a3b8",
  ready: "#6366f1",
  passed: "#10b981",
  failed: "#ef4444",
  skipped: "#f59e0b",
};
const CARD_ACCENT = "#10b981";

function capitalize(word) {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

function CoverageDonutChart({ data }) {
  const [hoverStatus, setHoverStatus] = useState(null);
  const total = data.reduce((sum, d) => sum + d.count, 0);

  if (total === 0) {
    return (
      <div className="chart-card" style={{ "--chart-accent": CARD_ACCENT }}>
        <h3 className="chart-title">Test Coverage by Status</h3>
        <p className="chart-subtitle">All test cases</p>
        <p className="chart-empty">No test cases yet.</p>
      </div>
    );
  }

  let cumulative = 0;
  const segments = data.map((d) => {
    const fraction = d.count / total;
    const segmentLength = fraction * CIRCUMFERENCE;
    const gap = d.count === 0 ? 0 : Math.min(3, segmentLength * 0.2);
    const visibleLength = Math.max(segmentLength - gap, 0);
    const offset = cumulative + gap / 2;
    const midAngle = ((cumulative + segmentLength / 2) / CIRCUMFERENCE) * 2 * Math.PI - Math.PI / 2;
    cumulative += segmentLength;
    return {
      ...d,
      percentage: Math.round(fraction * 1000) / 10,
      color: STATUS_COLORS[d.status],
      dasharray: `${visibleLength} ${CIRCUMFERENCE - visibleLength}`,
      dashoffset: -offset,
      midAngle,
    };
  });

  const hovered = segments.find((s) => s.status === hoverStatus);

  return (
    <div className="chart-card" style={{ "--chart-accent": CARD_ACCENT }}>
      <h3 className="chart-title">Test Coverage by Status</h3>
      <p className="chart-subtitle">All test cases</p>
      <div className="donut-layout">
        <div className="chart-wrap">
          <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="chart-svg donut-svg" role="img" aria-label="Test coverage by status">
            <g transform={`rotate(-90 ${CENTER} ${CENTER})`}>
              {segments.map((s) => (
                <circle
                  key={s.status}
                  cx={CENTER}
                  cy={CENTER}
                  r={RADIUS}
                  fill="none"
                  stroke={s.color}
                  strokeWidth={hoverStatus === s.status ? STROKE_WIDTH + 4 : STROKE_WIDTH}
                  strokeDasharray={s.dasharray}
                  strokeDashoffset={s.dashoffset}
                  pointerEvents="stroke"
                  className="chart-donut-segment"
                  tabIndex={0}
                  onPointerEnter={() => setHoverStatus(s.status)}
                  onPointerLeave={() => setHoverStatus(null)}
                  onFocus={() => setHoverStatus(s.status)}
                  onBlur={() => setHoverStatus(null)}
                />
              ))}
            </g>
            <text x={CENTER} y={CENTER - 4} textAnchor="middle" className="donut-center-value">
              {total}
            </text>
            <text x={CENTER} y={CENTER + 14} textAnchor="middle" className="donut-center-label">
              test cases
            </text>
          </svg>

          {hovered &&
            (() => {
              const tipRadius = RADIUS + STROKE_WIDTH / 2;
              const tipX = CENTER + tipRadius * Math.cos(hovered.midAngle);
              const tipY = CENTER + tipRadius * Math.sin(hovered.midAngle);
              return (
                <ChartTooltip xPct={(tipX / SIZE) * 100} yPct={(tipY / SIZE) * 100}>
                  <span className="chart-tooltip-value">{hovered.count}</span>
                  <span className="chart-tooltip-label">
                    {capitalize(hovered.status)} ({hovered.percentage}%)
                  </span>
                </ChartTooltip>
              );
            })()}
        </div>

        <ul className="chart-legend chart-legend-vertical">
          {segments.map((s) => (
            <li
              key={s.status}
              className={`chart-legend-item${hoverStatus === s.status ? " active" : ""}`}
              onPointerEnter={() => setHoverStatus(s.status)}
              onPointerLeave={() => setHoverStatus(null)}
            >
              <span className="chart-legend-swatch dot" style={{ backgroundColor: s.color }} />
              <span className="chart-legend-name">{capitalize(s.status)}</span>
              <span className="chart-legend-value">
                {s.count} ({s.percentage}%)
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default CoverageDonutChart;
