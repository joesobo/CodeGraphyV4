import fs, { type Dirent } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

interface PackageManifest {
  scripts: Readonly<Record<string, string>>;
}

const packageRoot = path.resolve(import.meta.dirname, '..');
const manifest = JSON.parse(
  fs.readFileSync(path.join(packageRoot, 'package.json'), 'utf8'),
) as PackageManifest;

function authoredJavaScriptFiles(directory: string): string[] {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(
    (entry: Dirent): string[] => {
      const entryPath = path.join(directory, entry.name);
      if (entry.isDirectory()) return authoredJavaScriptFiles(entryPath);
      return /\.(?:c|m)?js$/u.test(entry.name) ? [entryPath] : [];
    },
  );
}

describe('tldraw package structure', () => {
  it('keeps authored logic in checked TypeScript files', () => {
    expect(Object.keys(manifest.scripts).sort()).toEqual([
      'build',
      'lint',
      'test',
      'typecheck',
    ]);
    expect(manifest.scripts.build).toBe('tsx ./scripts/build.ts');
    expect(manifest.scripts.lint).toMatch(/\bscripts\b/u);
    expect(
      authoredJavaScriptFiles(path.join(packageRoot, 'scripts')),
    ).toEqual([]);
    expect(
      fs.existsSync(path.join(packageRoot, 'scripts', 'build.ts')),
    ).toBe(true);
  });

  it('keeps tests in a mirrored package test tree', () => {
    const sourceFiles: string[] = fs.readdirSync(
      path.join(packageRoot, 'src'),
      { encoding: 'utf8', recursive: true },
    );
    const testFiles: string[] = fs.readdirSync(
      path.join(packageRoot, 'tests'),
      { encoding: 'utf8', recursive: true },
    );

    expect(sourceFiles.filter(file => file.endsWith('.test.ts'))).toEqual([]);
    expect(testFiles.some(file => file.endsWith('.test.ts'))).toBe(true);
  });
});
