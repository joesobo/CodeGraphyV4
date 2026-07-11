import type { AutoRevealMode } from './modes';

export function normalizeAutoRevealMode(value: unknown): AutoRevealMode {
  return value === true || value === false || value === 'focusNoScroll'
    ? value
    : true;
}
