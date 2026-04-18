import { describe, expect, it } from 'vitest';
import { createRelationDescriptorProperties } from '../../../../../../src/extension/pipeline/database/cache/relation/descriptorProperties';

describe('extension/pipeline/database/cache/relation/descriptorProperties', () => {
  it('serializes relation descriptor properties with empty-string fallbacks', () => {
    expect(
      createRelationDescriptorProperties({
        kind: 'import',
        sourceId: 'core:treesitter',
        fromFilePath: 'src/app.ts',
      }),
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
        kind: 'call',
        sourceId: 'plugin:java',
        fromFilePath: 'src/app.ts',
        pluginId: 'plugin:java',
        specifier: 'com.acme.Service',
        type: 'static',
        variant: 'declaration',
        resolvedPath: 'src/lib.ts',
        metadata: { depth: 2, exported: true, note: 'hello' },
      }),
    ).toEqual([
      'pluginId: "plugin:java"',
      'specifier: "com.acme.Service"',
      'relationType: "static"',
      'variant: "declaration"',
      'resolvedPath: "src/lib.ts"',
      'metadataJson: "{\\"depth\\":2,\\"exported\\":true,\\"note\\":\\"hello\\"}"',
    ]);
  });
});
