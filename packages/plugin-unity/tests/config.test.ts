import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, 'utf8')) as unknown;
}

describe('Unity plugin configuration', () => {
  it('uses only file-color fields allowed by the Extension schema', () => {
    const testDirectory = dirname(fileURLToPath(import.meta.url));
    const schema = readJson(resolve(testDirectory, '../../../codegraphy.extension.schema.json')) as {
      properties: {
        fileColors: {
          additionalProperties: {
            oneOf: Array<{ properties?: Record<string, unknown> }>;
          };
        };
      };
    };
    const manifest = readJson(resolve(testDirectory, '../codegraphy.extension.json')) as {
      fileColors: Record<string, string | Record<string, unknown>>;
    };
    const allowedFields = new Set(
      Object.keys(
        schema.properties.fileColors.additionalProperties.oneOf
          .find(candidate => candidate.properties)?.properties ?? {},
      ),
    );

    const unexpectedFields = Object.entries(manifest.fileColors).flatMap(([pattern, value]) =>
      typeof value === 'string'
        ? []
        : Object.keys(value)
          .filter(field => !allowedFields.has(field))
          .map(field => `${pattern}.${field}`),
    );

    expect(unexpectedFields).toEqual([]);
  });
});
