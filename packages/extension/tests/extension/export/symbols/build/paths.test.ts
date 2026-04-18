import { describe, expect, it } from 'vitest';
import {
  createExportFilePathResolver,
  sortByFilePath,
} from '../../../../../src/extension/export/symbols/build/paths';

describe('extension/export/symbols/build/paths', () => {
  it('sorts file-backed items by file path without mutating the input array', () => {
    const input = [
      { filePath: 'src/z.ts', id: 'z' },
      { filePath: 'src/a.ts', id: 'a' },
      { filePath: 'src/m.ts', id: 'm' },
    ];

    expect(sortByFilePath(input)).toEqual([
      { filePath: 'src/a.ts', id: 'a' },
      { filePath: 'src/m.ts', id: 'm' },
      { filePath: 'src/z.ts', id: 'z' },
    ]);
    expect(input).toEqual([
      { filePath: 'src/z.ts', id: 'z' },
      { filePath: 'src/a.ts', id: 'a' },
      { filePath: 'src/m.ts', id: 'm' },
    ]);
  });

  it('resolves exact export file paths after normalizing path separators', () => {
    const resolveFilePath = createExportFilePathResolver([
      'src/app.ts',
      'src/lib/util.ts',
    ]);

    expect(resolveFilePath('src\\app.ts')).toBe('src/app.ts');
    expect(resolveFilePath('src/lib/util.ts')).toBe('src/lib/util.ts');
  });

  it('prefers an exact export-path match over a suffix-only candidate', () => {
    const resolveFilePath = createExportFilePathResolver([
      'app.ts',
      'src/app.ts',
    ]);

    expect(resolveFilePath('src\\app.ts')).toBe('src/app.ts');
    expect(resolveFilePath('/workspace/project/app.ts')).toBe('app.ts');
  });

  it('resolves nested absolute paths to the exported path suffix and falls back to normalized paths', () => {
    const resolveFilePath = createExportFilePathResolver([
      'src/app.ts',
      'src/lib/util.ts',
    ]);

    expect(resolveFilePath('/workspace/project/src/lib/util.ts')).toBe('src/lib/util.ts');
    expect(resolveFilePath('C:\\workspace\\project\\src\\app.ts')).toBe('src/app.ts');
    expect(resolveFilePath('src/unknown.ts')).toBe('src/unknown.ts');
  });
});
