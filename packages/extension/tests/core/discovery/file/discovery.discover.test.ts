import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { FileDiscovery } from '../../../../src/core/discovery/file/service';

describe('FileDiscovery discover', () => {
  let discovery: FileDiscovery;
  let tempDir: string;

  function createFile(relativePath: string, content = ''): void {
    const fullPath = path.join(tempDir, relativePath);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, content);
  }

  function createDir(relativePath: string): void {
    fs.mkdirSync(path.join(tempDir, relativePath), { recursive: true });
  }

  beforeEach(() => {
    discovery = new FileDiscovery();
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'codegraphy-test-'));
  });

  afterEach(() => {
    vi.restoreAllMocks();
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('discovers files in a directory', async () => {
    createFile('src/app.ts', 'console.log("app")');
    createFile('src/utils.ts', 'export const x = 1');

    const result = await discovery.discover({ rootPath: tempDir });

    expect(result.files.map((file) => file.relativePath)).toEqual(
      expect.arrayContaining([
        path.join('src', 'app.ts'),
        path.join('src', 'utils.ts'),
      ])
    );
  });

  it('includes file metadata', async () => {
    createFile('src/app.ts');

    const result = await discovery.discover({ rootPath: tempDir });

    expect(result.files[0]).toEqual({
      relativePath: path.join('src', 'app.ts'),
      absolutePath: path.join(tempDir, 'src', 'app.ts'),
      extension: '.ts',
      name: 'app.ts',
    });
  });

  it('stops immediately after hitting the max file limit', async () => {
    createFile('a.ts');
    createFile('b.ts');
    createFile('c.ts');

    const result = await discovery.discover({
      rootPath: tempDir,
      maxFiles: 1,
    });

    expect(result.files).toHaveLength(1);
    expect(result.limitReached).toBe(true);
    expect(result.totalFound).toBe(2);
  });

  it('bubbles nested max file stops back to the root walk', async () => {
    createFile('a/one.ts');
    createFile('b/two.ts');
    createFile('c/three.ts');

    const result = await discovery.discover({
      rootPath: tempDir,
      maxFiles: 1,
    });

    expect(result.files).toHaveLength(1);
    expect(result.totalFound).toBe(2);
  });

  it('reports limitReached as false when under the limit', async () => {
    createFile('a.ts');
    createFile('b.ts');

    const result = await discovery.discover({
      rootPath: tempDir,
      maxFiles: 10,
    });

    expect(result.limitReached).toBe(false);
    expect(result.totalFound).toBeUndefined();
  });

  it('applies include patterns', async () => {
    createFile('src/app.ts');
    createFile('lib/helper.ts');
    createFile('test/app.test.ts');

    const result = await discovery.discover({
      rootPath: tempDir,
      include: ['src/**/*'],
    });

    expect(result.files.map((file) => file.relativePath)).toEqual([path.join('src', 'app.ts')]);
  });

  it('applies exclude patterns', async () => {
    createFile('src/app.ts');
    createFile('src/app.test.ts');
    createFile('src/utils.ts');

    const result = await discovery.discover({
      rootPath: tempDir,
      exclude: ['**/*.test.ts'],
    });

    expect(result.files.map((file) => file.name)).toEqual(
      expect.arrayContaining(['app.ts', 'utils.ts'])
    );
    expect(result.files.map((file) => file.name)).not.toContain('app.test.ts');
  });

  it('excludes node_modules by default', async () => {
    createFile('src/app.ts');
    createFile('node_modules/lodash/index.js');
    createFile('packages/demo/node_modules/react/index.js');

    const result = await discovery.discover({ rootPath: tempDir });

    expect(result.files.map((file) => file.relativePath)).toEqual([path.join('src', 'app.ts')]);
  });

  it('excludes dist by default', async () => {
    createFile('src/app.ts');
    createFile('dist/app.js');

    const result = await discovery.discover({ rootPath: tempDir });

    expect(result.files.map((file) => file.relativePath)).toEqual([path.join('src', 'app.ts')]);
  });

  it('filters by extensions', async () => {
    createFile('app.ts');
    createFile('app.js');
    createFile('styles.css');

    const result = await discovery.discover({
      rootPath: tempDir,
      extensions: ['.ts'],
    });

    expect(result.files.map((file) => file.extension)).toEqual(['.ts']);
  });

  it('respects gitignore by default when the option is omitted', async () => {
    createFile('.gitignore', '*.log\n');
    createFile('app.ts');
    createFile('debug.log');

    const result = await discovery.discover({ rootPath: tempDir });

    expect(result.files.map((file) => file.name)).toContain('app.ts');
    expect(result.files.map((file) => file.name)).not.toContain('debug.log');
  });

  it('keeps scanning after skipping a gitignored file', async () => {
    createFile('.gitignore', '*.log\n');
    createFile('a.log');
    createFile('z.ts');

    const result = await discovery.discover({ rootPath: tempDir });

    expect(result.files.map((file) => file.name)).toContain('.gitignore');
    expect(result.files.map((file) => file.name)).toContain('z.ts');
    expect(result.files.map((file) => file.name)).not.toContain('a.log');
  });

  it('ignores gitignore patterns when disabled', async () => {
    createFile('.gitignore', '*.log');
    createFile('app.ts');
    createFile('debug.log');

    const result = await discovery.discover({
      rootPath: tempDir,
      respectGitignore: false,
    });

    expect(result.files.map((file) => file.name)).toEqual(
      expect.arrayContaining(['app.ts', 'debug.log'])
    );
  });

  it('returns the exact discovery duration', async () => {
    createFile('app.ts');
    vi.spyOn(Date, 'now')
      .mockReturnValueOnce(100)
      .mockReturnValueOnce(130);

    const result = await discovery.discover({ rootPath: tempDir });

    expect(result.durationMs).toBe(30);
  });

  it('handles empty directories', async () => {
    createDir('empty');

    const result = await discovery.discover({ rootPath: tempDir });

    expect(result.files).toHaveLength(0);
  });

  it('handles deeply nested files', async () => {
    createFile('a/b/c/d/e/deep.ts');

    const result = await discovery.discover({ rootPath: tempDir });

    expect(result.files.map((file) => file.relativePath)).toEqual([
      path.join('a', 'b', 'c', 'd', 'e', 'deep.ts'),
    ]);
  });

  it('excludes .git directories by default', async () => {
    createFile('app.ts');
    createFile('.git/config');
    createFile('packages/demo/.git/objects/abc');

    const result = await discovery.discover({ rootPath: tempDir });

    expect(result.files.map((file) => file.name)).toEqual(['app.ts']);
  });

  it('skips unreadable directories and keeps scanning siblings', async () => {
    createDir('a-private');
    createFile('z.ts');

    const originalReaddir = fs.promises.readdir.bind(fs.promises);
    const readdirSpy = vi.spyOn(fs.promises, 'readdir');

    readdirSpy.mockImplementation(
      (async (
        directoryPath: Parameters<typeof fs.promises.readdir>[0],
        options: Parameters<typeof fs.promises.readdir>[1],
      ) => {
        if (directoryPath === path.join(tempDir, 'a-private')) {
          throw new Error('EACCES');
        }

        return originalReaddir(directoryPath, options as never);
      }) as never,
    );

    const result = await discovery.discover({ rootPath: tempDir });

    expect(result.files.map((file) => file.name)).toEqual(['z.ts']);
  });

  it('throws an abort error before discovery starts when the signal is already aborted', async () => {
    createFile('app.ts');
    const controller = new AbortController();
    controller.abort();

    await expect(
      discovery.discover({
        rootPath: tempDir,
        signal: controller.signal,
      })
    ).rejects.toMatchObject({
      name: 'AbortError',
      message: 'Discovery aborted',
    });
  });

  it('throws an abort error during a nested walk when the signal aborts mid-discovery', async () => {
    createFile('a/file.ts');
    createFile('z.ts');
    const controller = new AbortController();
    const originalReaddir = fs.promises.readdir.bind(fs.promises);
    const readdirSpy = vi.spyOn(fs.promises, 'readdir');
    let readdirCallCount = 0;

    readdirSpy.mockImplementation(
      (async (
        directoryPath: Parameters<typeof fs.promises.readdir>[0],
        options: Parameters<typeof fs.promises.readdir>[1],
      ) => {
        readdirCallCount += 1;
        const result = await originalReaddir(directoryPath, options as never);

        if (readdirCallCount === 2) {
          controller.abort();
        }

        return result;
      }) as never,
    );

    await expect(
      discovery.discover({
        rootPath: tempDir,
        signal: controller.signal,
      })
    ).rejects.toMatchObject({
      name: 'AbortError',
      message: 'Discovery aborted',
    });
  });
});
