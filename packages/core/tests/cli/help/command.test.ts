import { describe, expect, it } from 'vitest';
import { createHelpResult } from '../../../src/cli/help/command';

describe('cli/help/command', () => {
  it('lists the concise public command surface', () => {
    const result = createHelpResult();

    expect(result.exitCode).toBe(0);
    expect(result.output).toContain('codegraphy edges [workspace] [options]');
    expect(result.output).not.toContain('codegraphy query');
  });

  it('reports scoped workspace and query usage', () => {
    expect(createHelpResult(['setup']).output).toBe('Usage: codegraphy setup');
    expect(createHelpResult(['status']).output).toBe('Usage: codegraphy status [workspace]');
    expect(createHelpResult(['symbols']).output).toContain(
      '[--from <path>] [--to <path>] [--type <edge-type>]',
    );
    expect(createHelpResult(['paths']).output).toContain(
      '[--depth <count>] [--limit <count>]',
    );
  });

  it('reports scoped plugin usage', () => {
    expect(createHelpResult(['plugins', 'enable']).output).toBe(
      'Usage: codegraphy plugins enable <plugin-id-or-package> [workspace]',
    );
  });
});
