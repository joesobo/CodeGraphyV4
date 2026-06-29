import { describe, expect, it } from 'vitest';
import { resolveWorkspaceCreatePath } from '../../../src/extension/actions/createPath';

describe('actions/createPath', () => {
  it('returns trimmed safe workspace-relative paths', () => {
    expect(resolveWorkspaceCreatePath('  src/core/menuCreated.ts  ', 'file')).toBe(
      'src/core/menuCreated.ts',
    );
  });

  it.each([
    ['root file', 'a.ts'],
    ['single nested file', 'src/menuCreated.ts'],
    ['deep nested file', 'src/features/generated/deep/menuCreated.test.ts'],
    ['long but valid file path', `${'generated-'.repeat(12)}folder/${'component-'.repeat(12)}view.tsx`],
    ['basename with spaces and punctuation', 'src/new menu/item [draft].ts'],
    ['dotfile', 'src/.env.local'],
  ])('accepts %s', (_label, input) => {
    expect(resolveWorkspaceCreatePath(input, 'file')).toBe(input);
  });

  it.each([
    '',
    '   ',
    '../outside.ts',
    'src/../outside.ts',
    '/absolute.ts',
    'C:/outside.ts',
    'C:',
    'src//menuCreated.ts',
    'src/menuCreated.ts/',
    './menuCreated.ts',
    'src/./menuCreated.ts',
    'nested\\file.ts',
    'src/\u0000file.ts',
    'src/\nfile.ts',
    'src/\u007Ffile.ts',
  ])('rejects unsafe file paths: %j', (input) => {
    expect(() => resolveWorkspaceCreatePath(input, 'file')).toThrow(
      'Enter a relative file path inside the workspace.',
    );
  });

  it.each([
    ['root folder', 'src'],
    ['nested folder', 'src/features/generated'],
    ['long but valid folder path', `${'generated-'.repeat(12)}folder/${'slice-'.repeat(12)}area`],
    ['folder with spaces and punctuation', 'src/new menu/items [draft]'],
    ['dotfolder', 'src/.storybook'],
  ])('accepts %s', (_label, input) => {
    expect(resolveWorkspaceCreatePath(input, 'folder')).toBe(input);
  });

  it('uses a folder-specific validation message', () => {
    expect(() => resolveWorkspaceCreatePath('../outside', 'folder')).toThrow(
      'Enter a relative folder path inside the workspace.',
    );
  });
});
