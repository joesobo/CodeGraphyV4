import { describe, expect, it } from 'vitest';
import { cleanCliArgs, flagValue, parseBareTargetArg, parseTargetArg } from '../../src/shared/cliArgs';

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
    expect(parseTargetArg(['--json', 'extension/'], [])).toBe('extension/');
  });

  it('returns the first bare target argument without value flags', () => {
    expect(parseBareTargetArg(['--json', 'quality-tools/'])).toBe('quality-tools/');
  });

  it('skips flag values before the target argument', () => {
    expect(parseTargetArg(['--threshold', '12', '--policy', 'strict', 'extension/'], ['--threshold', '--policy'])).toBe(
      'extension/'
    );
  });

  it('returns undefined when a value flag has no target after it', () => {
    expect(parseTargetArg(['--threshold'], ['--threshold'])).toBeUndefined();
  });

  it('keeps flag-like tokens from being treated as values', () => {
    expect(parseTargetArg(['--threshold', '--json', 'extension/'], ['--threshold'])).toBe('extension/');
  });

  it('treats plain values that end with dashes as values', () => {
    expect(parseTargetArg(['--threshold', 'value--', 'extension/'], ['--threshold'])).toBe('extension/');
  });
});
