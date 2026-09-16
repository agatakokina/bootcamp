import { useState } from "react";
import ChartTooltip from "./ChartTooltip.jsx";
import { formatShortDate } from "../../utils/chart-format.js";

const WIDTH = 600;
const HEIGHT = 340;
const PADDING = { top: 20, right: 24, bottom: 30, left: 36 };
const PLOT_W = WIDTH - PADDING.left - PADDING.right;
const PLOT_H = HEIGHT - PADDING.top - PADDING.bottom;
const SERIES_COLOR = "#2563eb";
const GRID_LINES = [0, 25, 50, 75, 100];
const GRADIENT_ID = "pass-rate-trend-gradient";

function PassRateTrendChart({ data }) {
  const [hoverIndex, setHoverIndex] = useState(null);

  if (data.length === 0) {
    return (
      <div className="chart-card" style={{ "--chart-accent": SERIES_COLOR }}>
        <h3 className="chart-title">Pass Rate Trend</h3>
        <p className="chart-subtitle">Last 10 completed test runs</p>
        <p className="chart-empty">No completed test runs yet.</p>
      </div>
    );
  }

  const stepX = data.length > 1 ? PLOT_W / (data.length - 1) : 0;
  const points = data.map((point, i) => ({
    ...point,
    x: PADDING.left + (data.length > 1 ? i * stepX : PLOT_W / 2),
    y: point.pass_rate == null ? null : PADDING.top + PLOT_H * (1 - point.pass_rate / 100),
  }));

  const linePoints = points.filter((p) => p.y != null);
  const linePath = linePoints.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const baselineY = PADDING.top + PLOT_H;
  const areaPath =
    linePoints.length > 1
      ? `${linePath} L ${linePoints[linePoints.length - 1].x} ${baselineY} L ${linePoints[0].x} ${baselineY} Z`
      : null;
  const lastPoint = linePoints[linePoints.length - 1];
  const hovered = hoverIndex != null ? points[hoverIndex] : null;

  return (
    <div className="chart-card" style={{ "--chart-accent": SERIES_COLOR }}>
      <h3 className="chart-title">Pass Rate Trend</h3>
      <p className="chart-subtitle">Last {data.length} completed test runs</p>
      <div className="chart-wrap">
        <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="chart-svg" role="img" aria-label="Pass rate trend over recent test runs">
          <defs>
            <linearGradient id={GRADIENT_ID} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={SERIES_COLOR} stopOpacity="0.18" />
              <stop offset="100%" stopColor={SERIES_COLOR} stopOpacity="0" />
            </linearGradient>
          </defs>

          {GRID_LINES.map((value) => {
            const y = PADDING.top + PLOT_H * (1 - value / 100);
            return (
              <g key={value}>
                <line x1={PADDING.left} x2={WIDTH - PADDING.right} y1={y} y2={y} className="chart-gridline" />
                <text x={PADDING.left - 8} y={y + 3} className="chart-axis-label" textAnchor="end">
                  {value}%
                </text>
              </g>
            );
          })}

          {areaPath && <path d={areaPath} fill={`url(#${GRADIENT_ID})`} stroke="none" />}
          {linePath && <path d={linePath} fill="none" stroke={SERIES_COLOR} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />}

          {hovered && (
            <line x1={hovered.x} x2={hovered.x} y1={PADDING.top} y2={HEIGHT - PADDING.bottom} className="chart-crosshair" />
          )}

          {linePoints.map((p) => (
            <circle
              key={p.run_id}
              cx={p.x}
              cy={p.y}
              r={p === lastPoint || points[hoverIndex] === p ? 5 : 4}
              fill={SERIES_COLOR}
              stroke="#ffffff"
              strokeWidth="2"
            />
          ))}

          {lastPoint && (
            <text x={lastPoint.x} y={lastPoint.y - 12} className="chart-direct-label" textAnchor="middle">
              {lastPoint.pass_rate}%
            </text>
          )}

          {points.map((p, i) => (
            <rect
              key={p.run_id}
              x={p.x - (stepX || PLOT_W) / 2}
              y={PADDING.top}
              width={stepX || PLOT_W}
              height={PLOT_H}
              fill="transparent"
              tabIndex={0}
              className="chart-hit"
              onPointerEnter={() => setHoverIndex(i)}
              onPointerLeave={() => setHoverIndex(null)}
              onFocus={() => setHoverIndex(i)}
              onBlur={() => setHoverIndex(null)}
            />
          ))}

          {points.map((p, i) => (
            <text key={p.run_id} x={p.x} y={HEIGHT - 10} className="chart-axis-label" textAnchor="middle">
              {i % Math.ceil(points.length / 6 || 1) === 0 ? formatShortDate(p.date) : ""}
            </text>
          ))}
        </svg>

        {hovered && (
          <ChartTooltip
            xPct={(hovered.x / WIDTH) * 100}
            yPct={((hovered.y ?? PADDING.top + PLOT_H / 2) / HEIGHT) * 100}
          >
            <span className="chart-tooltip-value">{hovered.pass_rate == null ? "—" : `${hovered.pass_rate}%`}</span>
            <span className="chart-tooltip-label">{formatShortDate(hovered.date)}</span>
          </ChartTooltip>
        )}
      </div>
    </div>
  );
}

export default PassRateTrendChart;
