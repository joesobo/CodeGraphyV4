import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

function readExtensionManifest() {
  const testDir = dirname(fileURLToPath(import.meta.url));
  const repoRoot = resolve(testDir, '../../../..');
  const manifestPath = resolve(repoRoot, 'package.json');
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as {
    icon?: string;
    contributes?: {
      viewsContainers?: {
        activitybar?: Array<{
          id?: string;
          icon?: string | { dark?: string; light?: string };
        }>;
      };
    };
  };

  return { manifest, repoRoot };
}

describe('extension manifest', () => {
  it('declares a packaged marketplace icon', () => {
    const { manifest, repoRoot } = readExtensionManifest();

    expect(typeof manifest.icon).toBe('string');
    expect(existsSync(resolve(repoRoot, String(manifest.icon)))).toBe(true);
  });

  it('declares theme-aware activity bar icons', () => {
    const { manifest, repoRoot } = readExtensionManifest();
    const container = manifest.contributes?.viewsContainers?.activitybar?.find(entry => entry.id === 'codegraphy');

    expect(container).toBeDefined();
    expect(container?.icon).toMatchObject({
      dark: 'assets/icon-dark.svg',
      light: 'assets/icon-light.svg',
    });

    const icon = container?.icon as { dark?: string; light?: string };
    expect(existsSync(resolve(repoRoot, String(icon.dark)))).toBe(true);
    expect(existsSync(resolve(repoRoot, String(icon.light)))).toBe(true);
  });
});
