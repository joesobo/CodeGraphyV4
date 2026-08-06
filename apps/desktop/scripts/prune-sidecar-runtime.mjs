import { lstatSync, readdirSync, rmSync } from 'node:fs';
import path from 'node:path';

const developmentDirectories = new Set([
  '.github',
  'benchmark',
  'benchmarks',
  'docs',
  'example',
  'examples',
  'scripts',
  'src',
  'test',
  'tests',
]);

const developmentFileExtensions = [
  '.d.ts',
  '.d.ts.map',
  '.map',
  '.markdown',
  '.md',
  '.ts',
  '.tsx',
];

const buildOnlyPackages = [
  'node-addon-api',
  'npm-check-updates',
  'tree-sitter-cli',
];

function isDevelopmentFile(name) {
  const lowerName = name.toLowerCase();
  return developmentFileExtensions.some(extension => lowerName.endsWith(extension));
}

function pruneDirectory(directory, nativePrebuildDirectory, counters) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isSymbolicLink()) {
      if (entry.name === '.bin') {
        rmSync(entryPath, { force: true, recursive: true });
        counters.directories += 1;
      }
      continue;
    }
    if (entry.isDirectory()) {
      const parentName = path.basename(directory);
      const removePrebuild = parentName === 'prebuilds'
        && !entry.name.startsWith(nativePrebuildDirectory);
      if (developmentDirectories.has(entry.name) || entry.name === '.bin' || removePrebuild) {
        rmSync(entryPath, { force: true, recursive: true });
        counters.directories += 1;
        continue;
      }
      pruneDirectory(entryPath, nativePrebuildDirectory, counters);
      continue;
    }
    if (entry.isFile() && isDevelopmentFile(entry.name)) {
      rmSync(entryPath, { force: true });
      counters.files += 1;
    }
  }
}

export function pruneDeployedRuntime(runtimeRoot, target) {
  const nativePrebuildDirectory = target.startsWith('aarch64-') ? 'darwin-arm64' : 'darwin-x64';
  const counters = { directories: 0, files: 0 };
  if (!lstatSync(runtimeRoot).isDirectory()) throw new Error(`Runtime is not a directory: ${runtimeRoot}`);
  pruneDirectory(runtimeRoot, nativePrebuildDirectory, counters);
  for (const packageName of buildOnlyPackages) {
    const packagePath = path.join(runtimeRoot, 'node_modules', packageName);
    rmSync(packagePath, { force: true, recursive: true });
    counters.directories += 1;
  }
  return counters;
}
