import { describe, it, expect, vi, afterEach } from 'vitest';
import { formatSize, formatRelativeTime } from '../../../src/webview/components/tooltipFormatters';

describe('formatSize', () => {
  it('formats bytes below 1 KB as "N B"', () => {
    expect(formatSize(0)).toBe('0 B');
    expect(formatSize(512)).toBe('512 B');
    expect(formatSize(1023)).toBe('1023 B');
  });

  it('formats bytes between 1 KB and 1 MB as "N.N KB"', () => {
    expect(formatSize(1024)).toBe('1.0 KB');
    expect(formatSize(1536)).toBe('1.5 KB');
    expect(formatSize(1024 * 1023)).toBe('1023.0 KB');
  });

  it('formats bytes of 1 MB or more as "N.N MB"', () => {
    expect(formatSize(1024 * 1024)).toBe('1.0 MB');
    expect(formatSize(1024 * 1024 * 2.5)).toBe('2.5 MB');
  });
});

describe('formatRelativeTime', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns "just now" for timestamps less than a minute ago', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-01T12:00:30Z'));
    const timestamp = new Date('2024-01-01T12:00:00Z').getTime();
    expect(formatRelativeTime(timestamp)).toBe('just now');
  });

  it('returns minutes ago for timestamps under an hour', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-01T12:05:00Z'));
    const timestamp = new Date('2024-01-01T12:00:00Z').getTime();
    expect(formatRelativeTime(timestamp)).toBe('5m ago');
  });

  it('returns hours ago for timestamps under a day', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-01T14:00:00Z'));
    const timestamp = new Date('2024-01-01T12:00:00Z').getTime();
    expect(formatRelativeTime(timestamp)).toBe('2h ago');
  });

  it('returns days ago for timestamps under a week', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-04T12:00:00Z'));
    const timestamp = new Date('2024-01-01T12:00:00Z').getTime();
    expect(formatRelativeTime(timestamp)).toBe('3d ago');
  });

  it('returns a locale date string for timestamps over a week ago', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-15T12:00:00Z'));
    const timestamp = new Date('2024-01-01T12:00:00Z').getTime();
    const result = formatRelativeTime(timestamp);
    // Should be a date string, not a relative time
    expect(result).not.toContain('ago');
    expect(result).not.toBe('just now');
  });
});
