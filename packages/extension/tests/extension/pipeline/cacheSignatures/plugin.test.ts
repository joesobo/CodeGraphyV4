import { describe, expect, it } from 'vitest';
import {
  createWorkspacePipelinePluginBuildSignature,
  createWorkspacePipelinePluginSignature,
} from '../../../../src/extension/pipeline/cacheSignatures/plugin';

describe('workspace pipeline plugin signature', () => {
  it('changes when a loaded package build changes without a package version change', () => {
    const plugin = {
      builtIn: false,
      sourcePackage: '@acme/codegraphy-tools',
      descriptorSignature: 'build-v1',
      plugin: { id: 'acme.core', version: '1.0.0' },
    };

    const first = createWorkspacePipelinePluginBuildSignature([plugin]);
    expect(first).not.toBeNull();
    expect(createWorkspacePipelinePluginBuildSignature([
      { ...plugin, descriptorSignature: 'build-v2' },
    ])).not.toBe(first);
    expect(createWorkspacePipelinePluginBuildSignature([
      { ...plugin, builtIn: true },
    ])).toBeNull();
  });

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
        {
          package: '@codegraphy-dev/plugin-vue', version: '2.0.4', id: 'codegraphy.vue',
          host: 'core', globallyEnabled: false,
        },
      ],
      settings: {
        plugins: [
          { id: 'codegraphy.markdown', activation: 'enabled' },
          { id: 'codegraphy.vue', activation: 'enabled' },
        ],
      },
    });

    expect(signature).toBe(
      'codegraphy.markdown@1.0.4|npm:codegraphy.vue:@codegraphy-dev/plugin-vue@2.0.4',
    );
  });

  it('marks enabled installed Core plugin packages missing from the runtime', () => {
    expect(createWorkspacePipelinePluginSignature([], {
      installedPlugins: [{
        package: '@acme/core', version: '1.0.0', id: 'codegraphy.vue',
        host: 'core', globallyEnabled: false,
      }],
      settings: { plugins: [{ id: 'codegraphy.vue', activation: 'enabled' }] },
    })).toBe('npm:codegraphy.vue@missing');
  });

  it('ignores enabled plugins whose host is unknown to Core', () => {
    expect(createWorkspacePipelinePluginSignature([], {
      installedPlugins: [],
      settings: {
        plugins: [{ id: 'acme.future-interface', activation: 'enabled' }],
      },
    })).toBeNull();
  });

  it('matches runtime records by plugin ID inside a multi-plugin package', () => {
    const signature = createWorkspacePipelinePluginSignature([{
      builtIn: false,
      sourcePackage: '@acme/codegraphy-tools',
      plugin: { id: 'acme.core', version: 'runtime-version' },
    }], {
      installedPlugins: [
        {
          package: '@acme/codegraphy-tools', version: '1.0.0', id: 'acme.core',
          host: 'core', globallyEnabled: true,
        },
        {
          package: '@acme/codegraphy-tools', version: '9.9.9', id: 'acme.view',
          host: 'codegraphy.extension', globallyEnabled: true,
        },
      ],
    });

    expect(signature).toBe('npm:acme.core:@acme/codegraphy-tools@1.0.0');
  });

  it('ignores inactive and wrong-host descriptors when no Core runtime loaded', () => {
    expect(createWorkspacePipelinePluginSignature([], {
      installedPlugins: [
        {
          package: '@acme/core', version: '1.0.0', id: 'acme.inactive',
          host: 'core', globallyEnabled: false,
        },
        {
          package: '@acme/view', version: '1.0.0', id: 'acme.view',
          host: 'codegraphy.extension', globallyEnabled: true,
        },
      ],
      settings: { plugins: [
        { id: 'acme.inactive', activation: 'inherit' },
        { id: 'acme.view', activation: 'inherit' },
      ] },
    })).toBeNull();
  });
});
