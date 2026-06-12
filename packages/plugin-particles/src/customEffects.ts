import { mkdir, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

export interface CustomParticleEffectAsset {
  id: string;
  label: string;
  path: string;
  kind: 'particle-effect';
  metadata: {
    sourcePath: string;
  };
}

const CUSTOM_EFFECTS_DIR = path.join('.codegraphy', 'particles');
const CUSTOM_EFFECT_CACHE_DIR = path.join('.codegraphy', 'cache', 'particles');
const CUSTOM_EFFECTS_ASSET_DIR = '.codegraphy/particles';

export async function compileCustomParticleEffects(workspaceRoot: string): Promise<CustomParticleEffectAsset[]> {
  const sourceDir = path.join(workspaceRoot, CUSTOM_EFFECTS_DIR);
  let entries: string[];
  try {
    entries = await readdir(sourceDir);
  } catch {
    return [];
  }

  const sourceFiles = entries
    .filter(entry => entry.endsWith('.ts') && !entry.endsWith('.d.ts'))
    .sort((left, right) => left.localeCompare(right));

  if (sourceFiles.length === 0) {
    return [];
  }

  const outputDir = path.join(workspaceRoot, CUSTOM_EFFECT_CACHE_DIR);
  await mkdir(outputDir, { recursive: true });

  const assets: CustomParticleEffectAsset[] = [];
  const { build } = await import('esbuild');
  for (const sourceFile of sourceFiles) {
    const id = toEffectId(sourceFile);
    const sourcePath = path.join(sourceDir, sourceFile);
    const outputPath = path.join(outputDir, `${id}.js`);
    const result = await build({
      bundle: true,
      entryPoints: [sourcePath],
      format: 'esm',
      platform: 'browser',
      sourcemap: 'inline',
      target: 'es2020',
      write: false,
    });
    const output = result.outputFiles[0]?.text;
    if (!output) {
      continue;
    }

    await writeFile(outputPath, output, 'utf8');
    assets.push({
      id,
      label: toEffectLabel(id),
      path: outputPath,
      kind: 'particle-effect',
      metadata: {
        sourcePath: `${CUSTOM_EFFECTS_ASSET_DIR}/${sourceFile}`,
      },
    });
  }

  return assets;
}

function toEffectId(sourceFile: string): string {
  return path.basename(sourceFile, path.extname(sourceFile))
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
}

function toEffectLabel(id: string): string {
  return id
    .split(/[-_]+/)
    .filter(Boolean)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
