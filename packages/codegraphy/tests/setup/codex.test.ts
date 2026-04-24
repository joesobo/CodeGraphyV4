import { describe, expect, it } from 'vitest';
import { configureCodexMcp } from '../../src/setup/codex';

describe('setup/codex', () => {
  it('reports already-configured mcp entries', () => {
    const result = configureCodexMcp(((command: string, args: string[]) => {
      expect(command).toBe('codex');
      expect(args).toEqual(['mcp', 'get', 'codegraphy', '--json']);
      return { status: 0 };
    }) as never);

    expect(result).toEqual({ configured: true, changed: false });
  });

  it('adds the mcp entry when it is missing', () => {
    const calls: string[] = [];
    const result = configureCodexMcp(((command: string, args: string[]) => {
      calls.push([command, ...args].join(' '));
      if (calls.length === 1) {
        return { status: 1, stderr: 'missing' };
      }

      return { status: 0 };
    }) as never);

    expect(calls).toEqual([
      'codex mcp get codegraphy --json',
      'codex mcp add codegraphy -- codegraphy mcp',
    ]);
    expect(result).toEqual({ configured: true, changed: true });
  });
});
