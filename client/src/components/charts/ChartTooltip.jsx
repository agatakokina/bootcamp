function ChartTooltip({ xPct, yPct, children }) {
  if (xPct == null || yPct == null) return null;
  return (
    <div className="chart-tooltip" style={{ left: `${xPct}%`, top: `${yPct}%` }}>
      {children}
    </div>
  );
}

export default ChartTooltip;
