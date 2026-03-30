import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

type PackageSpec = {
  label: string;
  manifestPath: string;
  expectedIcon: string;
};

type PackageManifest = {
  icon?: string;
};

const packageSpecs: PackageSpec[] = [
  { label: 'core extension', manifestPath: 'package.json', expectedIcon: 'assets/icon.png' },
  { label: 'TypeScript plugin', manifestPath: 'packages/plugin-typescript/package.json', expectedIcon: 'assets/icon.png' },
  { label: 'Python plugin', manifestPath: 'packages/plugin-python/package.json', expectedIcon: 'assets/icon.png' },
  { label: 'C# plugin', manifestPath: 'packages/plugin-csharp/package.json', expectedIcon: 'assets/icon.png' },
  { label: 'GDScript plugin', manifestPath: 'packages/plugin-godot/package.json', expectedIcon: 'assets/icon.png' },
];

function resolveRepoRoot() {
  const testDir = dirname(fileURLToPath(import.meta.url));
  return resolve(testDir, '../../../..');
}

function readManifest(spec: PackageSpec) {
  const repoRoot = resolveRepoRoot();
  const manifestPath = resolve(repoRoot, spec.manifestPath);
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as PackageManifest;

  return { repoRoot, manifestPath, manifest };
}

function hashFile(path: string) {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

describe('package icon metadata', () => {
  it('uses the shared icon asset name across published packages', () => {
    for (const spec of packageSpecs) {
      const { manifest, manifestPath } = readManifest(spec);
      const packageDir = dirname(manifestPath);

      expect(manifest.icon, `${spec.label} manifest icon`).toBe(spec.expectedIcon);
      expect(manifest.icon, `${spec.label} manifest icon name`).not.toContain('marketplace');
      expect(existsSync(resolve(packageDir, spec.expectedIcon)), `${spec.label} icon file`).toBe(true);
    }
  });

  it('ships distinct plugin icon art instead of reusing the core icon', () => {
    const [{ manifestPath, manifest: coreManifest }, ...pluginPackages] = packageSpecs.map(readManifest);
    const coreIconPath = resolve(dirname(manifestPath), String(coreManifest.icon));
    const coreHash = hashFile(coreIconPath);
    const pluginHashes = pluginPackages.map(({ manifestPath: pluginManifestPath, manifest }) => {
      const iconPath = resolve(dirname(pluginManifestPath), String(manifest.icon));
      const iconHash = hashFile(iconPath);

      expect(iconHash).not.toBe(coreHash);
      return iconHash;
    });

    expect(new Set(pluginHashes).size).toBe(pluginHashes.length);
  });
});
