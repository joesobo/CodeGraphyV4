import { mkdirSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const workspaceDependencyTypes = ['dependencies', 'devDependencies', 'peerDependencies'];

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, 'utf8'));
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    stdio: 'inherit',
    shell: true,
    ...options,
  });

  return {
    status: result.status ?? 1,
  };
}

function requireSuccess(result) {
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function workspacePatterns(rootManifest) {
  if (Array.isArray(rootManifest.workspaces)) {
    return rootManifest.workspaces;
  }

  if (Array.isArray(rootManifest.workspaces?.packages)) {
    return rootManifest.workspaces.packages;
  }

  return [];
}

function packageAlias(packageName) {
  if (packageName.startsWith('@')) {
    return packageName.split('/').at(-1);
  }

  if (packageName.startsWith('codegraphy-')) {
    return packageName.slice('codegraphy-'.length);
  }

  return packageName;
}

function collectWorkspacePackages(baseDir) {
  const rootManifest = readJson(path.join(baseDir, 'package.json'));
  const packages = [];

  for (const pattern of workspacePatterns(rootManifest)) {
    if (!pattern.endsWith('/*')) {
      continue;
    }

    const workspaceDir = path.join(baseDir, pattern.slice(0, -2));
    const entries = readdirSync(workspaceDir, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory()) {
        continue;
      }

      const packageJsonPath = path.join(workspaceDir, entry.name, 'package.json');
      const manifest = readJson(packageJsonPath);

      packages.push({
        dir: path.dirname(packageJsonPath),
        manifest,
      });
    }
  }

  return packages;
}

function workspaceDependencies(manifest, workspacePackageNames) {
  const dependencies = new Set();

  for (const dependencyType of workspaceDependencyTypes) {
    const dependencyEntries = Object.entries(manifest[dependencyType] ?? {});

    for (const [packageName, versionRange] of dependencyEntries) {
      if (versionRange === 'workspace:*' && workspacePackageNames.has(packageName)) {
        dependencies.add(packageName);
      }
    }
  }

  return dependencies;
}

function sortByWorkspaceDependencies(packages) {
  const workspacePackageNames = new Set(packages.map(({ manifest }) => manifest.name));
  const pending = new Map(packages.map((workspacePackage) => [workspacePackage.manifest.name, workspacePackage]));
  const sorted = [];

  while (pending.size > 0) {
    const readyPackages = Array.from(pending.values())
      .filter(({ manifest }) => {
        const dependencies = workspaceDependencies(manifest, workspacePackageNames);
        return Array.from(dependencies).every((dependencyName) => !pending.has(dependencyName));
      })
      .sort((left, right) => left.manifest.name.localeCompare(right.manifest.name));

    if (readyPackages.length === 0) {
      const remainingPackages = Array.from(pending.values())
        .sort((left, right) => left.manifest.name.localeCompare(right.manifest.name));
      sorted.push(...remainingPackages);
      break;
    }

    for (const workspacePackage of readyPackages) {
      sorted.push(workspacePackage);
      pending.delete(workspacePackage.manifest.name);
    }
  }

  return sorted;
}

function toWorkspaceReleaseTarget(workspacePackage) {
  const { manifest } = workspacePackage;
  const hasVsceRelease = Boolean(manifest.scripts?.['package:vsix'] || manifest.scripts?.['publish:vsce']);

  return {
    id: packageAlias(manifest.name),
    aliases: [packageAlias(manifest.name), manifest.name],
    kind: hasVsceRelease ? 'vsce' : 'npm',
    packageName: manifest.name,
    version: manifest.version,
    access: manifest.publishConfig?.access ?? 'public',
  };
}

export function collectReleaseTargets(baseDir = repoRoot) {
  const workspaceTargets = sortByWorkspaceDependencies(
    collectWorkspacePackages(baseDir).filter(({ manifest }) => manifest.private !== true),
  ).map(toWorkspaceReleaseTarget);

  const npmTargets = workspaceTargets.filter((target) => target.kind === 'npm');
  const vsceTargets = workspaceTargets.filter((target) => target.kind === 'vsce');

  return [
    ...npmTargets,
    {
      id: 'core',
      aliases: ['core'],
      kind: 'core',
    },
    ...vsceTargets,
  ];
}

