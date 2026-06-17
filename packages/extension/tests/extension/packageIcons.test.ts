import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

type PackageSpec = {
  label: string;
  manifestPath: string;
  iconPath: string;
  svgIconPath: string;
};

type PackageManifest = {
  icon?: string;
  activationEvents?: string[];
  contributes?: unknown;
  extensionDependencies?: string[];
};

const coreExtensionSpec: PackageSpec = {
  label: 'core extension',
  manifestPath: 'package.json',
  iconPath: 'assets/icon.png',
  svgIconPath: 'assets/icon.svg',
};

const pluginSpecs: PackageSpec[] = [
  { label: 'TypeScript plugin', manifestPath: 'packages/plugin-typescript/package.json', iconPath: 'assets/icon.png', svgIconPath: 'assets/icon.svg' },
  { label: 'GDScript plugin', manifestPath: 'packages/plugin-godot/package.json', iconPath: 'assets/icon.png', svgIconPath: 'assets/icon.svg' },
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
  it('uses the shared icon asset name for the VS Code extension package', () => {
    const { manifest, manifestPath } = readManifest(coreExtensionSpec);
    const packageDir = dirname(manifestPath);

    expect(manifest.icon, 'core extension manifest icon').toBe(coreExtensionSpec.iconPath);
    expect(manifest.icon, 'core extension manifest icon name').not.toContain('marketplace');
    expect(existsSync(resolve(packageDir, coreExtensionSpec.iconPath)), 'core extension icon file').toBe(true);
    expect(existsSync(resolve(packageDir, coreExtensionSpec.svgIconPath)), 'core extension svg icon file').toBe(true);
  });

  it('keeps first-party language plugin packages free of VS Code marketplace metadata', () => {
    for (const spec of pluginSpecs) {
      const { manifest } = readManifest(spec);

      expect(manifest.icon, `${spec.label} manifest icon`).toBeUndefined();
      expect(manifest.activationEvents, `${spec.label} activation events`).toBeUndefined();
      expect(manifest.contributes, `${spec.label} VS Code contributions`).toBeUndefined();
      expect(manifest.extensionDependencies, `${spec.label} extension dependencies`).toBeUndefined();
    }
  });

  it('keeps distinct plugin icon source art instead of reusing the core icon', () => {
    const { manifestPath } = readManifest(coreExtensionSpec);
    const coreIconPath = resolve(dirname(manifestPath), coreExtensionSpec.iconPath);
    const coreHash = hashFile(coreIconPath);
    const pluginHashes = pluginSpecs.map((spec) => {
      const { manifestPath: pluginManifestPath } = readManifest(spec);
      const iconPath = resolve(dirname(pluginManifestPath), spec.iconPath);
      const iconHash = hashFile(iconPath);

      expect(iconHash).not.toBe(coreHash);
      return iconHash;
    });

    expect(new Set(pluginHashes).size).toBe(pluginHashes.length);
  });

  it('ships svg sources without hard outline strokes', () => {
    for (const spec of [coreExtensionSpec, ...pluginSpecs]) {
      const { manifestPath } = readManifest(spec);
      const packageDir = dirname(manifestPath);
      const svgIconPath = resolve(packageDir, spec.svgIconPath);
      const svg = readFileSync(svgIconPath, 'utf8');

      expect(svg, `${spec.label} svg outline`).not.toContain('stroke=');
    }
  });
});
