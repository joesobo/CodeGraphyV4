import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { FileDiscovery } from '../../../src/discovery/file/service';

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

  function initGitRepo(): void {
    execFileSync('git', ['init', '-q'], { cwd: tempDir });
    execFileSync('git', ['config', 'user.email', 'test@example.com'], { cwd: tempDir });
    execFileSync('git', ['config', 'user.name', 'CodeGraphy Test'], { cwd: tempDir });
  }

  function commitAll(message = 'initial'): void {
    execFileSync('git', ['add', '.'], { cwd: tempDir });
    execFileSync('git', ['commit', '-q', '-m', message], { cwd: tempDir });
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

  it('reports the eligible file count when applying the max file limit', async () => {
    createFile('a.ts');
    createFile('b.ts');
    createFile('c.ts');

    const result = await discovery.discover({
      rootPath: tempDir,
      maxFiles: 1,
    });

    expect(result.files).toHaveLength(1);
    expect(result.limitReached).toBe(true);
    expect(result.totalFound).toBe(3);
  });

  it('counts eligible files across nested directories before applying the limit', async () => {
    createFile('a/one.ts');
    createFile('b/two.ts');
    createFile('c/three.ts');

    const result = await discovery.discover({
      rootPath: tempDir,
      maxFiles: 1,
    });

    expect(result.files).toHaveLength(1);
    expect(result.totalFound).toBe(3);
  });

  it('keeps filtered paths cacheable without retaining eligible files beyond the limit', async () => {
    createFile('.hidden/note.ts');
    createFile('a.ts');
    createFile('b.ts');

    const result = await discovery.discover({
      rootPath: tempDir,
      filter: ['.hidden/**'],
      maxFiles: 1,
      respectGitignore: false,
    });

    expect(result.files.map(file => file.relativePath)).toEqual(['a.ts']);
    expect(result.cacheFilePaths).toEqual(['.hidden/note.ts', 'a.ts']);
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

  it('excludes Finder metadata by default', async () => {
    createFile('src/app.ts');
    createFile('.DS_Store');
    createFile('Assets/.DS_Store');

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

  it('excludes gitignored files by default when the option is omitted', async () => {
    initGitRepo();
    createFile('.gitignore', '*.log\n');
    createFile('app.ts');
    createFile('debug.log');

    const result = await discovery.discover({ rootPath: tempDir });

    expect(result.files.map((file) => file.name)).toContain('app.ts');
    expect(result.files.map((file) => file.name)).not.toContain('debug.log');
    expect(result.gitIgnoredPaths).toContain('debug.log');
  });

  it('keeps scanning after excluding a gitignored file', async () => {
    initGitRepo();
    createFile('.gitignore', '*.log\n');
    createFile('a.log');
    createFile('z.ts');

    const result = await discovery.discover({ rootPath: tempDir });

    expect(result.files.map((file) => file.name)).toContain('.gitignore');
    expect(result.files.map((file) => file.name)).toContain('z.ts');
    expect(result.files.map((file) => file.name)).not.toContain('a.log');
  });

  it('does not infer gitignored state from .gitignore outside a Git repository', async () => {
    createFile('.gitignore', '*.log\n');
    createFile('debug.log');

    const result = await discovery.discover({ rootPath: tempDir });

    expect(result.files.find((file) => file.name === 'debug.log')?.gitIgnored).toBeUndefined();
    expect(result.gitIgnoredPaths).toEqual([]);
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
    expect(result.files.find((file) => file.name === 'debug.log')?.gitIgnored).toBeUndefined();
    expect(result.gitIgnoredPaths).toEqual([]);
  });

  it('excludes files from gitignored directories', async () => {
    initGitRepo();
    createFile('.gitignore', 'generated/\n');
    createFile('generated/output.ts');

    const result = await discovery.discover({ rootPath: tempDir });

    expect(result.directories).not.toContain('generated');
    expect(result.files.map(file => file.relativePath)).not.toContain(path.join('generated', 'output.ts'));
    expect(result.gitIgnoredPaths).toEqual(expect.arrayContaining([
      'generated',
      path.join('generated', 'output.ts'),
    ]));
  });

  it('does not mark tracked files as gitignored even when they match gitignore patterns', async () => {
    initGitRepo();
    createFile('tracked-dir/keep.log', 'tracked');
    commitAll();
    createFile('.gitignore', '*.log\ntracked-dir/\n');
    createFile('tracked-dir/keep.log', 'changed');

    const result = await discovery.discover({ rootPath: tempDir });

    const trackedFile = result.files.find(file =>
      file.relativePath === path.join('tracked-dir', 'keep.log'),
    );
    expect(trackedFile?.relativePath).toBe(path.join('tracked-dir', 'keep.log'));
    expect(trackedFile?.gitIgnored).toBeUndefined();
    expect(result.gitIgnoredPaths).not.toContain(path.join('tracked-dir', 'keep.log'));
  });

  it('keeps tracked files in mixed ignored folders while excluding ignored descendants', async () => {
    initGitRepo();
    createFile('mixed-dir/tracked.ts', 'tracked');
    commitAll();
    createFile('.gitignore', 'mixed-dir/\n');
    createFile('mixed-dir/ignored.ts', 'ignored');

    const result = await discovery.discover({ rootPath: tempDir });

    expect(result.directories).toContain('mixed-dir');
    expect(result.gitIgnoredPaths).not.toContain('mixed-dir');
    expect(result.files.find(file =>
      file.relativePath === path.join('mixed-dir', 'tracked.ts'),
    )?.gitIgnored).toBeUndefined();
    expect(result.files.map(file => file.relativePath)).not.toContain(
      path.join('mixed-dir', 'ignored.ts'),
    );
    expect(result.gitIgnoredPaths).toContain(path.join('mixed-dir', 'ignored.ts'));
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
    expect(result.directories).toEqual(['empty']);
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
