import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { PathResolver } from '../../../src/plugins/typescript/PathResolver';

describe('PathResolver', () => {
  let tempDir: string;

  // Helper to create files
  function createFile(relativePath: string, content = ''): string {
    const fullPath = path.join(tempDir, relativePath);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, content);
    return fullPath;
  }

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pathresolver-test-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  describe('relative imports', () => {
    it('should resolve relative import in same directory', () => {
      createFile('src/utils.ts');
      const fromFile = path.join(tempDir, 'src', 'app.ts');
      const resolver = new PathResolver(tempDir);

      const result = resolver.resolve('./utils', fromFile);

      expect(result).toBe(path.join(tempDir, 'src', 'utils.ts'));
    });

    it('should resolve relative import in parent directory', () => {
      createFile('utils.ts');
      const fromFile = path.join(tempDir, 'src', 'app.ts');
      const resolver = new PathResolver(tempDir);

      const result = resolver.resolve('../utils', fromFile);

      expect(result).toBe(path.join(tempDir, 'utils.ts'));
    });

    it('should resolve deeply nested relative import', () => {
      createFile('src/lib/helpers/format.ts');
      const fromFile = path.join(tempDir, 'src', 'components', 'ui', 'Button.ts');
      const resolver = new PathResolver(tempDir);

      const result = resolver.resolve('../../lib/helpers/format', fromFile);

      expect(result).toBe(path.join(tempDir, 'src', 'lib', 'helpers', 'format.ts'));
    });
  });

  describe('extension inference', () => {
    it('should resolve .ts extension', () => {
      createFile('src/utils.ts');
      const fromFile = path.join(tempDir, 'src', 'app.ts');
      const resolver = new PathResolver(tempDir);

      const result = resolver.resolve('./utils', fromFile);

      expect(result).toBe(path.join(tempDir, 'src', 'utils.ts'));
    });

    it('should resolve .tsx extension', () => {
      createFile('src/Button.tsx');
      const fromFile = path.join(tempDir, 'src', 'app.ts');
      const resolver = new PathResolver(tempDir);

      const result = resolver.resolve('./Button', fromFile);

      expect(result).toBe(path.join(tempDir, 'src', 'Button.tsx'));
    });

    it('should resolve .js extension', () => {
      createFile('src/utils.js');
      const fromFile = path.join(tempDir, 'src', 'app.ts');
      const resolver = new PathResolver(tempDir);

      const result = resolver.resolve('./utils', fromFile);

      expect(result).toBe(path.join(tempDir, 'src', 'utils.js'));
    });

    it('should prefer .ts over .js', () => {
      createFile('src/utils.ts');
      createFile('src/utils.js');
      const fromFile = path.join(tempDir, 'src', 'app.ts');
      const resolver = new PathResolver(tempDir);

      const result = resolver.resolve('./utils', fromFile);

      expect(result).toBe(path.join(tempDir, 'src', 'utils.ts'));
    });

    it('should resolve explicit extension', () => {
      createFile('src/data.json', '{}');
      const fromFile = path.join(tempDir, 'src', 'app.ts');
      const resolver = new PathResolver(tempDir);

      const result = resolver.resolve('./data.json', fromFile);

      expect(result).toBe(path.join(tempDir, 'src', 'data.json'));
    });
  });

  describe('index file resolution', () => {
    it('should resolve directory to index.ts', () => {
      createFile('src/utils/index.ts');
      const fromFile = path.join(tempDir, 'src', 'app.ts');
      const resolver = new PathResolver(tempDir);

      const result = resolver.resolve('./utils', fromFile);

      expect(result).toBe(path.join(tempDir, 'src', 'utils', 'index.ts'));
    });

    it('should resolve directory to index.tsx', () => {
      createFile('src/components/index.tsx');
      const fromFile = path.join(tempDir, 'src', 'app.ts');
      const resolver = new PathResolver(tempDir);

      const result = resolver.resolve('./components', fromFile);

      expect(result).toBe(path.join(tempDir, 'src', 'components', 'index.tsx'));
    });

    it('should resolve directory to index.js', () => {
      createFile('src/lib/index.js');
      const fromFile = path.join(tempDir, 'src', 'app.ts');
      const resolver = new PathResolver(tempDir);

      const result = resolver.resolve('./lib', fromFile);

      expect(result).toBe(path.join(tempDir, 'src', 'lib', 'index.js'));
    });
  });

  describe('tsconfig paths', () => {
    it('should resolve path alias', () => {
      createFile('src/components/Button.ts');
      const fromFile = path.join(tempDir, 'src', 'app.ts');
      const resolver = new PathResolver(tempDir, {
        baseUrl: '.',
        paths: { '@/*': ['src/*'] },
      });

      const result = resolver.resolve('@/components/Button', fromFile);

      expect(result).toBe(path.join(tempDir, 'src', 'components', 'Button.ts'));
    });

    it('should resolve multiple path aliases', () => {
      createFile('src/utils/format.ts');
      createFile('lib/helpers/parse.ts');
      const fromFile = path.join(tempDir, 'src', 'app.ts');
      const resolver = new PathResolver(tempDir, {
        baseUrl: '.',
        paths: {
          '@/*': ['src/*'],
          '#/*': ['lib/*'],
        },
      });

      expect(resolver.resolve('@/utils/format', fromFile)).toBe(
        path.join(tempDir, 'src', 'utils', 'format.ts')
      );
      expect(resolver.resolve('#/helpers/parse', fromFile)).toBe(
        path.join(tempDir, 'lib', 'helpers', 'parse.ts')
      );
    });

    it('should resolve baseUrl relative import', () => {
      createFile('src/utils.ts');
      const fromFile = path.join(tempDir, 'src', 'deep', 'nested', 'app.ts');
      const resolver = new PathResolver(tempDir, {
        baseUrl: 'src',
      });

      const result = resolver.resolve('utils', fromFile);

      expect(result).toBe(path.join(tempDir, 'src', 'utils.ts'));
    });
  });

  describe('node modules and built-ins', () => {
    it('should return null for bare specifiers', () => {
      const fromFile = path.join(tempDir, 'src', 'app.ts');
      const resolver = new PathResolver(tempDir);

      expect(resolver.resolve('react', fromFile)).toBeNull();
      expect(resolver.resolve('lodash', fromFile)).toBeNull();
    });

    it('should return null for scoped packages', () => {
      const fromFile = path.join(tempDir, 'src', 'app.ts');
      const resolver = new PathResolver(tempDir);

      expect(resolver.resolve('@types/node', fromFile)).toBeNull();
      expect(resolver.resolve('@mui/material', fromFile)).toBeNull();
    });

    it('should return null for node built-ins', () => {
      const fromFile = path.join(tempDir, 'src', 'app.ts');
      const resolver = new PathResolver(tempDir);

      expect(resolver.resolve('fs', fromFile)).toBeNull();
      expect(resolver.resolve('path', fromFile)).toBeNull();
      expect(resolver.resolve('node:fs', fromFile)).toBeNull();
    });
  });

  describe('non-existent files', () => {
    it('should return null for non-existent relative import', () => {
      const fromFile = path.join(tempDir, 'src', 'app.ts');
      const resolver = new PathResolver(tempDir);

      const result = resolver.resolve('./does-not-exist', fromFile);

      expect(result).toBeNull();
    });

    it('should return null for non-existent path alias', () => {
      const fromFile = path.join(tempDir, 'src', 'app.ts');
      const resolver = new PathResolver(tempDir, {
        baseUrl: '.',
        paths: { '@/*': ['src/*'] },
      });

      const result = resolver.resolve('@/does-not-exist', fromFile);

      expect(result).toBeNull();
    });
  });
});
