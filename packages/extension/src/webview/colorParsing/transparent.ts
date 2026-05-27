import { parseCssColorFunction } from './functions';

function isZeroAlpha(alpha: string): boolean {
  if (alpha === '0') {
    return true;
  }

  if (!alpha.startsWith('0.')) {
    return false;
  }

  const decimals = alpha.slice(2);
  return decimals.length > 0 && [...decimals].every((digit) => digit === '0');
}

export function isFullyTransparentColor(color: string): boolean {
  const trimmed = color.trim().toLowerCase();
  if (trimmed === 'transparent') {
    return true;
  }

  const parsed = parseCssColorFunction(trimmed);
  return parsed?.name === 'rgba'
    && parsed.args.length === 4
    && isZeroAlpha(parsed.args[3]);
}
