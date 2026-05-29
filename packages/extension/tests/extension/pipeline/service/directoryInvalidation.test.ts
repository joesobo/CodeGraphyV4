import { describe, expect, it, vi } from 'vitest';
import { removeInvalidatedDiscoveredDirectories } from '../../../../src/extension/pipeline/service/directoryInvalidation';

describe('pipeline/service/directoryInvalidation', () => {
  it('removes discovered directories at or below invalidated workspace paths', () => {
    const toWorkspaceRelativePath = vi.fn((workspaceRoot: string, filePath: string) =>
      filePath.startsWith(workspaceRoot) ? filePath.slice(workspaceRoot.length) : undefined,
    );

    expect(removeInvalidatedDiscoveredDirectories(
      ['src', 'src/features', 'src/features/deep', 'docs', 'README.md'],
      ['/workspace/src/features'],
      '/workspace',
      toWorkspaceRelativePath,
    )).toEqual(['src', 'docs', 'README.md']);
  });

  it('normalizes slashes and surrounding separators before matching paths', () => {
    expect(removeInvalidatedDiscoveredDirectories(
      ['src\\features', '///src/features/deep///', 'src/other'],
      ['C:\\repo\\src\\features'],
      'C:\\repo',
      () => '\\\\src\\features\\\\',
    )).toEqual(['src/other']);
  });

  it('returns the existing directory list when no invalidated paths resolve into the workspace', () => {
    const directories = ['src', 'docs'];

    expect(removeInvalidatedDiscoveredDirectories(
      directories,
      ['/outside/src'],
      '/workspace',
      () => undefined,
    )).toEqual(directories);
  });

  it('removes directories below any invalidated path', () => {
    expect(removeInvalidatedDiscoveredDirectories(
      ['src/a', 'src/a/deep', 'src/b', 'src/b/deep', 'src/c'],
      ['/workspace/src/a', '/workspace/src/b'],
      '/workspace',
      (workspaceRoot, filePath) => filePath.slice(workspaceRoot.length),
    )).toEqual(['src/c']);
  });
});
