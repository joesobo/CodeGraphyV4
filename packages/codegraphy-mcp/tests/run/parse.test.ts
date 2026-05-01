import { describe, expect, it } from 'vitest';
import { parseCliCommand } from '../../src/run/parse';

describe('run/parse', () => {
  it('parses list and setup commands', () => {
    expect(parseCliCommand(['list'])).toEqual({ name: 'list' });
    expect(parseCliCommand(['setup'])).toEqual({ name: 'setup' });
  });

  it('parses open with a repo path', () => {
    expect(parseCliCommand(['open', '/repo'])).toEqual({ name: 'open', repoPath: '/repo' });
  });

  it('parses index without repo arguments', () => {
    expect(parseCliCommand(['index'])).toEqual({ name: 'index' });
  });

  it('does not parse old status and reindex commands', () => {
    expect(parseCliCommand(['status', '/repo'])).toEqual({ name: 'help' });
    expect(parseCliCommand(['reindex', '/repo'])).toEqual({ name: 'help' });
  });

  it('falls back to help for unknown commands', () => {
    expect(parseCliCommand(['wat'])).toEqual({ name: 'help' });
  });
});
