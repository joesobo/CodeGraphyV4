import { describe, expect, it } from 'vitest';
import { cleanCliArgs, flagValue, parseTargetArg } from '../../src/shared/cliArgs';

describe('cliArgs helpers', () => {
  it('removes passthrough separators', () => {
    expect(cleanCliArgs(['--', 'quality-tools/', '--json'])).toEqual([
      'quality-tools/',
      '--json'
    ]);
  });

  it('parses inline and next-argument flag values', () => {
    expect(flagValue(['--threshold=12'], '--threshold')).toBe('12');
    expect(flagValue(['--threshold', '9'], '--threshold')).toBe('9');
  });

  it('returns the first non-flag target argument', () => {
    expect(parseTargetArg(['--json', 'extension/'])).toBe('extension/');
  });
});
