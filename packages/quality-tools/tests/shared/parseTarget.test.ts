import { describe, expect, it } from 'vitest';
import { parseTargetArg } from '../../src/shared/parseTarget';

describe('parseTargetArg', () => {
  it('returns the first non-flag target argument', () => {
    expect(parseTargetArg(['--json', 'extension/'], [])).toBe('extension/');
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
