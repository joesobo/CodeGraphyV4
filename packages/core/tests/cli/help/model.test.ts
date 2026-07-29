import { describe, expect, it } from 'vitest';
import {
  COMMAND_HELP,
  PLUGIN_HELP,
  PLUGINS_HELP,
  ROOT_HELP,
} from '../../../src/cli/help/model';

describe('cli/help/model', () => {
  it('contains root, command, and nested Plugin help content', () => {
    expect(ROOT_HELP).toContain('CodeGraphy CLI');
    expect(COMMAND_HELP.search).toContain('Usage: codegraphy search');
    expect(COMMAND_HELP.query).toContain('--node-type');
    expect(PLUGINS_HELP).toContain('codegraphy plugins register');
    expect(PLUGIN_HELP.enable).toContain('codegraphy plugins enable');
  });
});
