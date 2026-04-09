import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as vscode from 'vscode';
import { Configuration } from '../../../src/extension/config/reader';

describe('Configuration (configReaders)', () => {
  let mockConfig: Record<string, unknown>;
  let mockGet: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockConfig = {};
    mockGet = vi.fn(<T>(key: string, defaultValue: T): T => {
      return (key in mockConfig ? mockConfig[key] : defaultValue) as T;
    });
    vi.mocked(vscode.workspace.getConfiguration).mockReturnValue({
      get: mockGet,
    } as unknown as vscode.WorkspaceConfiguration);
  });

  describe('maxFiles', () => {
    it('returns the configured value', () => {
      mockConfig['maxFiles'] = 1000;
      expect(new Configuration().maxFiles).toBe(1000);
    });

    it('returns the default 500 when not configured', () => {
      expect(new Configuration().maxFiles).toBe(500);
    });

    it('reads from the codegraphy section', () => {
      void new Configuration().maxFiles;
      expect(vscode.workspace.getConfiguration).toHaveBeenCalledWith('codegraphy');
    });
  });

  describe('include', () => {
    it('returns the configured include patterns', () => {
      mockConfig['include'] = ['src/**/*'];
      expect(new Configuration().include).toEqual(['src/**/*']);
    });

    it('defaults to all files pattern', () => {
      expect(new Configuration().include).toEqual(['**/*']);
    });
  });

  describe('respectGitignore', () => {
    it('returns the configured value', () => {
      mockConfig['respectGitignore'] = false;
      expect(new Configuration().respectGitignore).toBe(false);
    });

    it('defaults to true', () => {
      expect(new Configuration().respectGitignore).toBe(true);
    });
  });

  describe('showOrphans', () => {
    it('returns the configured value', () => {
      mockConfig['showOrphans'] = false;
      expect(new Configuration().showOrphans).toBe(false);
    });

    it('defaults to true', () => {
      expect(new Configuration().showOrphans).toBe(true);
    });
  });

  describe('bidirectionalEdges', () => {
    it('returns the configured value', () => {
      mockConfig['bidirectionalEdges'] = 'combined';
      expect(new Configuration().bidirectionalEdges).toBe('combined');
    });

    it('defaults to separate', () => {
      expect(new Configuration().bidirectionalEdges).toBe('separate');
    });
  });

  describe('plugins', () => {
    it('returns the configured plugin list', () => {
      mockConfig['plugins'] = ['my-plugin'];
      expect(new Configuration().plugins).toEqual(['my-plugin']);
    });

    it('defaults to empty array', () => {
      expect(new Configuration().plugins).toEqual([]);
    });
  });

  describe('disabledPlugins', () => {
    it('returns the configured disabled plugins', () => {
      mockConfig['disabledPlugins'] = ['codegraphy.python'];
      expect(new Configuration().disabledPlugins).toEqual(['codegraphy.python']);
    });

    it('defaults to empty array', () => {
      expect(new Configuration().disabledPlugins).toEqual([]);
    });
  });

  describe('timelineMaxCommits', () => {
    it('returns the configured value', () => {
      mockConfig['timeline.maxCommits'] = 200;
      expect(new Configuration().timelineMaxCommits).toBe(200);
    });

    it('defaults to 500', () => {
      expect(new Configuration().timelineMaxCommits).toBe(500);
    });
  });

  describe('groups', () => {
    it('returns the configured groups', () => {
      const groups = [{ id: 'g1', pattern: '*.ts', color: '#FFF' }];
      mockConfig.groups = groups;
      expect(new Configuration().groups).toEqual(groups);
    });

    it('defaults to empty array', () => {
      expect(new Configuration().groups).toEqual([]);
    });
  });

  describe('timelinePlaybackSpeed', () => {
    it('returns the configured playback speed', () => {
      mockConfig['timeline.playbackSpeed'] = 2.0;
      expect(new Configuration().timelinePlaybackSpeed).toBe(2.0);
    });

    it('defaults to 1.0', () => {
      expect(new Configuration().timelinePlaybackSpeed).toBe(1.0);
    });
  });

  describe('generic get method', () => {
    it('returns the configured value for an arbitrary key', () => {
      mockConfig['customKey'] = 'customValue';
      expect(new Configuration().get('customKey', 'fallback')).toBe('customValue');
    });

    it('returns the default when key is not configured', () => {
      expect(new Configuration().get('missingKey', 42)).toBe(42);
    });
  });

  describe('getAll', () => {
    it('returns an object containing all standard configuration values', () => {
      mockConfig['maxFiles'] = 100;
      mockConfig['include'] = ['src/**'];
      mockConfig['respectGitignore'] = false;
      mockConfig['showOrphans'] = false;
      mockConfig['bidirectionalEdges'] = 'combined';
      mockConfig['plugins'] = ['p1'];
      mockConfig['disabledPlugins'] = ['d1'];

      const all = new Configuration().getAll();

      expect(all.maxFiles).toBe(100);
      expect(all.include).toEqual(['src/**']);
      expect(all.respectGitignore).toBe(false);
      expect(all.showOrphans).toBe(false);
      expect(all.bidirectionalEdges).toBe('combined');
      expect(all.plugins).toEqual(['p1']);
      expect(all.disabledPlugins).toEqual(['d1']);
    });

    it('uses defaults for unconfigured values', () => {
      const all = new Configuration().getAll();
      expect(all.maxFiles).toBe(500);
      expect(all.showOrphans).toBe(true);
      expect(all.plugins).toEqual([]);
    });
  });

  describe('onDidChange', () => {
    it('registers a listener on the codegraphy configuration section', () => {
      const config = new Configuration();
      const callback = vi.fn();
      config.onDidChange(callback);

      expect(vscode.workspace.onDidChangeConfiguration).toHaveBeenCalled();
    });

    it('invokes the callback when codegraphy configuration changes', () => {
      // Capture the listener that onDidChangeConfiguration receives
      let configListener: ((event: { affectsConfiguration: (s: string) => boolean }) => void) | undefined;
      vi.mocked(vscode.workspace.onDidChangeConfiguration).mockImplementation((listener: unknown) => {
        configListener = listener as typeof configListener;
        return { dispose: vi.fn() } as unknown as vscode.Disposable;
      });

      const callback = vi.fn();
      new Configuration().onDidChange(callback);

      configListener!({ affectsConfiguration: (key) => key === 'codegraphy' });
      expect(callback).toHaveBeenCalledOnce();
    });

    it('does not invoke the callback for unrelated configuration changes', () => {
      let configListener: ((event: { affectsConfiguration: (s: string) => boolean }) => void) | undefined;
      vi.mocked(vscode.workspace.onDidChangeConfiguration).mockImplementation((listener: unknown) => {
        configListener = listener as typeof configListener;
        return { dispose: vi.fn() } as unknown as vscode.Disposable;
      });

      const callback = vi.fn();
      new Configuration().onDidChange(callback);

      configListener!({ affectsConfiguration: () => false });
      expect(callback).not.toHaveBeenCalled();
    });

    it('returns a disposable', () => {
      const disposable = new Configuration().onDidChange(vi.fn());
      expect(disposable).toHaveProperty('dispose');
    });
  });
});
