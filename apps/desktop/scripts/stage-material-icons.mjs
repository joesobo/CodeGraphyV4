import { cp, copyFile, mkdir, readdir, rm, stat } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const desktopRoot = resolve(scriptDirectory, '..');
const packageRoot = dirname(require.resolve('material-icon-theme/package.json'));
const sourceManifest = join(packageRoot, 'dist', 'material-icons.json');
const sourceIcons = join(packageRoot, 'icons');
const stagingRoot = join(desktopRoot, 'public', 'material-icons');
const stagedManifest = join(stagingRoot, 'dist', 'material-icons.json');
const stagedIcons = join(stagingRoot, 'icons');

await rm(stagingRoot, { force: true, recursive: true });
await mkdir(dirname(stagedManifest), { recursive: true });
await copyFile(sourceManifest, stagedManifest);
await cp(sourceIcons, stagedIcons, { recursive: true });

const staged = await measureFiles(stagingRoot);
console.log(`Staged Material Icon Theme: ${staged.count} files, ${formatBytes(staged.bytes)}.`);

async function measureFiles(root) {
  const entries = (await readdir(root, { withFileTypes: true }))
    .sort((left, right) => left.name.localeCompare(right.name));
  let count = 0;
  let bytes = 0;

  for (const entry of entries) {
    const entryPath = join(root, entry.name);
    if (entry.isDirectory()) {
      const nested = await measureFiles(entryPath);
      count += nested.count;
      bytes += nested.bytes;
    } else if (entry.isFile()) {
      count += 1;
      bytes += (await stat(entryPath)).size;
    }
  }

  return { count, bytes };
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KiB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MiB`;
}
