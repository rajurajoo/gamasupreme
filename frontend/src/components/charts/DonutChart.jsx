import { useState } from 'react';

// Lightweight responsive donut chart. No dependencies.
// data: [{ label, value, color }]
export default function DonutChart({ data, size = 200, strokeWidth = 28 }) {
  const [hover, setHover] = useState(null);
  const total = data.reduce((s, d) => s + d.value, 0);
  const r = (size - strokeWidth) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;

  let offsetAcc = 0;
  const segments = data.map((d, i) => {
    const frac = total > 0 ? d.value / total : 0;
    const dash = frac * circumference;
    const seg = { ...d, dash, gap: circumference - dash, rotate: (offsetAcc / circumference) * 360, index: i, frac };
    offsetAcc += dash;
    return seg;
  });

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
      <div style={{ position: 'relative', filter: 'drop-shadow(0 0 18px rgba(123, 47, 247, 0.35))' }}>
        <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} role="img" aria-label="Document status breakdown chart">
          <defs>
            <linearGradient id="donut-ring" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#7b2ff7" />
              <stop offset="35%" stopColor="#3d5afe" />
              <stop offset="70%" stopColor="#ff7a45" />
              <stop offset="100%" stopColor="#ff3d9a" />
            </linearGradient>
          </defs>
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={strokeWidth} />
          {total === 0 && (
            <text x={cx} y={cy + 4} fontSize="12" textAnchor="middle" fill="#857b96">No data</text>
          )}
          {total > 0 && segments.length <= 1 && (
            <circle
              cx={cx} cy={cy} r={r} fill="none" stroke="url(#donut-ring)" strokeWidth={strokeWidth}
            />
          )}
          {segments.map((s) => (
            <circle
              key={s.index}
              cx={cx}
              cy={cy}
              r={r}
              fill="none"
              stroke={s.color}
              strokeWidth={hover === s.index ? strokeWidth + 4 : strokeWidth}
              strokeDasharray={`${s.dash} ${s.gap}`}
              transform={`rotate(${s.rotate - 90} ${cx} ${cy})`}
              strokeLinecap={s.dash > 0 && s.dash < circumference ? 'butt' : 'round'}
              onMouseEnter={() => setHover(s.index)}
              onMouseLeave={() => setHover(null)}
              style={{ cursor: 'pointer', transition: 'stroke-width 0.15s' }}
            >
              <title>{`${s.label}: ${s.value} (${Math.round(s.frac * 100)}%)`}</title>
            </circle>
          ))}
          <text x={cx} y={cy - 3} fontSize="22" fontWeight="800" textAnchor="middle" fill="#f5f2f8">
            {total}
          </text>
          <text x={cx} y={cy + 15} fontSize="10" textAnchor="middle" fill="#857b96">
            invoices
          </text>
        </svg>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {data.map((d, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-secondary)' }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: d.color, display: 'inline-block' }} />
            <span style={{ textTransform: 'capitalize' }}>{d.label}</span>
            <strong style={{ marginLeft: 'auto', color: 'var(--text-primary)' }}>{d.value}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}
