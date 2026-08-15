// Currency formatting for GAMA SUPREME (AED throughout).
export function money(n) {
  const v = Number(n) || 0;
  return `AED ${v.toLocaleString('en-AE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
