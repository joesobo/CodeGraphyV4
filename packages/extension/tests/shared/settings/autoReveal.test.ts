import { describe, expect, it } from 'vitest';
import { normalizeAutoRevealMode } from '../../../src/shared/settings/autoReveal';

describe('shared/settings/autoReveal', () => {
  it.each([true, false, 'focusNoScroll'] as const)('preserves supported mode %s', mode => {
    expect(normalizeAutoRevealMode(mode)).toBe(mode);
  });

  it.each([undefined, null, 1, 'true', {}, []])('defaults malformed mode %j to true', mode => {
    expect(normalizeAutoRevealMode(mode)).toBe(true);
  });
});
