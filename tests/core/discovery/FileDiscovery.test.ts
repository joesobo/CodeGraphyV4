import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { FileDiscovery } from '../../../src/core/discovery';

describe('FileDiscovery', () => {
  let discovery: FileDiscovery;
  let tempDir: string;

  // Helper to create files in temp directory
  function createFile(relativePath: string, content = ''): void {
    const fullPath = path.join(tempDir, relativePath);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, content);
  }

  // Helper to create a directory
  function createDir(relativePath: string): void {
    const fullPath = path.join(tempDir, relativePath);
    fs.mkdirSync(fullPath, { recursive: true });
  }

  beforeEach(() => {
    discovery = new FileDiscovery();
    // Create a unique temp directory for each test
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'codegraphy-test-'));
  });

  afterEach(() => {
    // Clean up temp directory
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('discover', () => {
    it('should discover files in a directory', async () => {
      createFile('src/app.ts', 'console.log("app")');
      createFile('src/utils.ts', 'export const x = 1');

      const result = await discovery.discover({
        rootPath: tempDir,
      });

      expect(result.files).toHaveLength(2);
      expect(result.files.map((f) => f.relativePath)).toContain(path.join('src', 'app.ts'));
      expect(result.files.map((f) => f.relativePath)).toContain(path.join('src', 'utils.ts'));
    });

    it('should include file metadata', async () => {
      createFile('src/app.ts');

      const result = await discovery.discover({
        rootPath: tempDir,
      });

      const file = result.files[0];
      expect(file.name).toBe('app.ts');
      expect(file.extension).toBe('.ts');
      expect(file.absolutePath).toBe(path.join(tempDir, 'src', 'app.ts'));
    });

    it('should respect maxFiles limit', async () => {
      createFile('a.ts');
      createFile('b.ts');
      createFile('c.ts');
      createFile('d.ts');
      createFile('e.ts');

      const result = await discovery.discover({
        rootPath: tempDir,
        maxFiles: 3,
      });

      expect(result.files).toHaveLength(3);
      expect(result.limitReached).toBe(true);
      expect(result.totalFound).toBeGreaterThanOrEqual(3);
    });

    it('should report limitReached as false when under limit', async () => {
      createFile('a.ts');
      createFile('b.ts');

      const result = await discovery.discover({
        rootPath: tempDir,
        maxFiles: 10,
      });

      expect(result.files).toHaveLength(2);
      expect(result.limitReached).toBe(false);
      expect(result.totalFound).toBeUndefined();
    });

    it('should apply include patterns', async () => {
      createFile('src/app.ts');
      createFile('lib/helper.ts');
      createFile('test/app.test.ts');

      const result = await discovery.discover({
        rootPath: tempDir,
        include: ['src/**/*'],
      });

      expect(result.files).toHaveLength(1);
      expect(result.files[0].relativePath).toBe(path.join('src', 'app.ts'));
    });

    it('should apply exclude patterns', async () => {
      createFile('src/app.ts');
      createFile('src/app.test.ts');
      createFile('src/utils.ts');

      const result = await discovery.discover({
        rootPath: tempDir,
        exclude: ['**/*.test.ts'],
      });

      expect(result.files).toHaveLength(2);
      expect(result.files.map((f) => f.name)).not.toContain('app.test.ts');
    });

    it('should exclude node_modules by default', async () => {
      createFile('src/app.ts');
      createFile('node_modules/lodash/index.js');

      const result = await discovery.discover({
        rootPath: tempDir,
      });

      expect(result.files).toHaveLength(1);
      expect(result.files[0].relativePath).toBe(path.join('src', 'app.ts'));
    });

    it('should exclude dist by default', async () => {
      createFile('src/app.ts');
      createFile('dist/app.js');

      const result = await discovery.discover({
        rootPath: tempDir,
      });

      expect(result.files).toHaveLength(1);
    });

    it('should filter by extensions', async () => {
      createFile('app.ts');
      createFile('app.js');
      createFile('styles.css');

      const result = await discovery.discover({
        rootPath: tempDir,
        extensions: ['.ts'],
      });

      expect(result.files).toHaveLength(1);
      expect(result.files[0].extension).toBe('.ts');
    });

    it('should respect .gitignore when enabled', async () => {
      // Note: Using patterns that work with the 'ignore' package
      createFile('.gitignore', '*.log\n');
      createFile('app.ts');
      createFile('debug.log');

      const result = await discovery.discover({
        rootPath: tempDir,
        respectGitignore: true,
      });

      // Should only find app.ts (debug.log is gitignored)
      const names = result.files.map((f) => f.name);
      expect(names).toContain('app.ts');
      expect(names).not.toContain('debug.log');
    });

    it('should ignore .gitignore when disabled', async () => {
      createFile('.gitignore', '*.log');
      createFile('app.ts');
      createFile('debug.log');

      const result = await discovery.discover({
        rootPath: tempDir,
        respectGitignore: false,
      });

      // Should find both files (excluding .gitignore itself which might be filtered)
      const names = result.files.map((f) => f.name);
      expect(names).toContain('app.ts');
      expect(names).toContain('debug.log');
    });

    it('should include duration in result', async () => {
      createFile('app.ts');

      const result = await discovery.discover({
        rootPath: tempDir,
      });

      expect(result.durationMs).toBeGreaterThanOrEqual(0);
    });

    it('should handle empty directories', async () => {
      createDir('empty');

      const result = await discovery.discover({
        rootPath: tempDir,
      });

      expect(result.files).toHaveLength(0);
    });

    it('should handle deeply nested files', async () => {
      createFile('a/b/c/d/e/deep.ts');

      const result = await discovery.discover({
        rootPath: tempDir,
      });

      expect(result.files).toHaveLength(1);
      expect(result.files[0].relativePath).toBe(path.join('a', 'b', 'c', 'd', 'e', 'deep.ts'));
    });

    it('should exclude .git directory by default', async () => {
      createFile('app.ts');
      createFile('.git/config');
      createFile('.git/objects/abc');

      const result = await discovery.discover({
        rootPath: tempDir,
      });

      expect(result.files).toHaveLength(1);
      expect(result.files[0].name).toBe('app.ts');
    });
  });

  describe('readContent', () => {
    it('should read file content', async () => {
      const content = 'export const greeting = "hello";';
      createFile('app.ts', content);

      const result = await discovery.discover({ rootPath: tempDir });
      const fileContent = await discovery.readContent(result.files[0]);

      expect(fileContent).toBe(content);
    });

    it('should handle UTF-8 content', async () => {
      const content = 'const emoji = "🎉"; // Unicode test';
      createFile('emoji.ts', content);

      const result = await discovery.discover({ rootPath: tempDir });
      const fileContent = await discovery.readContent(result.files[0]);

      expect(fileContent).toBe(content);
    });
  });
});
