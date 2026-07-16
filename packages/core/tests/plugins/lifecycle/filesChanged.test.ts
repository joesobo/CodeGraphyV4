import type { IPlugin, IPluginAnalysisContext } from '@codegraphy-dev/plugin-api';
import { describe, expect, it, vi } from 'vitest';
import type { ILifecyclePluginInfo } from '../../../src/plugins/lifecycle/contracts';
import { notifyFilesChanged } from '../../../src/plugins/lifecycle/notify/filesChanged';

function pluginInfo(plugin: Partial<IPlugin>): ILifecyclePluginInfo {
  return {
    plugin: {
      id: 'test-plugin',
      name: 'Test Plugin',
      version: '1.0.0',
      apiVersion: '3',
      supportedExtensions: ['.ts'],
      ...plugin,
    },
  };
}

describe('plugins/lifecycle notifyFilesChanged', () => {
  it('routes changed files to matching plugins and collects additional paths', async () => {
    const onFilesChanged = vi.fn(async () => ['src/generated.ts', '', 42] as unknown as readonly string[]);
    const plugins = new Map<string, ILifecyclePluginInfo>([
      ['ts', pluginInfo({
        id: 'ts',
        supportedExtensions: ['.ts'],
        onFilesChanged,
      })],
      ['markdown', pluginInfo({
        id: 'markdown',
        supportedExtensions: ['.md'],
        onPreAnalyze: vi.fn(),
      })],
    ]);
    const analysisContext = {
      readTextFile: vi.fn(),
    } as unknown as IPluginAnalysisContext;

    await expect(notifyFilesChanged(plugins, [
      { absolutePath: '/workspace/src/app.ts', relativePath: 'src/app.ts', content: 'content' },
      { absolutePath: '/workspace/README.md', relativePath: 'README.md', content: '# docs' },
    ], '/workspace', analysisContext)).resolves.toEqual({
      additionalFilePaths: ['src/generated.ts'],
      requiresFullRefresh: true,
    });
    expect(onFilesChanged).toHaveBeenCalledWith(
      [{ absolutePath: '/workspace/src/app.ts', relativePath: 'src/app.ts', content: 'content' }],
      '/workspace',
      expect.objectContaining({ readTextFile: expect.any(Function) }),
    );
  });

  it('requests a full refresh when a matching onFilesChanged hook throws', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const plugins = new Map<string, ILifecyclePluginInfo>([
      ['wildcard', pluginInfo({
        id: 'wildcard',
        supportedExtensions: ['*'],
        onFilesChanged: vi.fn(async () => {
          throw new Error('boom');
        }),
      })],
    ]);

    await expect(notifyFilesChanged(plugins, [
      { absolutePath: '/workspace/src/app.ts', relativePath: 'src/app.ts', content: 'content' },
    ], '/workspace')).resolves.toEqual({
      additionalFilePaths: [],
      requiresFullRefresh: true,
    });
    expect(consoleError).toHaveBeenCalledWith(
      '[CodeGraphy] Error in onFilesChanged for wildcard:',
      expect.any(Error),
    );
    consoleError.mockRestore();
  });

  it('ignores plugins that do not match any changed files', async () => {
    const onFilesChanged = vi.fn();
    const plugins = new Map<string, ILifecyclePluginInfo>([
      ['ts', pluginInfo({
        id: 'ts',
        supportedExtensions: ['.ts'],
        onFilesChanged,
      })],
    ]);

    await expect(notifyFilesChanged(plugins, [
      { absolutePath: '/workspace/README.md', relativePath: 'README.md', content: '# docs' },
    ], '/workspace')).resolves.toEqual({
      additionalFilePaths: [],
      requiresFullRefresh: false,
    });
    expect(onFilesChanged).not.toHaveBeenCalled();
  });
});
