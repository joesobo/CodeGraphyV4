import { describe, expect, it } from 'vitest';
import { isPluginCommand, parsePluginsCommand } from '../../src/cli/parsePlugins';

describe('cli/parsePlugins', () => {
  it('identifies public plugin subcommands', () => {
    expect(isPluginCommand('enable')).toBe(true);
    expect(isPluginCommand('wat')).toBe(false);
  });
  it('parses plugin package and workspace commands', () => {
    expect(parsePluginsCommand(['register', 'private-plugin'])).toEqual({
      name: 'plugins',
      action: 'register',
      packageName: 'private-plugin',
    });
    expect(parsePluginsCommand(['link', '/private/plugin'])).toEqual({
      name: 'plugins',
      action: 'link',
      packageRoot: '/private/plugin',
    });
    expect(parsePluginsCommand(['enable', '@codegraphy-dev/plugin-vue', '/workspace'])).toEqual({
      name: 'plugins',
      action: 'enable',
      packageName: '@codegraphy-dev/plugin-vue',
      workspacePath: '/workspace',
    });
    expect(parsePluginsCommand(['list', '/workspace'])).toEqual({
      name: 'plugins',
      action: 'list',
      workspacePath: '/workspace',
    });
  });

  it('routes an empty group to plugin help', () => {
    expect(parsePluginsCommand([])).toEqual({
      name: 'help',
      helpPath: ['plugins'],
    });
  });

  it('rejects unknown, missing, and extra arguments', () => {
    expect(parsePluginsCommand(['unknown'])).toEqual({
      name: 'plugins',
      parseError: 'Unknown plugin command: unknown',
    });
    expect(parsePluginsCommand(['enable'])).toEqual({
      name: 'plugins',
      parseError: 'plugins enable requires <plugin-id-or-package>',
    });
    expect(parsePluginsCommand(['list', 'one', 'two'])).toEqual({
      name: 'plugins',
      parseError: 'Unexpected argument for plugins list: two',
    });
    expect(parsePluginsCommand(['register', 'pkg', 'extra'])).toEqual({
      name: 'plugins',
      parseError: 'Unexpected argument for plugins register: extra',
    });
  });
});
