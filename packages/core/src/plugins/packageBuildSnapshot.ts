import { createHash, randomUUID } from 'node:crypto';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';

const PACKAGE_BUILD_SNAPSHOT_LIMIT = 2;
const ignoredPackageBuildDirectories = new Set<string>(['.git', 'node_modules']);

export interface CodeGraphyPackageBuildSnapshot {
  buildIdentity: string;
  snapshotPackageRoot: string;
}

async function hashPackageBuildDirectory(
  hash: ReturnType<typeof createHash>,
  packageRoot: string,
  directoryPath: string,
): Promise<void> {
  const entries = await fs.readdir(directoryPath, { withFileTypes: true });
  entries.sort((left, right) => left.name.localeCompare(right.name));

  for (const entry of entries) {
    if (entry.isDirectory() && ignoredPackageBuildDirectories.has(entry.name)) continue;

    const entryPath = path.join(directoryPath, entry.name);
    const relativePath = path.relative(packageRoot, entryPath);
    hash.update(relativePath);
    hash.update('\0');

    if (entry.isDirectory()) {
      await hashPackageBuildDirectory(hash, packageRoot, entryPath);
    } else if (entry.isFile()) {
      hash.update(await fs.readFile(entryPath));
    } else if (entry.isSymbolicLink()) {
      hash.update(await fs.readlink(entryPath));
    }
    hash.update('\0');
  }
}

async function createPackageBuildIdentity(packageRoot: string): Promise<string> {
  const hash = createHash('sha256');
  await hashPackageBuildDirectory(hash, packageRoot, packageRoot);
  return hash.digest('hex');
}

function shouldCopyPackageBuildEntry(packageRoot: string, sourcePath: string): boolean {
  const relativePath = path.relative(packageRoot, sourcePath);
  return !relativePath.split(path.sep).some(segment => (
    ignoredPackageBuildDirectories.has(segment)
  ));
}

async function isDirectory(directoryPath: string): Promise<boolean> {
  try {
    return (await fs.stat(directoryPath)).isDirectory();
  } catch {
    return false;
  }
}

async function findPackageNodeModules(packageRoot: string): Promise<string | undefined> {
  const localNodeModules = path.join(packageRoot, 'node_modules');
  if (await isDirectory(localNodeModules)) return localNodeModules;

  let currentPath = path.resolve(packageRoot);
  while (true) {
    if (path.basename(currentPath) === 'node_modules') return currentPath;
    const parentPath = path.dirname(currentPath);
    if (parentPath === currentPath) return undefined;
    currentPath = parentPath;
  }
}

async function removeOldPackageBuildSnapshots(
  snapshotRoot: string,
  currentBuildIdentity: string,
): Promise<void> {
  const entries = await fs.readdir(snapshotRoot, { withFileTypes: true });
  const builds: Array<{ name: string; modifiedAt: number }> = [];

  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name.startsWith('.')) continue;
    const stats = await fs.stat(path.join(snapshotRoot, entry.name));
    builds.push({ name: entry.name, modifiedAt: stats.mtimeMs });
  }

  builds.sort((left, right) => {
    if (left.name === currentBuildIdentity) return -1;
    if (right.name === currentBuildIdentity) return 1;
    return right.modifiedAt - left.modifiedAt;
  });

  await Promise.all(builds.slice(PACKAGE_BUILD_SNAPSHOT_LIMIT).map(async build => {
    await fs.rm(path.join(snapshotRoot, build.name), { recursive: true, force: true });
  }));
}

async function createPackageBuildSnapshot(
  packageRoot: string,
  buildIdentity: string,
): Promise<string> {
  const packageIdentity = createHash('sha256')
    .update(path.resolve(packageRoot))
    .digest('hex')
    .slice(0, 24);
  const snapshotRoot = path.join(os.tmpdir(), 'codegraphy-plugin-modules', packageIdentity);
  const buildRoot = path.join(snapshotRoot, buildIdentity);
  const snapshotPackageRoot = path.join(buildRoot, 'package');
  await fs.mkdir(snapshotRoot, { recursive: true });

  if (!(await isDirectory(snapshotPackageRoot))) {
    const stagingRoot = path.join(snapshotRoot, `.building-${process.pid}-${randomUUID()}`);
    const stagingPackageRoot = path.join(stagingRoot, 'package');
    await fs.mkdir(stagingRoot, { recursive: true });

    try {
      await fs.cp(packageRoot, stagingPackageRoot, {
        recursive: true,
        filter: sourcePath => shouldCopyPackageBuildEntry(packageRoot, sourcePath),
      });
      const nodeModulesPath = await findPackageNodeModules(packageRoot);
      if (nodeModulesPath) {
        await fs.symlink(nodeModulesPath, path.join(stagingPackageRoot, 'node_modules'), 'junction');
      }
      await fs.rename(stagingRoot, buildRoot);
    } catch (error) {
      await fs.rm(stagingRoot, { recursive: true, force: true });
      if (!(await isDirectory(snapshotPackageRoot))) throw error;
    }
  }

  const now = new Date();
  await fs.utimes(buildRoot, now, now);
  await removeOldPackageBuildSnapshots(snapshotRoot, buildIdentity);
  return snapshotPackageRoot;
}

export async function prepareCodeGraphyPackageBuildSnapshot(
  packageRootInput: string,
): Promise<CodeGraphyPackageBuildSnapshot> {
  const packageRoot = path.resolve(packageRootInput);
  const buildIdentity = await createPackageBuildIdentity(packageRoot);
  const snapshotPackageRoot = await createPackageBuildSnapshot(packageRoot, buildIdentity);
  return { buildIdentity, snapshotPackageRoot };
}
