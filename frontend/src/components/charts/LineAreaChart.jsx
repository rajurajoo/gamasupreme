import { useState } from 'react';
import { money } from '../../format';

// Lightweight responsive area+line chart. No dependencies.
// data: [{ label, value }]
export default function LineAreaChart({ data, height = 220 }) {
  const [hover, setHover] = useState(null);
  const W = 600;
  const H = height;
  const padL = 56;
  const padR = 16;
  const padT = 16;
  const padB = 32;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;

  const values = data.map((d) => d.value);
  const max = Math.max(...values, 1);
  const niceMax = max === 0 ? 1 : max * 1.15;

  const x = (i) => padL + (data.length === 1 ? innerW / 2 : (i / (data.length - 1)) * innerW);
  const y = (v) => padT + innerH - (v / niceMax) * innerH;

  const linePoints = data.map((d, i) => `${x(i)},${y(d.value)}`).join(' ');
  const areaPoints = `${x(0)},${padT + innerH} ${linePoints} ${x(data.length - 1)},${padT + innerH}`;

  const gridLines = 4;
  const gridYs = Array.from({ length: gridLines + 1 }, (_, i) => padT + (innerH / gridLines) * i);
  const gridVals = gridYs.map((gy) => Math.round(((padT + innerH - gy) / innerH) * niceMax));

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} role="img" aria-label="Revenue trend chart">
      <defs>
        <linearGradient id="lac-area" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ff3d9a" stopOpacity="0.32" />
          <stop offset="100%" stopColor="#ff3d9a" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="lac-line" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#ff7a45" />
          <stop offset="50%" stopColor="#ff3d9a" />
          <stop offset="100%" stopColor="#7b2ff7" />
        </linearGradient>
      </defs>

      {gridYs.map((gy, i) => (
        <g key={i}>
          <line x1={padL} y1={gy} x2={W - padR} y2={gy} stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
          <text x={padL - 8} y={gy + 4} fontSize="10" textAnchor="end" fill="#857b96">
            {gridVals[i] >= 1000 ? `${Math.round(gridVals[i] / 1000)}k` : gridVals[i]}
          </text>
        </g>
      ))}

      <polygon points={areaPoints} fill="url(#lac-area)" />
      <polyline points={linePoints} fill="none" stroke="url(#lac-line)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />

      {data.map((d, i) => (
        <g key={i}>
          <circle
            cx={x(i)}
            cy={y(d.value)}
            r={hover === i ? 6 : 4}
            fill="#17131f"
            stroke="#ff3d9a"
            strokeWidth="2"
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
            style={{ cursor: 'pointer' }}
          >
            <title>{`${d.label}: ${money(d.value)}`}</title>
          </circle>
          <text x={x(i)} y={H - 8} fontSize="10" textAnchor="middle" fill="#857b96">
            {d.label}
          </text>
          {hover === i && (
            <g>
              <rect
                x={Math.min(Math.max(x(i) - 45, padL), W - padR - 90)}
                y={Math.max(y(d.value) - 34, 2)}
                width="90"
                height="24"
                rx="6"
                fill="url(#lac-line)"
              />
              <text
                x={Math.min(Math.max(x(i) - 45, padL), W - padR - 90) + 45}
                y={Math.max(y(d.value) - 34, 2) + 16}
                fontSize="11"
                fontWeight="600"
                textAnchor="middle"
                fill="#fff"
              >
                {money(d.value)}
              </text>
            </g>
          )}
        </g>
      ))}
    </svg>
  );
}
