import { describe, expect, it, vi } from 'vitest';
import {
  activateInstalledCodeGraphyPlugins,
  getInstalledCodeGraphyPluginExtensions,
} from '../../../src/extension/pluginActivation/installed';

describe('extension/pluginActivation/installed', () => {
  it('selects installed extensions that depend on the core extension', () => {
    const extensions = [
      {
        id: 'codegraphy.codegraphy',
        isActive: true,
        packageJSON: { extensionDependencies: [] },
        activate: vi.fn(),
      },
      {
        id: 'codegraphy.typescript',
        isActive: false,
        packageJSON: { extensionDependencies: ['codegraphy.codegraphy'] },
        activate: vi.fn(),
      },
      {
        id: 'theme.example',
        isActive: false,
        packageJSON: { extensionDependencies: [] },
        activate: vi.fn(),
      },
    ];

    expect(
      getInstalledCodeGraphyPluginExtensions(extensions, 'codegraphy.codegraphy').map(
        extension => extension.id,
      ),
    ).toEqual(['codegraphy.typescript']);
  });

  it('activates inactive dependent extensions and ignores failures', async () => {
    const activeExtension = {
      id: 'codegraphy.python',
      isActive: true,
      packageJSON: { extensionDependencies: ['codegraphy.codegraphy'] },
      activate: vi.fn(),
    };
    const inactiveExtension = {
      id: 'codegraphy.gdscript',
      isActive: false,
      packageJSON: { extensionDependencies: ['codegraphy.codegraphy'] },
      activate: vi.fn(async () => undefined),
    };
    const failingExtension = {
      id: 'codegraphy.csharp',
      isActive: false,
      packageJSON: { extensionDependencies: ['codegraphy.codegraphy'] },
      activate: vi.fn(async () => {
        throw new Error('boom');
      }),
    };
    const logError = vi.fn();

    await activateInstalledCodeGraphyPlugins(
      [activeExtension, inactiveExtension, failingExtension] as never,
      'codegraphy.codegraphy',
      logError,
    );

    expect(activeExtension.activate).not.toHaveBeenCalled();
    expect(inactiveExtension.activate).toHaveBeenCalledOnce();
    expect(failingExtension.activate).toHaveBeenCalledOnce();
    expect(logError).toHaveBeenCalledWith(
      '[CodeGraphy] Failed to activate dependent extension codegraphy.csharp:',
      expect.any(Error),
    );
  });
});
