import { describe, expect, it } from 'vitest';
import { cleanCliArgs, flagValue, parseBareTargetArg, parseTargetArg } from '../../src/shared/cliArgs';

describe('cliArgs helpers', () => {
  it('removes passthrough separators', () => {
    expect(cleanCliArgs(['--', 'quality-tools/', '--json'])).toEqual([
      'quality-tools/',
      '--json'
    ]);
  });

  it('returns the first bare target argument without value flags', () => {
    expect(parseBareTargetArg(['--json', 'quality-tools/'])).toBe('quality-tools/');
  });

  it('re-exports flagValue for backward compatibility', () => {
    expect(flagValue(['--threshold=12'], '--threshold')).toBe('12');
    expect(flagValue(['--threshold', '9'], '--threshold')).toBe('9');
  });

  it('re-exports parseTargetArg for backward compatibility', () => {
    expect(parseTargetArg(['--json', 'extension/'], [])).toBe('extension/');
  });
});
