import { describe, expect, it } from 'vitest';
import { resolveWorkspaceCreatePath } from '../../../src/extension/actions/createPath';

describe('actions/createPath', () => {
  it('returns trimmed safe workspace-relative paths', () => {
    expect(resolveWorkspaceCreatePath('  src/core/menuCreated.ts  ', 'file')).toBe(
      'src/core/menuCreated.ts',
    );
  });

  it.each([
    '',
    '   ',
    '../outside.ts',
    'src/../outside.ts',
    '/absolute.ts',
    'C:/outside.ts',
    'nested\\file.ts',
  ])('rejects unsafe file paths: %j', (input) => {
    expect(() => resolveWorkspaceCreatePath(input, 'file')).toThrow(
      'Enter a relative file path inside the workspace.',
    );
  });

  it('uses a folder-specific validation message', () => {
    expect(() => resolveWorkspaceCreatePath('../outside', 'folder')).toThrow(
      'Enter a relative folder path inside the workspace.',
    );
  });
});
