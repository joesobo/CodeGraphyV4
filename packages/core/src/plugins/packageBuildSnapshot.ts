import { createHash, randomUUID } from 'node:crypto';
import { rmSync, type Dirent } from 'node:fs';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';

const ignoredPackageBuildDirectories = new Set<string>(['.git', 'node_modules']);
const packageBuildSnapshotBaseRoot = path.join(os.tmpdir(), 'codegraphy-plugin-modules');
let processSnapshotCleanupRegistered = false;

interface LinkedPackageDependency {
  relativePath: string;
  targetPath: string;
}

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
    if (
      directoryPath === packageRoot
      && entry.isDirectory()
      && ignoredPackageBuildDirectories.has(entry.name)
    ) continue;

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
  await hashLinkedPackageDependencies(hash, packageRoot, new Set<string>());
  return hash.digest('hex');
}

async function hashLinkedPackageDependencies(
  hash: ReturnType<typeof createHash>,
  packageRoot: string,
  visitedPackageRoots: Set<string>,
): Promise<void> {
  const resolvedPackageRoot = await fs.realpath(packageRoot);
  if (visitedPackageRoots.has(resolvedPackageRoot)) return;
  visitedPackageRoots.add(resolvedPackageRoot);
  const linkedDependencies = await findLinkedPackageDependencies(resolvedPackageRoot);
  for (const dependency of linkedDependencies) {
    hash.update(`node_modules/${dependency.relativePath}`);
    hash.update('\0');
    await hashPackageBuildDirectory(hash, dependency.targetPath, dependency.targetPath);
    await hashLinkedPackageDependencies(hash, dependency.targetPath, visitedPackageRoots);
  }
}

