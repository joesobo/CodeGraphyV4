import { describe, expect, it } from 'vitest';
import type { IDiscoveredFile } from '@codegraphy-dev/core';
import { getPluginMatchingFiles, supportsExtension } from '../../../../src/extension/pipeline/plugins/extensions';
import { createPluginInfo } from './testFactories';

describe('pipeline/plugins/extensions', () => {
  it('matches explicit extensions and wildcard plugin extensions', () => {
    expect(supportsExtension(['.ts', '.tsx'], '.ts')).toBe(true);
    expect(supportsExtension(['.ts', '.tsx'], '.py')).toBe(false);
    expect(supportsExtension(['*'], '.md')).toBe(true);
  });

  it('returns discovered files with extensions supported by the plugin', () => {
    const discoveredFiles: Pick<IDiscoveredFile, 'relativePath'>[] = [
      { relativePath: 'src/index.ts' },
      { relativePath: 'src/component.TSX' },
      { relativePath: 'README.md' },
    ];

    const matchingFiles = getPluginMatchingFiles(
      createPluginInfo({ supportedExtensions: ['.ts', '.tsx'] }),
      discoveredFiles,
    );

    expect(matchingFiles).toEqual([
      { relativePath: 'src/index.ts' },
      { relativePath: 'src/component.TSX' },
    ]);
  });
});
