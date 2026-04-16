import { beforeEach, describe, expect, it, vi } from 'vitest';

const fsMock = vi.hoisted(() => ({
  existsSync: vi.fn(),
  statSync: vi.fn(),
  readdirSync: vi.fn(),
}));

const goModuleMock = vi.hoisted(() => ({
  resolveGoPackageDirectory: vi.fn(),
}));

const sharedMock = vi.hoisted(() => ({
  findNearestProjectRoot: vi.fn(),
}));

vi.mock('node:fs', () => fsMock);
vi.mock('../../../../../src/extension/pipeline/plugins/treesitter/runtime/projectRoots/goModule', () => goModuleMock);
vi.mock('../../../../../src/extension/pipeline/plugins/treesitter/runtime/projectRoots/shared', () => sharedMock);

import { resolveGoPackagePath } from '../../../../../src/extension/pipeline/plugins/treesitter/runtime/projectRoots/goPackagePath';

describe('pipeline/plugins/treesitter/runtime/projectRoots/goPackagePath behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sharedMock.findNearestProjectRoot.mockReturnValue('/workspace/project');
  });

  it('sorts filtered go source files and excludes test or non-go entries', () => {
    goModuleMock.resolveGoPackageDirectory.mockReturnValue('/workspace/project/pkg/api');
    fsMock.existsSync.mockImplementation((target: string) => target !== '/workspace/project/pkg/api.go');
    fsMock.statSync.mockImplementation((target: string) => ({
      isFile: () => target === '/workspace/project/pkg/api.go',
      isDirectory: () => target === '/workspace/project/pkg/api',
    }));
    fsMock.readdirSync.mockReturnValue(['zeta.go', 'notes.txt', 'alpha.go', 'alpha_test.go']);

    expect(
      resolveGoPackagePath('/workspace/project/cmd/app/main.go', '/workspace', 'github.com/acme/project/pkg/api'),
    ).toBe('/workspace/project/pkg/api/alpha.go');
    expect(sharedMock.findNearestProjectRoot).toHaveBeenCalledWith(
      '/workspace/project/cmd/app/main.go',
      ['go.mod'],
      '/workspace',
    );
  });

  it('returns null immediately when the package directory cannot be resolved', () => {
    sharedMock.findNearestProjectRoot.mockReturnValue(null);
    goModuleMock.resolveGoPackageDirectory.mockReturnValue(null);

    expect(
      resolveGoPackagePath('/workspace/project/cmd/app/main.go', '/workspace', 'github.com/acme/project/pkg/api'),
    ).toBeNull();
    expect(fsMock.existsSync).not.toHaveBeenCalled();
    expect(fsMock.readdirSync).not.toHaveBeenCalled();
  });
});
