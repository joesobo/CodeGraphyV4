import { describe, expect, it } from 'vitest';
import { parseWorkspaceCommand } from '../../../src/cli/parser/workspace';

describe('cli/parser/workspace', () => {
  it('uses the global workspace and rejects command-local arguments', () => {
    expect(parseWorkspaceCommand('index', [])).toEqual({ name: 'index' });
    expect(parseWorkspaceCommand('status', ['/workspace/project'])).toEqual({
      name: 'status',
      parseError: 'Unexpected argument for status: /workspace/project',
    });
    expect(parseWorkspaceCommand('status', ['--wat'])).toEqual({
      name: 'status',
      parseError: 'Unexpected argument for status: --wat',
    });
  });
});