function targetMatches(target, requestedTarget) {
  return target.aliases.includes(requestedTarget);
}

export function resolveReleaseTargets(requestedTarget, baseDir = repoRoot) {
  const releaseTargets = collectReleaseTargets(baseDir);

  if (requestedTarget === 'all') {
    return releaseTargets;
  }

  if (requestedTarget === 'npm') {
    return releaseTargets.filter((target) => target.kind === 'npm');
  }

  if (requestedTarget === 'vsce') {
    return releaseTargets.filter((target) => target.kind === 'core' || target.kind === 'vsce');
  }

  return releaseTargets.filter((target) => targetMatches(target, requestedTarget));
}

function formatUsage(baseDir = repoRoot) {
  const targetNames = [
    'all',
    'npm',
    'vsce',
    ...collectReleaseTargets(baseDir).map((target) => target.id),
  ];
  const targetList = Array.from(new Set(targetNames)).join('|');

  return [
    'Usage:',
    `  pnpm run release:package <${targetList}>`,
    `  pnpm run release:publish <${targetList}>`,
  ].join('\n');
}

function npmVersionExists(target, baseDir, runCommand) {
  const result = runCommand(
    'npm',
    ['view', `${target.packageName}@${target.version}`, 'version', '--json'],
    { cwd: baseDir, stdio: 'pipe' },
  );

  return result.status === 0;
}

function runCoreRelease(mode, baseDir, runCommand) {
  return runCommand('pnpm', ['run', mode === 'package' ? 'package:vsix' : 'publish:vsce'], {
    cwd: baseDir,
  });
}

function runNpmRelease(mode, target, baseDir, runCommand) {
  if (mode === 'package') {
    const artifactDir = path.join(baseDir, 'artifacts', 'npm');
    mkdirSync(artifactDir, { recursive: true });
    return runCommand('pnpm', ['--filter', target.packageName, 'pack', '--pack-destination', artifactDir], {
      cwd: baseDir,
    });
  }

  if (npmVersionExists(target, baseDir, runCommand)) {
    console.log(`${target.packageName}@${target.version} already exists on npm; skipping.`);
    return { status: 0 };
  }

  return runCommand(
    'pnpm',
    ['--filter', target.packageName, 'publish', '--access', target.access, '--no-git-checks'],
    { cwd: baseDir },
  );
}

function runVsceRelease(mode, target, baseDir, runCommand) {
  return runCommand(
    'pnpm',
    ['--filter', target.packageName, 'run', mode === 'package' ? 'package:vsix' : 'publish:vsce'],
    { cwd: baseDir },
  );
}

function runReleaseTarget(mode, target, baseDir, runCommand) {
  if (target.kind === 'core') {
    return runCoreRelease(mode, baseDir, runCommand);
  }

  if (target.kind === 'npm') {
    return runNpmRelease(mode, target, baseDir, runCommand);
  }

  return runVsceRelease(mode, target, baseDir, runCommand);
}

export function runRelease(mode, requestedTarget, baseDir = repoRoot, runCommand = run) {
  if (mode !== 'package' && mode !== 'publish') {
    console.error(formatUsage(baseDir));
    process.exit(1);
  }

  const targets = resolveReleaseTargets(requestedTarget, baseDir);

  if (targets.length === 0) {
    console.error(formatUsage(baseDir));
    process.exit(1);
  }

  for (const target of targets) {
    requireSuccess(runReleaseTarget(mode, target, baseDir, runCommand));
  }
}

const [, , mode, target] = process.argv;

if (mode || target) {
  if (!mode || !target) {
    console.error(formatUsage());
    process.exit(1);
  }

  runRelease(mode, target);
}
