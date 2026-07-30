import { describe, expect, it } from 'vitest';
import {
  createRegisteredHelpResult,
  isRegisteredCommandName,
  parseRegisteredCommand,
} from '../../src/cli/registry';

const publicCommands = [
  'doctor',
  'filter',
  'index',
  'plugins',
  'scope',
  'settings',
  'status',
  'watch',
  'dependencies',
  'dependents',
  'edges',
  'impact',
  'map',
  'nodes',
  'path',
  'query',
  'search',
];

describe('cli/registry', () => {
  it('owns parser and help registration for every public command', () => {
    for (const command of publicCommands) {
      expect(isRegisteredCommandName(command)).toBe(true);
      expect(parseRegisteredCommand(command, [])).toBeDefined();
      expect(createRegisteredHelpResult([command]).output).toContain(`codegraphy ${command}`);
    }
    expect(isRegisteredCommandName('batch')).toBe(false);
    expect(parseRegisteredCommand('batch', [])).toBeUndefined();
  });
});
