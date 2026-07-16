import { describe, expect, it } from 'vitest';
import { parseWorkspaceCommand } from '../../src/cli/parseWorkspace';

describe('cli/parseWorkspace', () => {
  it('parses an optional workspace path', () => {
    expect(parseWorkspaceCommand('index', [])).toEqual({ name: 'index' });
    expect(parseWorkspaceCommand('status', ['/workspace/project'])).toEqual({
      name: 'status',
      workspacePath: '/workspace/project',
    });
  });

  it('rejects unknown options and extra arguments', () => {
    expect(parseWorkspaceCommand('status', ['--wat'])).toEqual({
      name: 'status',
      parseError: 'Unknown option for status: --wat',
    });
    expect(parseWorkspaceCommand('index', ['one', 'two'])).toEqual({
      name: 'index',
      parseError: 'Unexpected argument for index: two',
    });
  });
});
