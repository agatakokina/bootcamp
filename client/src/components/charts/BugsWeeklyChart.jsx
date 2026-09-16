import { useState } from "react";
import ChartTooltip from "./ChartTooltip.jsx";
import { formatShortDate } from "../../utils/chart-format.js";

const WIDTH = 600;
const HEIGHT = 340;
const PADDING = { top: 20, right: 16, bottom: 30, left: 30 };
const PLOT_W = WIDTH - PADDING.left - PADDING.right;
const PLOT_H = HEIGHT - PADDING.top - PADDING.bottom;
const BAR_MAX_WIDTH = 24;
const BAR_GAP = 2;
const SERIES = [
  { key: "opened", label: "Opened", color: "#6366f1" },
  { key: "closed", label: "Closed", color: "#f59e0b" },
];
const CARD_ACCENT = "#6366f1";

function niceMax(value) {
  if (value <= 5) return 5;
  const step = value <= 20 ? 5 : Math.ceil(value / 5 / 10) * 10;
  return Math.ceil(value / step) * step;
}

function roundedTopRectPath(x, y, width, height, radius) {
  if (height <= 0) return "";
  const r = Math.min(radius, width / 2, height);
  return `M ${x} ${y + height} L ${x} ${y + r} Q ${x} ${y} ${x + r} ${y} L ${x + width - r} ${y} Q ${x + width} ${y} ${x + width} ${y + r} L ${x + width} ${y + height} Z`;
}

function BugsWeeklyChart({ data }) {
  const [hover, setHover] = useState(null);

  const hasActivity = data.some((week) => week.opened > 0 || week.closed > 0);
  if (!hasActivity) {
    return (
      <div className="chart-card" style={{ "--chart-accent": CARD_ACCENT }}>
        <h3 className="chart-title">Bugs Opened vs Closed</h3>
        <p className="chart-subtitle">Last 8 weeks</p>
        <p className="chart-empty">No bug activity in the last 8 weeks.</p>
      </div>
    );
  }

  const maxValue = niceMax(Math.max(...data.map((w) => Math.max(w.opened, w.closed))));
  const bandWidth = PLOT_W / data.length;
  const barWidth = Math.min(BAR_MAX_WIDTH, (bandWidth - BAR_GAP - 16) / 2);
  const gridValues = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(maxValue * f));

  return (
    <div className="chart-card" style={{ "--chart-accent": CARD_ACCENT }}>
      <h3 className="chart-title">Bugs Opened vs Closed</h3>
      <p className="chart-subtitle">Last 8 weeks</p>
      <div className="chart-wrap">
        <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="chart-svg" role="img" aria-label="Bugs opened versus closed per week for the last 8 weeks">
          {gridValues.map((value) => {
            const y = PADDING.top + PLOT_H * (1 - value / maxValue);
            return (
              <g key={value}>
                <line x1={PADDING.left} x2={WIDTH - PADDING.right} y1={y} y2={y} className="chart-gridline" />
                <text x={PADDING.left - 8} y={y + 3} className="chart-axis-label" textAnchor="end">
                  {value}
                </text>
              </g>
            );
          })}

          {data.map((week, i) => {
            const bandX = PADDING.left + i * bandWidth;
            const groupWidth = barWidth * 2 + BAR_GAP;
            const groupX = bandX + (bandWidth - groupWidth) / 2;

            return (
              <g key={week.week_start}>
                {SERIES.map((series, si) => {
                  const value = week[series.key];
                  const barHeight = PLOT_H * (value / maxValue);
                  const x = groupX + si * (barWidth + BAR_GAP);
                  const y = PADDING.top + PLOT_H - barHeight;
                  const isActive = hover && hover.weekIndex === i && hover.seriesKey === series.key;
                  return (
                    <path
                      key={series.key}
                      d={roundedTopRectPath(x, y, barWidth, barHeight, 4)}
                      fill={series.color}
                      className={`chart-bar${isActive ? " active" : ""}`}
                      tabIndex={0}
                      onPointerEnter={() => setHover({ weekIndex: i, seriesKey: series.key })}
                      onPointerLeave={() => setHover(null)}
                      onFocus={() => setHover({ weekIndex: i, seriesKey: series.key })}
                      onBlur={() => setHover(null)}
                    />
                  );
                })}
                <text x={bandX + bandWidth / 2} y={HEIGHT - 10} className="chart-axis-label" textAnchor="middle">
                  {formatShortDate(week.week_start)}
                </text>
              </g>
            );
          })}
        </svg>

        {hover &&
          (() => {
            const week = data[hover.weekIndex];
            const series = SERIES.find((s) => s.key === hover.seriesKey);
            const bandX = PADDING.left + hover.weekIndex * bandWidth + bandWidth / 2;
            const value = week[hover.seriesKey];
            const barHeight = PLOT_H * (value / maxValue);
            const y = PADDING.top + PLOT_H - barHeight;
            return (
              <ChartTooltip xPct={(bandX / WIDTH) * 100} yPct={(y / HEIGHT) * 100}>
                <span className="chart-tooltip-value">{value}</span>
                <span className="chart-tooltip-label">
                  {series.label}, week of {formatShortDate(week.week_start)}
                </span>
              </ChartTooltip>
            );
          })()}
      </div>

      <div className="chart-legend">
        {SERIES.map((series) => (
          <span key={series.key} className="chart-legend-item">
            <span className="chart-legend-swatch" style={{ backgroundColor: series.color }} />
            {series.label}
          </span>
        ))}
      </div>
    </div>
  );
}

export default BugsWeeklyChart;
