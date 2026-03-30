import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

function readExtensionManifest() {
  const testDir = dirname(fileURLToPath(import.meta.url));
  const repoRoot = resolve(testDir, '../../../..');
  const manifestPath = resolve(repoRoot, 'package.json');
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as {
    contributes?: {
      viewsContainers?: {
        activitybar?: Array<{ id?: string; icon?: unknown }>;
      };
    };
  };

  return { manifest, repoRoot };
}

describe('extension manifest', () => {
  it('declares the activity bar icon as a single file path string', () => {
    const { manifest, repoRoot } = readExtensionManifest();
    const container = manifest.contributes?.viewsContainers?.activitybar?.find(entry => entry.id === 'codegraphy');

    expect(container).toBeDefined();
    expect(typeof container?.icon).toBe('string');
    expect(existsSync(resolve(repoRoot, String(container?.icon)))).toBe(true);
  });
});
