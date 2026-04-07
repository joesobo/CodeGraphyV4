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
        id: 'codegraphy.codegraphy-typescript',
        isActive: false,
        packageJSON: { extensionDependencies: ['codegraphy.codegraphy'] },
        activate: vi.fn(),
      },
      {
        id: 'someone.else',
        isActive: false,
        packageJSON: { extensionDependencies: ['other.extension'] },
        activate: vi.fn(),
      },
      {
        id: 'codegraphy.codegraphy-core-shadow',
        isActive: false,
        activate: vi.fn(),
      },
      {
        id: 'codegraphy.codegraphy',
        isActive: false,
        packageJSON: { extensionDependencies: ['codegraphy.codegraphy'] },
        activate: vi.fn(),
      },
    ];

    expect(getInstalledCodeGraphyPluginExtensions(extensions, 'codegraphy.codegraphy')).toEqual([
      extensions[1],
    ]);
  });

  it('activates inactive dependent extensions and ignores failures', async () => {
    const activeExtension = {
      id: 'codegraphy.codegraphy-python',
      isActive: true,
      packageJSON: { extensionDependencies: ['codegraphy.codegraphy'] },
      activate: vi.fn(),
    };
    const inactiveExtension = {
      id: 'codegraphy.codegraphy-godot',
      isActive: false,
      packageJSON: { extensionDependencies: ['codegraphy.codegraphy'] },
      activate: vi.fn(async () => undefined),
    };
    const failingExtension = {
      id: 'codegraphy.codegraphy-csharp',
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
      '[CodeGraphy] Failed to activate dependent extension codegraphy.codegraphy-csharp:',
      expect.any(Error),
    );
  });

  it('ignores extensions without package metadata and uses the default logger when activation fails', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const missingManifest = {
      id: 'codegraphy.codegraphy-missing-manifest',
      isActive: false,
      activate: vi.fn(async () => undefined),
    };
    const failingExtension = {
      id: 'codegraphy.codegraphy-rust',
      isActive: false,
      packageJSON: { extensionDependencies: ['codegraphy.codegraphy'] },
      activate: vi.fn(async () => {
        throw new Error('boom');
      }),
    };

    await activateInstalledCodeGraphyPlugins(
      [missingManifest, failingExtension] as never,
      'codegraphy.codegraphy',
    );

    expect(missingManifest.activate).not.toHaveBeenCalled();
    expect(failingExtension.activate).toHaveBeenCalledOnce();
    expect(consoleSpy).toHaveBeenCalledWith(
      '[CodeGraphy] Failed to activate dependent extension codegraphy.codegraphy-rust:',
      expect.any(Error),
    );
    consoleSpy.mockRestore();
  });
});
