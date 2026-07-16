import { describe, expect, it } from 'vitest';
import { createWorkspacePipelinePluginSignature } from '../../../../src/extension/pipeline/cacheSignatures/plugin';

describe('workspace pipeline plugin signature', () => {
  it('fingerprints built-in runtimes and npm plugins with installed package versions', () => {
    const signature = createWorkspacePipelinePluginSignature([
      {
        builtIn: true,
        sourcePackage: '@codegraphy-dev/plugin-markdown',
        plugin: { id: 'codegraphy.markdown', version: '1.0.4', extra: 'ignored' },
      },
      {
        builtIn: false,
        sourcePackage: '@codegraphy-dev/plugin-vue',
        plugin: { id: 'codegraphy.vue', version: 'runtime-version', extra: 'ignored' },
      },
    ] as never, {
      installedPlugins: [
        { package: '@codegraphy-dev/plugin-vue', version: '2.0.4', pluginId: 'codegraphy.vue' },
      ],
      settings: {
        plugins: [
          { id: 'codegraphy.markdown', enabled: true },
          { id: 'codegraphy.vue', enabled: true },
        ],
      },
    });

    expect(signature).toBe(
      'codegraphy.markdown@1.0.4|npm:@codegraphy-dev/plugin-vue@2.0.4',
    );
  });

  it('marks enabled workspace plugin packages missing from the runtime', () => {
    expect(createWorkspacePipelinePluginSignature([], {
      installedPlugins: [],
      settings: { plugins: [{ id: 'codegraphy.vue', enabled: true }] },
    })).toBe('npm:codegraphy.vue@missing');
  });
});
