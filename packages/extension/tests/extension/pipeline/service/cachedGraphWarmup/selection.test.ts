import { describe, expect, it, vi } from 'vitest';
import type { IDiscoveredFile } from '@codegraphy-dev/core';
import { selectCachedGraphAnalysisWarmupFile } from '../../../../../src/extension/pipeline/service/cachedGraphWarmup/selection';

function file(relativePath: string, extension: string): IDiscoveredFile {
  return { absolutePath: `/workspace/${relativePath}`, extension, relativePath } as IDiscoveredFile;
}

describe('extension/pipeline/service/cachedGraphWarmup/selection', () => {
  const generated = file('dist/generated.ts', '.ts');
  const firstTypeScript = file('src/a.ts', '.ts');
  const python = file('src/b.py', '.py');
  const secondTypeScript = file('src/c.ts', '.ts');

  it('uses the first file when the registry has no support predicate', () => {
    expect(selectCachedGraphAnalysisWarmupFile({}, [firstTypeScript, python])).toBe(firstTypeScript);
    expect(selectCachedGraphAnalysisWarmupFile({}, [])).toBeUndefined();
  });

  it('selects the most represented supported candidate outside generated folders', () => {
    const supportsFile = vi.fn((filePath: string) => filePath.endsWith('.ts'));

    expect(selectCachedGraphAnalysisWarmupFile(
      { supportsFile },
      [generated, firstTypeScript, python, secondTypeScript],
    )).toBe(firstTypeScript);
    expect(supportsFile).not.toHaveBeenCalledWith('/workspace/dist/generated.ts');
  });

  it('falls back to supported generated files and then the first file', () => {
    expect(selectCachedGraphAnalysisWarmupFile(
      { supportsFile: filePath => filePath.includes('generated') },
      [generated, python],
    )).toBe(generated);

    expect(selectCachedGraphAnalysisWarmupFile(
      { supportsFile: () => false },
      [generated, python],
    )).toBe(generated);
  });
});
