import { describe, expect, it } from 'vitest';
import { createRelationDescriptorProperties } from '../../../../src/graphCache/database/relation/descriptorProperties';

describe('graphCache/database/relation/descriptorProperties', () => {
  it('serializes relation descriptor properties with empty-string fallbacks', () => {
    expect(
      createRelationDescriptorProperties({
        edgeType: 'import',
        sourceId: 'core:treesitter',
        from: { kind: 'file', filePath: 'src/app.ts' },
        target: { kind: 'unresolved', specifier: '' },
      }, '/workspace'),
    ).toEqual([
      'pluginId: ""',
      'specifier: ""',
      'relationType: ""',
      'variant: ""',
      'resolvedPath: ""',
      'metadataJson: "null"',
    ]);
  });

  it('serializes explicit relation fields and metadata as cypher-safe JSON', () => {
    expect(
      createRelationDescriptorProperties({
        edgeType: 'call',
        sourceId: 'plugin:java',
        from: { kind: 'file', filePath: 'src/app.ts' },
        pluginId: 'plugin:java',
        specifier: 'com.acme.Service',
        timing: 'static',
        variant: 'declaration',
        target: { kind: 'file', path: 'src/lib.ts', pathKind: 'workspace-relative' },
        metadata: { depth: 2, exported: true, note: 'hello' },
      }, '/workspace'),
    ).toEqual([
      'pluginId: "plugin:java"',
      'specifier: "com.acme.Service"',
      'relationType: "static"',
      'variant: "declaration"',
      'resolvedPath: "/workspace/src/lib.ts"',
      'metadataJson: "{\\"depth\\":2,\\"exported\\":true,\\"note\\":\\"hello\\"}"',
    ]);
  });
});
