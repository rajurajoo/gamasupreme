import { useState } from 'react';
import { money } from '../../format';

// Lightweight responsive vertical bar chart. No dependencies.
// data: [{ label, value }]
export default function BarChart({ data, height = 220 }) {
  const [hover, setHover] = useState(null);
  const W = 400;
  const H = height;
  const padL = 56;
  const padR = 16;
  const padT = 16;
  const padB = 40;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;

  const max = Math.max(...data.map((d) => d.value), 1);
  const niceMax = max === 0 ? 1 : max * 1.15;

  const gap = 0.35; // fraction of band used as gap
  const bandW = innerW / data.length;
  const barW = bandW * (1 - gap);

  const y = (v) => padT + innerH - (v / niceMax) * innerH;

  const gridLines = 4;
  const gridYs = Array.from({ length: gridLines + 1 }, (_, i) => padT + (innerH / gridLines) * i);
  const gridVals = gridYs.map((gy) => Math.round(((padT + innerH - gy) / innerH) * niceMax));

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} role="img" aria-label="Sales by business chart">
      {gridYs.map((gy, i) => (
        <g key={i}>
          <line x1={padL} y1={gy} x2={W - padR} y2={gy} stroke="#e8e9ec" strokeWidth="1" />
          <text x={padL - 8} y={gy + 4} fontSize="10" textAnchor="end" fill="#9ca3af">
            {gridVals[i] >= 1000 ? `${Math.round(gridVals[i] / 1000)}k` : gridVals[i]}
          </text>
        </g>
      ))}

      {data.map((d, i) => {
        const bx = padL + i * bandW + (bandW - barW) / 2;
        const by = y(d.value);
        const bh = padT + innerH - by;
        const barColor = i % 2 === 0 ? '#FF7A45' : '#111827';
        return (
          <g key={i}>
            <rect
              x={bx}
              y={by}
              width={barW}
              height={Math.max(bh, 0)}
              rx="4"
              fill={barColor}
              opacity={hover === i ? 1 : 0.9}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
              style={{ cursor: 'pointer' }}
            >
              <title>{`${d.label}: ${money(d.value)}`}</title>
            </rect>
            {hover === i && (
              <text x={bx + barW / 2} y={by - 6} fontSize="11" fontWeight="600" textAnchor="middle" fill="#111827">
                {money(d.value)}
              </text>
            )}
            <text x={bx + barW / 2} y={H - 20} fontSize="10" textAnchor="middle" fill="#6b7280">
              {d.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
