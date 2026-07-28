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
    expect(parseCliCommand(['--', 'index'])).toEqual({ name: 'index' });
    expect(parseCliCommand(['batch'])).toMatchObject({
      parseError: 'Unknown command: batch',
    });
  });

  it('uses cwd by default and one global workspace override for every workspace command', () => {
    expect(parseCliCommand(['index'])).toEqual({ name: 'index' });
    expect(parseCliCommand(['watch'])).toEqual({ name: 'watch' });
    expect(parseCliCommand(['-C', '/workspace/project', 'nodes'])).toEqual({
      name: 'query',
      report: 'nodes',
      arguments: { limit: 100 },
      workspacePath: '/workspace/project',
    });
    expect(parseCliCommand(['plugins', 'enable', 'codegraphy.vue', '--workspace', '/workspace/project'])).toEqual({
      name: 'plugins',
      action: 'enable',
      packageName: 'codegraphy.vue',
      workspacePath: '/workspace/project',
    });
  });

  it('parses compact scope and filter commands', () => {
    expect(parseCliCommand(['scope'])).toEqual({ name: 'scope' });
    expect(parseCliCommand(['scope', 'node', 'symbol:function', 'on'])).toEqual({
      name: 'scope',
      arguments: { kind: 'node', type: 'symbol:function', enabled: true },
    });
    expect(parseCliCommand(['scope', 'edge', 'import', 'off'])).toEqual({
      name: 'scope',
      arguments: { kind: 'edge', type: 'import', enabled: false },
    });
    expect(parseCliCommand(['filter'])).toEqual({ name: 'filter' });
    expect(parseCliCommand(['filter', 'add', '**/generated/**'])).toEqual({
      name: 'filter',
      arguments: { action: 'add', pattern: '**/generated/**' },
    });
    expect(parseCliCommand(['filter', 'remove', '**/generated/**'])).toEqual({
      name: 'filter',
      arguments: { action: 'remove', pattern: '**/generated/**' },
    });
    expect(parseCliCommand(['filter', 'add', '--', '-draft/**'])).toEqual({
      name: 'filter',
      arguments: { action: 'add', pattern: '-draft/**' },
    });
    expect(parseCliCommand(['search', '--', '-C'])).toMatchObject({
      report: 'search',
      arguments: { pattern: '-C', limit: 20 },
    });
  });

  it('parses structured workspace settings reads and mutations', () => {
    expect(parseCliCommand(['settings'])).toEqual({ name: 'settings' });
    expect(parseCliCommand(['settings', 'get', 'maxFiles'])).toEqual({
      name: 'settings',
      settingsAction: 'get',
      settingsKey: 'maxFiles',
    });
    expect(parseCliCommand(['settings', 'set', 'maxFiles', '2500'])).toEqual({
      name: 'settings',
      settingsAction: 'set',
      settingsKey: 'maxFiles',
      settingsValue: 2500,
    });
    expect(parseCliCommand(['settings', 'set', 'include', '["packages/**/*.ts"]'])).toEqual({
      name: 'settings',
      settingsAction: 'set',
      settingsKey: 'include',
      settingsValue: ['packages/**/*.ts'],
    });
    expect(parseCliCommand(['settings', 'unset', 'maxFiles'])).toEqual({
      name: 'settings',
      settingsAction: 'unset',
      settingsKey: 'maxFiles',
    });
    expect(parseCliCommand(['settings', 'set', 'maxFiles', 'many'])).toMatchObject({
      parseError: 'settings set value must be valid JSON: many',
    });
    expect(parseCliCommand(['settings', 'set', 'unknown', '1'])).toMatchObject({
      parseError: 'Unknown workspace setting: unknown',
    });
  });

  it('parses scoped help only for public commands', () => {
    expect(parseCliCommand(['help', 'dependencies'])).toEqual({
      name: 'help',
      helpPath: ['dependencies'],
    });
    expect(parseCliCommand(['settings', '--help'])).toEqual({
      name: 'help',
      helpPath: ['settings'],
    });
    expect(parseCliCommand(['scope', '--help'])).toEqual({
      name: 'help',
      helpPath: ['scope'],
    });
    expect(parseCliCommand(['plugins', 'enable', '--help'])).toEqual({
      name: 'help',
      helpPath: ['plugins', 'enable'],
    });
    expect(parseCliCommand(['query', '--help'])).toEqual({
      name: 'help',
      helpPath: ['query'],
    });
    expect(parseCliCommand(['help', 'query'])).toEqual({
      name: 'help',
      helpPath: ['query'],
    });
  });

  it('rejects per-command workspaces, query flags, retired commands, and malformed globals', () => {
    expect(parseCliCommand(['status', '/workspace/project'])).toMatchObject({
      parseError: 'Unexpected argument for status: /workspace/project',
    });
    expect(parseCliCommand(['watch', 'extra'])).toMatchObject({
      parseError: 'Unexpected argument for watch: extra',
    });
    expect(parseCliCommand(['edges', '--from', 'src/app.ts'])).toMatchObject({
      parseError: 'Unknown option for edges: --from',
    });
    for (const command of ['setup', 'relationships', 'symbols', 'paths', 'batch']) {
      expect(parseCliCommand([command])).toMatchObject({
        parseError: `Unknown command: ${command}`,
      });
    }
    expect(parseCliCommand(['-C'])).toMatchObject({
      parseError: 'Missing value for -C',
    });
    expect(parseCliCommand(['-C', 'one', '--workspace', 'two', 'status'])).toMatchObject({
      parseError: 'Duplicate workspace option: --workspace',
    });
  });
});
