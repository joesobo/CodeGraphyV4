import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

function readPluginManifestSchema() {
  const testDir = dirname(fileURLToPath(import.meta.url));
  const repoRoot = resolve(testDir, '../../../..');
  const schemaPath = resolve(repoRoot, 'codegraphy.schema.json');

  return JSON.parse(readFileSync(schemaPath, 'utf8')) as {
    properties?: Record<string, unknown>;
  };
}

describe('plugin manifest schema', () => {
  it('defines plugin sources instead of legacy rules', () => {
    const schema = readPluginManifestSchema();

    expect(schema.properties).toHaveProperty('sources');
    expect(schema.properties).not.toHaveProperty('rules');
  });

  it('uses imagePath for plugin file color asset metadata', () => {
    const schema = readPluginManifestSchema();
    const fileColors = schema.properties?.fileColors as {
      additionalProperties?: {
        oneOf?: Array<{
          properties?: Record<string, unknown>;
        }>;
      };
    };

    const objectShape = fileColors.additionalProperties?.oneOf?.find(candidate =>
      candidate.properties?.color,
    );

    expect(objectShape?.properties).toHaveProperty('imagePath');
    expect(objectShape?.properties).not.toHaveProperty('image');
  });
});
