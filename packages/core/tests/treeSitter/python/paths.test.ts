import { beforeEach, describe, expect, it, vi } from 'vitest';
import { resolvePythonModulePath } from '../../../src/treeSitter/runtime/analyzePython/paths';
import { findExistingFile } from '../../../src/treeSitter/runtime/analyze/existingFile';
import { getPythonSearchRoots } from '../../../src/treeSitter/runtime/projectRoots';

vi.mock('../../../src/treeSitter/runtime/analyze/existingFile', () => ({
  findExistingFile: vi.fn(),
}));

vi.mock('../../../src/treeSitter/runtime/projectRoots', () => ({
  getPythonSearchRoots: vi.fn(),
}));

describe('pipeline/plugins/treesitter/runtime/analyzePython/paths', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('resolves relative package imports by climbing parent directories and checking __init__.py', () => {
    vi.mocked(findExistingFile).mockReturnValue('/workspace/pkg/__init__.py');

    expect(resolvePythonModulePath('/workspace/pkg/app/module.py', '/workspace', '..')).toBe(
      '/workspace/pkg/__init__.py',
    );
    expect(getPythonSearchRoots).not.toHaveBeenCalled();
    expect(findExistingFile).toHaveBeenCalledWith([
      '/workspace/pkg/__init__.py',
    ]);
  });

  it('resolves absolute imports from each search root and its src directory', () => {
    vi.mocked(getPythonSearchRoots).mockReturnValue(['/workspace', '/workspace/libs']);
    vi.mocked(findExistingFile).mockReturnValue('/workspace/libs/src/codegraphy/tools.py');

    expect(resolvePythonModulePath('/workspace/app.py', '/workspace', 'codegraphy.tools')).toBe(
      '/workspace/libs/src/codegraphy/tools.py',
    );
    expect(findExistingFile).toHaveBeenCalledWith([
      '/workspace/codegraphy/tools.py',
      '/workspace/codegraphy/tools/__init__.py',
      '/workspace/src/codegraphy/tools.py',
      '/workspace/src/codegraphy/tools/__init__.py',
      '/workspace/libs/codegraphy/tools.py',
      '/workspace/libs/codegraphy/tools/__init__.py',
      '/workspace/libs/src/codegraphy/tools.py',
      '/workspace/libs/src/codegraphy/tools/__init__.py',
    ]);
  });
});
