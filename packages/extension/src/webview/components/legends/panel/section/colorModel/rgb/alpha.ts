import { clampAlpha } from '../channels';

const ALPHA_PATTERN = /^(?:\d+(?:\.\d+)?|\.\d+)$/;

export function parseAlphaValue(alpha: string | undefined): number | null {
  if (alpha === undefined) {
    return 1;
  }

  if (!ALPHA_PATTERN.test(alpha)) {
    return null;
  }

  return clampAlpha(Number.parseFloat(alpha));
}
