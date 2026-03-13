import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { resolveFile, fileExists } from '../src/fileResolver';

describe('fileExists', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fileresolver-test-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('should return true for existing files', () => {
    const filePath = path.join(tempDir, 'test.ts');
    fs.writeFileSync(filePath, '');
    expect(fileExists(filePath)).toBe(true);
  });

  it('should return false for non-existent files', () => {
    expect(fileExists(path.join(tempDir, 'missing.ts'))).toBe(false);
  });

  it('should return false for directories', () => {
    const dirPath = path.join(tempDir, 'subdir');
    fs.mkdirSync(dirPath);
    expect(fileExists(dirPath)).toBe(false);
  });
});

describe('resolveFile', () => {
  let tempDir: string;

  function createFile(relativePath: string): string {
    const fullPath = path.join(tempDir, relativePath);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, '');
    return fullPath;
  }

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fileresolver-test-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('should return path when file already has extension', () => {
    const filePath = createFile('utils.ts');
    expect(resolveFile(filePath)).toBe(filePath);
  });

  it('should resolve by adding .ts extension', () => {
    const filePath = createFile('utils.ts');
    expect(resolveFile(path.join(tempDir, 'utils'))).toBe(filePath);
  });

  it('should resolve by adding .tsx extension', () => {
    const filePath = createFile('Component.tsx');
    expect(resolveFile(path.join(tempDir, 'Component'))).toBe(filePath);
  });

  it('should resolve by adding .js extension', () => {
    const filePath = createFile('helper.js');
    expect(resolveFile(path.join(tempDir, 'helper'))).toBe(filePath);
  });

  it('should resolve by adding .jsx extension', () => {
    const filePath = createFile('Widget.jsx');
    expect(resolveFile(path.join(tempDir, 'Widget'))).toBe(filePath);
  });

  it('should resolve by adding .mjs extension', () => {
    const filePath = createFile('esm.mjs');
    expect(resolveFile(path.join(tempDir, 'esm'))).toBe(filePath);
  });

  it('should resolve by adding .cjs extension', () => {
    const filePath = createFile('cjs.cjs');
    expect(resolveFile(path.join(tempDir, 'cjs'))).toBe(filePath);
  });

  it('should resolve by adding .json extension', () => {
    const filePath = createFile('data.json');
    expect(resolveFile(path.join(tempDir, 'data'))).toBe(filePath);
  });

  it('should prefer .ts over .js when both exist', () => {
    const tsFile = createFile('utils.ts');
    createFile('utils.js');
    expect(resolveFile(path.join(tempDir, 'utils'))).toBe(tsFile);
  });

  it('should resolve directory index.ts', () => {
    const indexFile = createFile('utils/index.ts');
    expect(resolveFile(path.join(tempDir, 'utils'))).toBe(indexFile);
  });

  it('should resolve directory index.tsx', () => {
    const indexFile = createFile('components/index.tsx');
    expect(resolveFile(path.join(tempDir, 'components'))).toBe(indexFile);
  });

  it('should resolve directory index.js', () => {
    const indexFile = createFile('lib/index.js');
    expect(resolveFile(path.join(tempDir, 'lib'))).toBe(indexFile);
  });

  it('should resolve directory index.jsx', () => {
    const indexFile = createFile('widgets/index.jsx');
    expect(resolveFile(path.join(tempDir, 'widgets'))).toBe(indexFile);
  });

  it('should return null when nothing resolves', () => {
    expect(resolveFile(path.join(tempDir, 'nonexistent'))).toBeNull();
  });
});
