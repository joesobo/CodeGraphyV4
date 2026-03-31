import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

type PackageSpec = {
  label: string;
  manifestPath: string;
  expectedIcon: string;
  expectedSvgIcon: string;
};

type PackageManifest = {
  icon?: string;
};

const packageSpecs: PackageSpec[] = [
  { label: 'core extension', manifestPath: 'package.json', expectedIcon: 'assets/icon.png', expectedSvgIcon: 'assets/icon.svg' },
  { label: 'TypeScript plugin', manifestPath: 'packages/plugin-typescript/package.json', expectedIcon: 'assets/icon.png', expectedSvgIcon: 'assets/icon.svg' },
  { label: 'Python plugin', manifestPath: 'packages/plugin-python/package.json', expectedIcon: 'assets/icon.png', expectedSvgIcon: 'assets/icon.svg' },
  { label: 'C# plugin', manifestPath: 'packages/plugin-csharp/package.json', expectedIcon: 'assets/icon.png', expectedSvgIcon: 'assets/icon.svg' },
  { label: 'GDScript plugin', manifestPath: 'packages/plugin-godot/package.json', expectedIcon: 'assets/icon.png', expectedSvgIcon: 'assets/icon.svg' },
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
      expect(existsSync(resolve(packageDir, spec.expectedSvgIcon)), `${spec.label} svg icon file`).toBe(true);
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

  it('ships svg sources without hard outline strokes', () => {
    for (const spec of packageSpecs) {
      const { manifestPath } = readManifest(spec);
      const packageDir = dirname(manifestPath);
      const svgIconPath = resolve(packageDir, spec.expectedSvgIcon);
      const svg = readFileSync(svgIconPath, 'utf8');

      expect(svg, `${spec.label} svg outline`).not.toContain('stroke=');
    }
  });
});
