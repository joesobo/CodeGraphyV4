import { describe, expect, it, vi } from 'vitest';
import { shouldActivateWorkspacePlugin } from '../../../../src/extension/pipeline/plugins/bootstrap/activation';

function record(supportedExtensions: string[]) {
  return {
    package: '@acme/plugin',
    version: '1.0.0',
    apiVersion: '^2.0.0',
    disclosures: [],
    packageRoot: '/plugins/acme',
    pluginId: 'acme.plugin',
    supportedExtensions,
  };
}

describe('workspace plugin activation', () => {
  it('keeps graph-event plugins eligible without scanning files', async () => {
    const findFiles = vi.fn();

    await expect(shouldActivateWorkspacePlugin(record([]), findFiles)).resolves.toBe(true);
    expect(findFiles).not.toHaveBeenCalled();
  });

  it('keeps wildcard plugins eligible without scanning files', async () => {
    const findFiles = vi.fn();

    await expect(shouldActivateWorkspacePlugin(record(['*']), findFiles)).resolves.toBe(true);
    expect(findFiles).not.toHaveBeenCalled();
  });

  it('activates when a declared extension exists in the workspace', async () => {
    const findFiles = vi.fn(async (glob: string) => glob === '**/*.vue' ? [{}] : []);

    await expect(shouldActivateWorkspacePlugin(
      record(['.ts', '.vue']),
      findFiles,
    )).resolves.toBe(true);
    expect(findFiles).toHaveBeenCalledWith('**/*.vue', 1);
  });

  it('stays unloaded when no declared extension exists', async () => {
    const findFiles = vi.fn(async () => []);

    await expect(shouldActivateWorkspacePlugin(
      record(['.svelte']),
      findFiles,
    )).resolves.toBe(false);
    expect(findFiles).toHaveBeenCalledWith('**/*.svelte', 1);
  });
});
