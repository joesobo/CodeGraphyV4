import { describe, expect, it } from 'vitest';
import { flagValue } from '../../src/shared/flagValue';

describe('flagValue', () => {
  it('parses inline flag values', () => {
    expect(flagValue(['--threshold=12'], '--threshold')).toBe('12');
  });

  it('parses next-argument flag values', () => {
    expect(flagValue(['--threshold', '9'], '--threshold')).toBe('9');
  });

  it('returns undefined when flag is not found', () => {
    expect(flagValue(['--json'], '--threshold')).toBeUndefined();
  });

  it('returns undefined when flag has no value after it', () => {
    expect(flagValue(['--threshold'], '--threshold')).toBeUndefined();
  });
});
