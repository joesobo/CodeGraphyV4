import { describe, expect, it } from 'vitest';
import { sanitizeReportKey } from '../../src/mutation/reportKey';

describe('sanitizeReportKey', () => {
  it('lowercases and replaces non-url-safe runs with dashes', () => {
    expect(sanitizeReportKey('packages/quality-tools/src/mutation/Weird File.TS')).toBe(
      'packages-quality-tools-src-mutation-weird-file.ts'
    );
  });

  it('collapses consecutive unsafe separators into a single dash', () => {
    expect(sanitizeReportKey('packages///quality-tools:::src')).toBe(
      'packages-quality-tools-src'
    );
  });

  it('trims leading and trailing dashes after replacement', () => {
    expect(sanitizeReportKey('  /Report Key/  ')).toBe('report-key');
  });

  it('trims repeated dash runs on both edges', () => {
    expect(sanitizeReportKey('---report-key---')).toBe('report-key');
  });

  it('preserves already-safe characters', () => {
    expect(sanitizeReportKey('safe.file-name')).toBe('safe.file-name');
  });

  it('drops dash-only segments after trimming edge dashes', () => {
    expect(sanitizeReportKey('---///---')).toBe('');
  });

  it('returns an empty key when only unsafe separators remain', () => {
    expect(sanitizeReportKey('///:::   ')).toBe('');
  });
});
