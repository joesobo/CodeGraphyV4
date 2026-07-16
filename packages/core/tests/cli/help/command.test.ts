import { describe, expect, it } from 'vitest';
import { createHelpResult } from '../../../src/cli/help/command';

describe('cli/help/command', () => {
  it('lists the minimal public command surface and global workspace selector', () => {
    const result = createHelpResult();

    expect(result.exitCode).toBe(0);
    expect(result.output).toContain('codegraphy doctor');
    expect(result.output).toContain('codegraphy search <text>');
    expect(result.output).toContain('codegraphy dependencies <node>');
    expect(result.output).toContain('codegraphy path <from> <to>');
    expect(result.output).toContain('codegraphy scope node <type> <on|off>');
    expect(result.output).toContain('-C, --workspace <path>');
    expect(result.output).not.toContain('relationships');
    expect(result.output).not.toContain('symbols');
    expect(result.output).not.toContain('paths');
    expect(result.output).not.toContain('setup');
    expect(result.output).not.toContain('[workspace]');
  });

  it('reports flag-free query usage', () => {
    expect(createHelpResult(['status']).output).toBe('Usage: codegraphy status');
    expect(createHelpResult(['nodes']).output).toBe('Usage: codegraphy nodes');
    expect(createHelpResult(['search']).output).toBe('Usage: codegraphy search <text>');
    expect(createHelpResult(['dependencies']).output).toBe('Usage: codegraphy dependencies <node>');
    expect(createHelpResult(['path']).output).toBe('Usage: codegraphy path <from> <to>');
  });

  it('reports workspace-free plugin usage', () => {
    expect(createHelpResult(['plugins', 'enable']).output).toBe(
      'Usage: codegraphy plugins enable <plugin-id-or-package>',
    );
  });
});
