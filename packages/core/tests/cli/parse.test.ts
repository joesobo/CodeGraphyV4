import { describe, expect, it } from 'vitest';
import { parseCliCommand } from '../../src/cli/parse';

describe('cli/parse', () => {
  it('parses empty and explicit help commands', () => {
    expect(parseCliCommand([])).toEqual({ name: 'help' });
    expect(parseCliCommand(['help'])).toEqual({ name: 'help' });
    expect(parseCliCommand(['--help'])).toEqual({ name: 'help' });
    expect(parseCliCommand(['-h'])).toEqual({ name: 'help' });
  });

  it('parses setup commands', () => {
    expect(parseCliCommand(['setup'])).toEqual({ name: 'setup' });
  });

  it('parses index with an optional workspace path', () => {
    expect(parseCliCommand(['index'])).toEqual({ name: 'index' });
    expect(parseCliCommand(['index', '/workspace/project'])).toEqual({
      name: 'index',
      workspacePath: '/workspace/project',
    });
  });

  it('parses status with an optional workspace path', () => {
    expect(parseCliCommand(['status'])).toEqual({ name: 'status' });
    expect(parseCliCommand(['status', '/workspace/project'])).toEqual({
      name: 'status',
      workspacePath: '/workspace/project',
    });
  });

  it('parses bounded graph query commands with report-specific flags', () => {
    expect(parseCliCommand([
      'query',
      'relationships',
      '/workspace/project',
      '--from',
      'src/app.ts',
      '--edge-type',
      'import',
      '--limit',
      '25',
    ])).toEqual({
      name: 'query',
      report: 'relationships',
      workspacePath: '/workspace/project',
      arguments: {
        from: 'src/app.ts',
        edgeType: 'import',
        limit: 25,
      },
    });
    expect(parseCliCommand([
      'query',
      'paths',
      '--from',
      'src/app.ts',
      '--to',
      'src/core.ts',
    ])).toEqual({
      name: 'query',
      report: 'paths',
      arguments: {
        from: 'src/app.ts',
        to: 'src/core.ts',
      },
    });
    expect(parseCliCommand(['query', 'nodes'])).toEqual({
      name: 'query',
      report: 'nodes',
      arguments: { limit: 100 },
    });
  });

  it('rejects invalid query reports, unknown flags, and unbounded path requests', () => {
    expect(parseCliCommand(['query', 'files'])).toEqual({
      name: 'query',
      parseError: 'Unknown query report: files',
    });
    expect(parseCliCommand(['query', 'nodes', '--wat'])).toEqual({
      name: 'query',
      parseError: 'Unknown option for query nodes: --wat',
    });
    expect(parseCliCommand(['query', 'paths', '--from', 'src/app.ts'])).toEqual({
      name: 'query',
      parseError: 'query paths requires --from and --to',
    });
  });

  it('parses verbose as a global flag for every command', () => {
    expect(parseCliCommand(['--verbose', 'index', '/workspace/project'])).toEqual({
      name: 'index',
      verbose: true,
      workspacePath: '/workspace/project',
    });
    expect(parseCliCommand(['status', '--verbose', '/workspace/project'])).toEqual({
      name: 'status',
      verbose: true,
      workspacePath: '/workspace/project',
    });
    expect(parseCliCommand(['plugins', 'enable', '@codegraphy-dev/plugin-vue', '--verbose', '/workspace/project'])).toEqual({
      name: 'plugins',
      action: 'enable',
      packageName: '@codegraphy-dev/plugin-vue',
      verbose: true,
      workspacePath: '/workspace/project',
    });
    expect(parseCliCommand(['--verbose', 'setup'])).toEqual({
      name: 'setup',
      verbose: true,
    });
  });

  it('parses plugin cache and workspace commands', () => {
    expect(parseCliCommand(['plugins', 'register', 'private-plugin'])).toEqual({
      name: 'plugins',
      action: 'register',
      packageName: 'private-plugin',
    });
    expect(parseCliCommand(['plugins', 'link', '/private/plugin'])).toEqual({
      name: 'plugins',
      action: 'link',
      packageRoot: '/private/plugin',
    });
    expect(parseCliCommand(['plugins', 'enable', '@codegraphy-dev/plugin-vue', '/workspace/project'])).toEqual({
      name: 'plugins',
      action: 'enable',
      packageName: '@codegraphy-dev/plugin-vue',
      workspacePath: '/workspace/project',
    });
    expect(parseCliCommand(['plugins', 'disable', '@codegraphy-dev/plugin-vue'])).toEqual({
      name: 'plugins',
      action: 'disable',
      packageName: '@codegraphy-dev/plugin-vue',
    });
    expect(parseCliCommand(['plugins', 'list', '/workspace/project'])).toEqual({
      name: 'plugins',
      action: 'list',
      workspacePath: '/workspace/project',
    });
    expect(parseCliCommand(['plugins', 'unknown'])).toEqual({
      name: 'plugins',
      action: 'help',
    });
  });

  it('does not parse old repo workflow commands', () => {
    expect(parseCliCommand(['list'])).toEqual({ name: 'help' });
    expect(parseCliCommand(['open', '/repo'])).toEqual({ name: 'help' });
    expect(parseCliCommand(['reindex', '/repo'])).toEqual({ name: 'help' });
    expect(parseCliCommand(['mcp'])).toEqual({ name: 'help' });
  });

  it('falls back to help for unknown commands', () => {
    expect(parseCliCommand(['wat'])).toEqual({ name: 'help' });
  });
});
