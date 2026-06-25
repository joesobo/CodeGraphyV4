import { describe, expect, it } from 'vitest';
import type { IDiscoveredFile } from '@codegraphy-dev/core';
import { selectMostRepresentedCachedGraphWarmupFile } from '../../../../../src/extension/pipeline/service/cachedGraphWarmup/ranking';

function file(relativePath: string, extension: string): IDiscoveredFile {
  return { absolutePath: `/workspace/${relativePath}`, extension, relativePath } as IDiscoveredFile;
}

describe('extension/pipeline/service/cachedGraphWarmup/ranking', () => {
  it('returns undefined when there are no supported files', () => {
    expect(selectMostRepresentedCachedGraphWarmupFile([])).toBeUndefined();
  });

  it('selects the first file from the most represented extension', () => {
    const python = file('src/b.py', '.py');
    const firstTypeScript = file('src/a.ts', '.ts');
    const secondTypeScript = file('src/c.ts', '.ts');

    expect(selectMostRepresentedCachedGraphWarmupFile([
      python,
      firstTypeScript,
      secondTypeScript,
    ])).toBe(firstTypeScript);
  });

  it('uses the earliest represented extension as the tie breaker', () => {
    const python = file('src/b.py', '.py');
    const typeScript = file('src/a.ts', '.ts');

    expect(selectMostRepresentedCachedGraphWarmupFile([python, typeScript])).toBe(python);
  });
});
