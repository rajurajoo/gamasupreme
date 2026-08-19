// Currency formatting for GAMA SUPREME (AED throughout).
export function money(n) {
  const v = Number(n) || 0;
  return `AED ${v.toLocaleString('en-AE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const ONES = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
  'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function threeDigitsToWords(n) {
  let s = '';
  if (n >= 100) {
    s += ONES[Math.floor(n / 100)] + ' Hundred';
    n %= 100;
    if (n) s += ' ';
  }
  if (n >= 20) {
    s += TENS[Math.floor(n / 10)];
    if (n % 10) s += '-' + ONES[n % 10];
  } else if (n > 0) {
    s += ONES[n];
  }
  return s;
}

function integerToWords(n) {
  if (n === 0) return 'Zero';
  const parts = [];
  const scales = [[1e9, 'Billion'], [1e6, 'Million'], [1e3, 'Thousand'], [1, '']];
  let remaining = n;
  for (const [scale, label] of scales) {
    if (remaining >= scale) {
      const count = Math.floor(remaining / scale);
      parts.push(threeDigitsToWords(count) + (label ? ' ' + label : ''));
      remaining %= scale;
    }
  }
  return parts.join(' ');
}

// UAE-style "amount in words" for a final document total, e.g.
// "AED Ten Thousand Five Hundred and Fifty and 25 Fils Only".
export function amountInWords(n) {
  const v = Math.max(0, Number(n) || 0);
  const whole = Math.floor(v);
  const fils = Math.round((v - whole) * 100);
  let words = `AED ${integerToWords(whole)}`;
  if (fils > 0) {
    words += ` and ${integerToWords(fils)} Fils`;
  }
  return words + ' Only';
}