function shouldCopyPackageBuildEntry(packageRoot: string, sourcePath: string): boolean {
  const relativePath = path.relative(packageRoot, sourcePath);
  const topLevelEntry = relativePath.split(path.sep)[0];
  return !ignoredPackageBuildDirectories.has(topLevelEntry);
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

function isManagedPackageStorePath(targetPath: string): boolean {
  const normalizedPath = targetPath.split(path.sep).join('/');
  return normalizedPath.includes('/node_modules/.pnpm/') || normalizedPath.includes('/.yarn/cache/');
}

async function collectLinkedPackageDependencies(
  nodeModulesRoot: string,
  directoryPath: string,
  dependencies: LinkedPackageDependency[],
): Promise<void> {
  const entries = await fs.readdir(directoryPath, { withFileTypes: true });
  for (const entry of entries) {
    const entryPath = path.join(directoryPath, entry.name);
    if (entry.isDirectory() && entry.name.startsWith('@')) {
      await collectLinkedPackageDependencies(nodeModulesRoot, entryPath, dependencies);
      continue;
    }
    if (!entry.isSymbolicLink()) continue;

    const targetPath = await fs.realpath(entryPath);
    if (isManagedPackageStorePath(targetPath)) continue;
    dependencies.push({
      relativePath: path.relative(nodeModulesRoot, entryPath),
      targetPath,
    });
  }
}

async function findLinkedPackageDependencies(
  packageRoot: string,
): Promise<LinkedPackageDependency[]> {
  const nodeModulesRoot = path.join(packageRoot, 'node_modules');
  if (!(await isDirectory(nodeModulesRoot))) return [];

  const dependencies: LinkedPackageDependency[] = [];
  await collectLinkedPackageDependencies(nodeModulesRoot, nodeModulesRoot, dependencies);
  dependencies.sort((left, right) => left.relativePath.localeCompare(right.relativePath));
  return dependencies;
}

async function materializeLocalNodeModules(
  sourceRoot: string,
  destinationRoot: string,
  linkedDependencies: ReadonlyMap<string, string>,
  visitedPackageRoots: ReadonlySet<string>,
  directoryPath: string = sourceRoot,
): Promise<void> {
  await fs.mkdir(destinationRoot, { recursive: true });
  const entries = await fs.readdir(directoryPath, { withFileTypes: true });
  for (const entry of entries) {
    await materializeNodeModuleEntry({
      destinationRoot,
      directoryPath,
      entry,
      linkedDependencies,
      sourceRoot,
      visitedPackageRoots,
    });
  }
}

async function materializeNodeModuleEntry(options: {
  destinationRoot: string;
  directoryPath: string;
  entry: Dirent;
  linkedDependencies: ReadonlyMap<string, string>;
  sourceRoot: string;
  visitedPackageRoots: ReadonlySet<string>;
}): Promise<void> {
  const sourcePath = path.join(options.directoryPath, options.entry.name);
  const relativePath = path.relative(options.sourceRoot, sourcePath);
  const destinationPath = path.join(options.destinationRoot, options.entry.name);
  if (options.entry.isDirectory() && options.entry.name.startsWith('@')) {
    await materializeLocalNodeModules(
      options.sourceRoot,
      destinationPath,
      options.linkedDependencies,
      options.visitedPackageRoots,
      sourcePath,
    );
    return;
  }

  const linkedTarget = options.linkedDependencies.get(relativePath);
  if (linkedTarget) {
    await materializeLinkedPackageDependency(
      linkedTarget,
      destinationPath,
      options.visitedPackageRoots,
    );
    return;
  }

  const targetPath = options.entry.isSymbolicLink() ? await fs.realpath(sourcePath) : sourcePath;
  const targetStats = await fs.stat(targetPath);
  await fs.symlink(targetPath, destinationPath, targetStats.isDirectory() ? 'junction' : 'file');
}

async function materializeLinkedPackageDependency(
  sourcePackageRoot: string,
  destinationPackageRoot: string,
  visitedPackageRoots: ReadonlySet<string>,
): Promise<void> {
  const resolvedPackageRoot = await fs.realpath(sourcePackageRoot);
  if (visitedPackageRoots.has(resolvedPackageRoot)) {
    await fs.symlink(resolvedPackageRoot, destinationPackageRoot, 'junction');
    return;
  }
  const nextVisitedPackageRoots = new Set(visitedPackageRoots).add(resolvedPackageRoot);
  await fs.cp(resolvedPackageRoot, destinationPackageRoot, {
    recursive: true,
    filter: copiedPath => shouldCopyPackageBuildEntry(resolvedPackageRoot, copiedPath),
  });
  await materializePackageNodeModules(
    resolvedPackageRoot,
    destinationPackageRoot,
    nextVisitedPackageRoots,
  );
}

async function materializePackageNodeModules(
  sourcePackageRoot: string,
  destinationPackageRoot: string,
  visitedPackageRoots: ReadonlySet<string>,
): Promise<void> {
  const nodeModulesPath = await findPackageNodeModules(sourcePackageRoot);
  if (!nodeModulesPath) return;

  const destinationNodeModulesPath = path.join(destinationPackageRoot, 'node_modules');
  const localNodeModulesPath = path.join(sourcePackageRoot, 'node_modules');
  if (path.resolve(nodeModulesPath) !== path.resolve(localNodeModulesPath)) {
    await fs.symlink(nodeModulesPath, destinationNodeModulesPath, 'junction');
    return;
  }

  const linkedDependencies = await findLinkedPackageDependencies(sourcePackageRoot);
  await materializeLocalNodeModules(
    nodeModulesPath,
    destinationNodeModulesPath,
    new Map(linkedDependencies.map(dependency => [
      dependency.relativePath,
      dependency.targetPath,
    ])),
    visitedPackageRoots,
  );
}

function isProcessAlive(processId: number): boolean {
  try {
    process.kill(processId, 0);
    return true;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === 'EPERM';
  }
}

async function removeDeadProcessSnapshots(): Promise<void> {
  await fs.mkdir(packageBuildSnapshotBaseRoot, { recursive: true });
  const processDirectories = await fs.readdir(packageBuildSnapshotBaseRoot, { withFileTypes: true });
  await Promise.all(processDirectories.map(async entry => {
    if (!entry.isDirectory() || !/^\d+$/.test(entry.name)) return;
    const processId = Number(entry.name);
    if (processId === process.pid || isProcessAlive(processId)) return;
    await fs.rm(path.join(packageBuildSnapshotBaseRoot, entry.name), { recursive: true, force: true });
  }));
}

function registerProcessSnapshotCleanup(): void {
  if (processSnapshotCleanupRegistered) return;
  processSnapshotCleanupRegistered = true;
  process.once('exit', () => {
    rmSync(path.join(packageBuildSnapshotBaseRoot, String(process.pid)), {
      recursive: true,
      force: true,
    });
  });
}

async function createPackageBuildSnapshot(
  packageRoot: string,
  buildIdentity: string,
): Promise<string> {
  const packageIdentity = createHash('sha256')
    .update(path.resolve(packageRoot))
    .digest('hex')
    .slice(0, 24);
  const snapshotRoot = path.join(
    packageBuildSnapshotBaseRoot,
    String(process.pid),
    packageIdentity,
  );
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
      await materializePackageNodeModules(
        packageRoot,
        stagingPackageRoot,
        new Set([await fs.realpath(packageRoot)]),
      );
      await fs.rename(stagingRoot, buildRoot);
    } catch (error) {
      await fs.rm(stagingRoot, { recursive: true, force: true });
      if (!(await isDirectory(snapshotPackageRoot))) throw error;
    }
  }

  return snapshotPackageRoot;
}

export async function prepareCodeGraphyPackageBuildSnapshot(
  packageRootInput: string,
): Promise<CodeGraphyPackageBuildSnapshot> {
  registerProcessSnapshotCleanup();
  await removeDeadProcessSnapshots();
  const packageRoot = await fs.realpath(path.resolve(packageRootInput));
  const buildIdentity = await createPackageBuildIdentity(packageRoot);
  const snapshotPackageRoot = await createPackageBuildSnapshot(packageRoot, buildIdentity);
  return { buildIdentity, snapshotPackageRoot };
}
