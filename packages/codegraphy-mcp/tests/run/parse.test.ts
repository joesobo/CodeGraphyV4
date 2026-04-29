import { describe, expect, it } from 'vitest';
import { parseCliCommand } from '../../src/run/parse';

describe('run/parse', () => {
  it('parses list and setup commands', () => {
    expect(parseCliCommand(['list'])).toEqual({ name: 'list' });
    expect(parseCliCommand(['setup'])).toEqual({ name: 'setup' });
  });

  it('parses status with an optional repo path', () => {
    expect(parseCliCommand(['status', '/repo'])).toEqual({ name: 'status', repoPath: '/repo' });
  });

  it('parses reindex with an optional repo path', () => {
    expect(parseCliCommand(['reindex', '/repo'])).toEqual({ name: 'reindex', repoPath: '/repo' });
  });

  it('falls back to help for unknown commands', () => {
    expect(parseCliCommand(['wat'])).toEqual({ name: 'help' });
  });
});
