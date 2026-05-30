import { describe, expect, it } from 'vitest';
import { collectTypeScriptFilePaths, isTypeScriptConfigFile } from '../../src/aliasImport/files';

describe('TypeScript Alias Import file classification', () => {
  it('matches only tsconfig JSON files', () => {
    expect(isTypeScriptConfigFile('tsconfig.json')).toBe(true);
    expect(isTypeScriptConfigFile('config/tsconfig.app.json')).toBe(true);
    expect(isTypeScriptConfigFile('app.tsconfig.json')).toBe(false);
    expect(isTypeScriptConfigFile('tsconfig.json.bak')).toBe(false);
  });

  it('collects TypeScript source files for re-analysis', () => {
    const files = [
      { absolutePath: '/repo/src/app.ts', relativePath: 'src/app.ts', content: '' },
      { absolutePath: '/repo/src/view.tsx', relativePath: 'src/view.tsx', content: '' },
      { absolutePath: '/repo/src/module.mts', relativePath: 'src/module.mts', content: '' },
      { absolutePath: '/repo/src/common.cts', relativePath: 'src/common.cts', content: '' },
      { absolutePath: '/repo/src/app.js', relativePath: 'src/app.js', content: '' },
    ];

    const typeScriptFiles = collectTypeScriptFilePaths(files);

    expect(typeScriptFiles).toHaveLength(4);
    expect(typeScriptFiles).toEqual([
      'src/app.ts',
      'src/view.tsx',
      'src/module.mts',
      'src/common.cts',
    ]);
  });
});
