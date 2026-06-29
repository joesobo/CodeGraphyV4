import { beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import {
  getReusableChangedFileDiscoveryState,
  type ChangedFileDiscoveryState,
} from '../../../../../../src/extension/pipeline/service/refresh/discovery/changed';

const fsMock = vi.hoisted(() => ({
  existsSync: vi.fn(),
}));

vi.mock('node:fs', () => ({
  default: fsMock,
  existsSync: fsMock.existsSync,
}));

function createFile(relativePath: string) {
  return {
    absolutePath: `/workspace/${relativePath.replace(/\\/g, '/')}`,
    extension: '.ts',
    name: relativePath.split(/[\\/]/).at(-1) ?? relativePath,
    relativePath,
  };
}

function createInput(
  overrides: Partial<Parameters<typeof getReusableChangedFileDiscoveryState>[0]> = {},
): Parameters<typeof getReusableChangedFileDiscoveryState>[0] {
  return {
    filePaths: ['src/a.ts'],
    lastDiscoveredDirectories: ['src'],
    lastDiscoveredFiles: [createFile('src/a.ts')],
    lastWorkspaceRoot: '/workspace',
    toWorkspaceRelativePath: vi.fn((_workspaceRoot, filePath) =>
      filePath.replace(/^\/workspace\//, '').replace(/\\/g, '/'),
    ),
    workspaceRoot: '/workspace',
    ...overrides,
  };
}

describe('extension/pipeline/service/refresh/discovery/changed', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fs.existsSync).mockReturnValue(true);
  });

  it.each([
    ['without changed file paths', { filePaths: [] }],
    ['after the workspace root changes', { lastWorkspaceRoot: '/other-workspace' }],
  ])('does not reuse discovery state %s', (_label, overrides) => {
    expect(getReusableChangedFileDiscoveryState(createInput(overrides))).toBeUndefined();
    expect(fs.existsSync).not.toHaveBeenCalled();
  });

  it('does not resolve changed paths without previous discovered files', () => {
    const input = createInput({ lastDiscoveredFiles: [] });

    expect(getReusableChangedFileDiscoveryState(input)).toBeUndefined();
    expect(input.toWorkspaceRelativePath).not.toHaveBeenCalled();
    expect(fs.existsSync).not.toHaveBeenCalled();
  });

  it('reuses previous discovery when every changed path is still discovered and exists', () => {
    const directories = ['src', 'src/nested'];
    const files = [
      createFile('src\\a.ts'),
      createFile('src/nested/b.ts'),
    ];
    const input = createInput({
      filePaths: ['src/a.ts', '/workspace/src/nested/b.ts'],
      lastDiscoveredDirectories: directories,
      lastDiscoveredFiles: files,
    });

    const result = getReusableChangedFileDiscoveryState(input) as ChangedFileDiscoveryState;

    expect(result.files).toBe(files);
    expect(result.directories).toEqual(directories);
    expect(result.directories).not.toBe(directories);
    expect(input.toWorkspaceRelativePath).toHaveBeenNthCalledWith(
      1,
      '/workspace',
      'src/a.ts',
    );
    expect(input.toWorkspaceRelativePath).toHaveBeenNthCalledWith(
      2,
      '/workspace',
      '/workspace/src/nested/b.ts',
    );
    expect(fs.existsSync).toHaveBeenNthCalledWith(1, '/workspace/src/a.ts');
    expect(fs.existsSync).toHaveBeenNthCalledWith(2, '/workspace/src/nested/b.ts');
  });

  it('does not reuse discovery when a changed path cannot become workspace-relative', () => {
    expect(
      getReusableChangedFileDiscoveryState(createInput({
        toWorkspaceRelativePath: vi.fn(() => undefined),
      })),
    ).toBeUndefined();
    expect(fs.existsSync).not.toHaveBeenCalled();
  });

  it('does not reuse discovery when a changed file was not previously discovered', () => {
    expect(
      getReusableChangedFileDiscoveryState(createInput({
        filePaths: ['src/missing.ts'],
      })),
    ).toBeUndefined();
    expect(fs.existsSync).not.toHaveBeenCalled();
  });

  it('does not reuse discovery for a newly created folder path', () => {
    expect(
      getReusableChangedFileDiscoveryState(createInput({
        filePaths: ['/workspace/src/features/generated'],
      })),
    ).toBeUndefined();
    expect(fs.existsSync).not.toHaveBeenCalled();
  });

  it('does not reuse discovery when a changed file no longer exists on disk', () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);

    expect(getReusableChangedFileDiscoveryState(createInput())).toBeUndefined();
    expect(fs.existsSync).toHaveBeenCalledWith('/workspace/src/a.ts');
  });
});
