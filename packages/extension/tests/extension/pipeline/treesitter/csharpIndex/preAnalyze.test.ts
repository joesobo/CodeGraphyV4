import { beforeEach, describe, expect, it, vi } from 'vitest';
import { preAnalyzeCSharpTreeSitterFiles } from '../../../../../src/extension/pipeline/plugins/treesitter/runtime/csharpIndex/preAnalyze';
import { createTreeSitterRuntime } from '../../../../../src/extension/pipeline/plugins/treesitter/runtime/languages';
import { indexCSharpTree } from '../../../../../src/extension/pipeline/plugins/treesitter/runtime/csharpIndex/tree';
import {
  clearCSharpWorkspaceIndex,
  createEmptyCSharpIndex,
  setCSharpWorkspaceIndex,
} from '../../../../../src/extension/pipeline/plugins/treesitter/runtime/csharpIndex/store';

vi.mock('../../../../../src/extension/pipeline/plugins/treesitter/runtime/languages', () => ({
  createTreeSitterRuntime: vi.fn(),
}));

vi.mock('../../../../../src/extension/pipeline/plugins/treesitter/runtime/csharpIndex/tree', () => ({
  indexCSharpTree: vi.fn(),
}));

vi.mock('../../../../../src/extension/pipeline/plugins/treesitter/runtime/csharpIndex/store', () => ({
  clearCSharpWorkspaceIndex: vi.fn(),
  createEmptyCSharpIndex: vi.fn(),
  setCSharpWorkspaceIndex: vi.fn(),
}));

describe('pipeline/plugins/treesitter/runtime/csharpIndex/preAnalyze', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(createEmptyCSharpIndex).mockReturnValue({ typesByQualifiedName: new Map() } as never);
  });

  it('clears the workspace index when no C# files are present', async () => {
    await preAnalyzeCSharpTreeSitterFiles(
      [{ absolutePath: '/workspace/src/app.ts', content: 'export {}' }],
      '/workspace',
    );

    expect(clearCSharpWorkspaceIndex).toHaveBeenCalledWith('/workspace');
    expect(createEmptyCSharpIndex).not.toHaveBeenCalled();
    expect(setCSharpWorkspaceIndex).not.toHaveBeenCalled();
  });

  it('indexes only files with a C# runtime and stores the completed workspace index', async () => {
    const parserParse = vi.fn((content: string) => ({ parsed: content }));
    vi.mocked(createTreeSitterRuntime)
      .mockResolvedValueOnce({
        languageKind: 'csharp',
        parser: { parse: parserParse },
      } as never)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        languageKind: 'typescript',
        parser: { parse: vi.fn() },
      } as never);

    await preAnalyzeCSharpTreeSitterFiles(
      [
        { absolutePath: '/workspace/src/Program.cs', content: 'class Program {}' },
        { absolutePath: '/workspace/src/ignored.CS', content: 'class Ignored {}' },
        { absolutePath: '/workspace/src/not-csharp.cs', content: 'const value = 1;' },
        { absolutePath: '/workspace/src/app.ts', content: 'export {}' },
      ],
      '/workspace',
    );

    expect(createTreeSitterRuntime).toHaveBeenCalledTimes(3);
    expect(parserParse).toHaveBeenCalledWith('class Program {}');
    expect(indexCSharpTree).toHaveBeenCalledTimes(1);
    expect(indexCSharpTree).toHaveBeenCalledWith(
      { parsed: 'class Program {}' },
      '/workspace/src/Program.cs',
      expect.objectContaining({ typesByQualifiedName: expect.any(Map) }),
    );
    expect(setCSharpWorkspaceIndex).toHaveBeenCalledWith(
      '/workspace',
      expect.objectContaining({ typesByQualifiedName: expect.any(Map) }),
    );
  });
});
