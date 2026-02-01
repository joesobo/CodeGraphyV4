import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Configuration, DEFAULT_EXCLUDE_PATTERNS, ICodeGraphyConfig } from '../../src/extension/Configuration';

// Mock vscode module
vi.mock('vscode', () => ({
  workspace: {
    getConfiguration: vi.fn(),
    onDidChangeConfiguration: vi.fn(() => ({ dispose: vi.fn() })),
  },
}));

import * as vscode from 'vscode';

describe('Configuration', () => {
  let mockConfig: Record<string, unknown>;

  beforeEach(() => {
    // Reset mock config to defaults
    mockConfig = {
      maxFiles: 100,
      include: ['**/*'],
      exclude: [...DEFAULT_EXCLUDE_PATTERNS],
      respectGitignore: true,
      showOrphans: true,
      plugins: [],
    };

    // Setup mock to return values from mockConfig
    vi.mocked(vscode.workspace.getConfiguration).mockReturnValue({
      get: <T>(key: string, defaultValue: T): T => {
        return (mockConfig[key] as T) ?? defaultValue;
      },
    } as vscode.WorkspaceConfiguration);
  });

  describe('default values', () => {
    it('should return default maxFiles of 100', () => {
      const config = new Configuration();
      expect(config.maxFiles).toBe(100);
    });

    it('should return default include pattern', () => {
      const config = new Configuration();
      expect(config.include).toEqual(['**/*']);
    });

    it('should return default exclude patterns', () => {
      const config = new Configuration();
      expect(config.exclude).toEqual(DEFAULT_EXCLUDE_PATTERNS);
    });

    it('should return default respectGitignore as true', () => {
      const config = new Configuration();
      expect(config.respectGitignore).toBe(true);
    });

    it('should return default showOrphans as true', () => {
      const config = new Configuration();
      expect(config.showOrphans).toBe(true);
    });

    it('should return default plugins as empty array', () => {
      const config = new Configuration();
      expect(config.plugins).toEqual([]);
    });
  });

  describe('custom values', () => {
    it('should return custom maxFiles', () => {
      mockConfig.maxFiles = 500;
      const config = new Configuration();
      expect(config.maxFiles).toBe(500);
    });

    it('should return custom include patterns', () => {
      mockConfig.include = ['src/**/*', 'lib/**/*'];
      const config = new Configuration();
      expect(config.include).toEqual(['src/**/*', 'lib/**/*']);
    });

    it('should return custom exclude patterns', () => {
      mockConfig.exclude = ['**/test/**'];
      const config = new Configuration();
      expect(config.exclude).toEqual(['**/test/**']);
    });

    it('should return custom respectGitignore', () => {
      mockConfig.respectGitignore = false;
      const config = new Configuration();
      expect(config.respectGitignore).toBe(false);
    });

    it('should return custom showOrphans', () => {
      mockConfig.showOrphans = false;
      const config = new Configuration();
      expect(config.showOrphans).toBe(false);
    });

    it('should return custom plugins', () => {
      mockConfig.plugins = ['codegraphy-rust', 'codegraphy-go'];
      const config = new Configuration();
      expect(config.plugins).toEqual(['codegraphy-rust', 'codegraphy-go']);
    });
  });

  describe('getAll', () => {
    it('should return all configuration values', () => {
      const config = new Configuration();
      const all: ICodeGraphyConfig = config.getAll();

      expect(all).toEqual({
        maxFiles: 100,
        include: ['**/*'],
        exclude: DEFAULT_EXCLUDE_PATTERNS,
        respectGitignore: true,
        showOrphans: true,
        plugins: [],
      });
    });

    it('should return custom values in getAll', () => {
      mockConfig.maxFiles = 200;
      mockConfig.showOrphans = false;
      mockConfig.plugins = ['codegraphy-rust'];

      const config = new Configuration();
      const all = config.getAll();

      expect(all.maxFiles).toBe(200);
      expect(all.showOrphans).toBe(false);
      expect(all.plugins).toEqual(['codegraphy-rust']);
    });
  });

  describe('onDidChange', () => {
    it('should register configuration change listener', () => {
      const config = new Configuration();
      const callback = vi.fn();

      config.onDidChange(callback);

      expect(vscode.workspace.onDidChangeConfiguration).toHaveBeenCalled();
    });

    it('should return a disposable', () => {
      const config = new Configuration();
      const disposable = config.onDidChange(() => {});

      expect(disposable).toHaveProperty('dispose');
    });
  });

  describe('DEFAULT_EXCLUDE_PATTERNS', () => {
    it('should include node_modules', () => {
      expect(DEFAULT_EXCLUDE_PATTERNS).toContain('**/node_modules/**');
    });

    it('should include dist', () => {
      expect(DEFAULT_EXCLUDE_PATTERNS).toContain('**/dist/**');
    });

    it('should include .git', () => {
      expect(DEFAULT_EXCLUDE_PATTERNS).toContain('**/.git/**');
    });

    it('should include minified files', () => {
      expect(DEFAULT_EXCLUDE_PATTERNS).toContain('**/*.min.js');
    });

    it('should include source maps', () => {
      expect(DEFAULT_EXCLUDE_PATTERNS).toContain('**/*.map');
    });
  });
});
