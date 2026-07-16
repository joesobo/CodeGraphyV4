import { describe, expect, it } from 'vitest';
import { parseCliCommand } from '../../src/cli/parse';

describe('cli/parse', () => {
  it('parses global help and version commands', () => {
    expect(parseCliCommand([])).toEqual({ name: 'help' });
    expect(parseCliCommand(['help'])).toEqual({ name: 'help' });
    expect(parseCliCommand(['--help'])).toEqual({ name: 'help' });
    expect(parseCliCommand(['-h'])).toEqual({ name: 'help' });
    expect(parseCliCommand(['--version'])).toEqual({ name: 'version' });
    expect(parseCliCommand(['-V'])).toEqual({ name: 'version' });
  });

  it('parses scoped help only for known commands', () => {
    expect(parseCliCommand(['help', 'edges'])).toEqual({
      name: 'help',
      helpPath: ['edges'],
    });
    expect(parseCliCommand(['index', '--help'])).toEqual({
      name: 'help',
      helpPath: ['index'],
    });
    expect(parseCliCommand(['edges', '--help'])).toEqual({
      name: 'help',
      helpPath: ['edges'],
    });
    expect(parseCliCommand(['plugins', 'enable', '--help'])).toEqual({
      name: 'help',
      helpPath: ['plugins', 'enable'],
    });
    expect(parseCliCommand(['wat', '--help'])).toEqual({
      name: 'help',
      parseError: 'Unknown command: wat',
    });
    expect(parseCliCommand(['help', 'wat'])).toEqual({
      name: 'help',
      parseError: 'Unknown help topic: wat',
    });
    expect(parseCliCommand(['plugins', 'wat', '--help'])).toEqual({
      name: 'plugins',
      parseError: 'Unknown plugin command: wat',
    });
    expect(parseCliCommand(['help', 'plugins', 'wat'])).toEqual({
      name: 'help',
      parseError: 'Unknown plugin help topic: wat',
    });
  });

  it('dispatches concise top-level graph reports', () => {
    expect(parseCliCommand(['edges', '.', '--from', 'src/app.ts'])).toEqual({
      name: 'query',
      report: 'edges',
      workspacePath: '.',
      arguments: { from: 'src/app.ts', limit: 100 },
    });
  });

  it('parses verbose as a global option anywhere', () => {
    expect(parseCliCommand(['--verbose', 'index', '/workspace/project'])).toEqual({
      name: 'index',
      verbose: true,
      workspacePath: '/workspace/project',
    });
    expect(parseCliCommand(['edges', '--verbose', '--from', 'src/app.ts'])).toEqual({
      name: 'query',
      report: 'edges',
      verbose: true,
      arguments: { from: 'src/app.ts', limit: 100 },
    });
  });

  it('rejects unknown and retired commands', () => {
    for (const command of ['query', 'list', 'open', 'reindex', 'mcp', 'wat']) {
      expect(parseCliCommand([command])).toEqual({
        name: 'help',
        parseError: `Unknown command: ${command}`,
      });
    }
  });

  it('rejects arguments after argument-free commands', () => {
    expect(parseCliCommand(['setup', 'extra'])).toEqual({
      name: 'setup',
      parseError: 'Unexpected argument for setup: extra',
    });
    expect(parseCliCommand(['--version', 'extra'])).toEqual({
      name: 'version',
      parseError: 'Unexpected argument for version: extra',
    });
  });
});
