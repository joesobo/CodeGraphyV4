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

  it('parses plugin cache and workspace commands', () => {
    expect(parseCliCommand(['plugins', 'register', 'private-plugin'])).toEqual({
      name: 'plugins',
      action: 'register',
      packageName: 'private-plugin',
    });
    expect(parseCliCommand(['plugins', 'enable', '@codegraphy-dev/plugin-python', '/workspace/project'])).toEqual({
      name: 'plugins',
      action: 'enable',
      packageName: '@codegraphy-dev/plugin-python',
      workspacePath: '/workspace/project',
    });
    expect(parseCliCommand(['plugins', 'disable', '@codegraphy-dev/plugin-python'])).toEqual({
      name: 'plugins',
      action: 'disable',
      packageName: '@codegraphy-dev/plugin-python',
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
