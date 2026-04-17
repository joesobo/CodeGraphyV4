import { beforeEach, describe, expect, it, vi } from 'vitest';
import { resolveRustModuleDeclarationPath } from '../../../../src/extension/pipeline/plugins/treesitter/runtime/analyze/rust/moduleDeclarationPath';
import { findExistingFile } from '../../../../src/extension/pipeline/plugins/treesitter/runtime/analyze/existingFile';

vi.mock('../../../../src/extension/pipeline/plugins/treesitter/runtime/analyze/existingFile', () => ({
  findExistingFile: vi.fn(),
}));

describe('pipeline/plugins/treesitter/runtime/analyze/rust/moduleDeclarationPath', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.each([
    ['/workspace/src/lib.rs', '/workspace/src'],
    ['/workspace/src/main.rs', '/workspace/src'],
    ['/workspace/src/mod.rs', '/workspace/src'],
    ['/workspace/src/http.rs', '/workspace/src/http'],
  ])('builds candidates for %s from %s', (filePath, nestedDirectoryPath) => {
    vi.mocked(findExistingFile).mockReturnValue('/workspace/src/routes.rs');

    const result = resolveRustModuleDeclarationPath(filePath, 'routes');

    expect(result).toBe('/workspace/src/routes.rs');
    expect(findExistingFile).toHaveBeenCalledWith([
      `${nestedDirectoryPath}/routes.rs`,
      `${nestedDirectoryPath}/routes/mod.rs`,
      '/workspace/src/routes.rs',
      '/workspace/src/routes/mod.rs',
    ]);
  });

  it('returns null when no Rust module candidate exists', () => {
    vi.mocked(findExistingFile).mockReturnValue(null);

    expect(resolveRustModuleDeclarationPath('/workspace/src/http.rs', 'handlers')).toBeNull();
  });
});
