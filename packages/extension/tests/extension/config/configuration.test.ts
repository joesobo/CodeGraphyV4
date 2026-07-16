import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Configuration } from '../../../src/extension/config/reader';
import { DEFAULT_MAX_FILES } from '../../../src/shared/settings/defaults';
import {
  DEFAULT_EXCLUDE_PATTERNS,
  type ICodeGraphyConfig,
} from '../../../src/extension/config/defaults';

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
      maxFiles: DEFAULT_MAX_FILES,
      include: ['**/*'],
      respectGitignore: true,
      showOrphans: true,
    };

    // Setup mock to return values from mockConfig
    vi.mocked(vscode.workspace.getConfiguration).mockReturnValue({
      get: <T>(key: string, defaultValue: T): T => {
        return (mockConfig[key] as T) ?? defaultValue;
      },
    } as vscode.WorkspaceConfiguration);
  });

  describe('default values', () => {
    it('should return default maxFiles of 1000', () => {
      const config = new Configuration();
      expect(config.maxFiles).toBe(DEFAULT_MAX_FILES);
    });

    it('should return default include pattern', () => {
      const config = new Configuration();
      expect(config.include).toEqual(['**/*']);
    });

    it('should return default respectGitignore as true', () => {
      const config = new Configuration();
      expect(config.respectGitignore).toBe(true);
    });

    it('should return default showOrphans as true', () => {
      const config = new Configuration();
      expect(config.showOrphans).toBe(true);
    });

  });

  describe('custom values', () => {
    it('should return custom maxFiles', () => {
      mockConfig.maxFiles = 1200;
      const config = new Configuration();
      expect(config.maxFiles).toBe(1200);
    });

    it('should return custom include patterns', () => {
      mockConfig.include = ['src/**/*', 'lib/**/*'];
      const config = new Configuration();
      expect(config.include).toEqual(['src/**/*', 'lib/**/*']);
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

  });

  describe('getAll', () => {
    it('should return all configuration values', () => {
      const config = new Configuration();
      const all: ICodeGraphyConfig = config.getAll();

      expect(all).toEqual({
        version: 1,
        maxFiles: DEFAULT_MAX_FILES,
        include: ['**/*'],
        respectGitignore: true,
        showOrphans: true,
        filterPatterns: [],
        bidirectionalEdges: 'separate',
        disabledCustomFilterPatterns: [],
        disabledPluginFilterPatterns: [],
        plugins: [],
      });
    });

    it('should return custom values in getAll', () => {
      mockConfig.maxFiles = 200;
      mockConfig.showOrphans = false;
      mockConfig.filterPatterns = ['dist/**'];
      mockConfig.plugins = [{ package: '@codegraphy-dev/plugin-vue' }];

      const config = new Configuration();
      const all = config.getAll();

      expect(all.maxFiles).toBe(200);
      expect(all.showOrphans).toBe(false);
      expect(all.filterPatterns).toEqual(['dist/**']);
      expect(all.plugins).toEqual([{ package: '@codegraphy-dev/plugin-vue' }]);
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

    it('should include turbo cache artifacts', () => {
      expect(DEFAULT_EXCLUDE_PATTERNS).toContain('**/.turbo/**');
    });

    it('should include minified files', () => {
      expect(DEFAULT_EXCLUDE_PATTERNS).toContain('**/*.min.js');
    });

    it('should include source maps', () => {
      expect(DEFAULT_EXCLUDE_PATTERNS).toContain('**/*.map');
    });
  });
});
