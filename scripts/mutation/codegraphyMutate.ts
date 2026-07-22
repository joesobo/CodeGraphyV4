import { spawn } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { basename, dirname, extname, isAbsolute, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const DEFAULT_REPO_ROOT = resolve(SCRIPT_DIR, '../..');
const BROAD_FALLBACK_DISABLED_BASENAMES = new Set(['create', 'runtime', 'state']);
const VALUE_FLAGS = new Set([
  '--mutate',
  '--mutate-glob',
  '--mutate-globs-json',
  '--test-include',
  '--test-includes-json',
]);

export interface QualityTarget {
  absolutePath: string;
  kind: 'directory' | 'file' | 'package' | 'repo';
  packageName?: string;
  packageRelativePath?: string;
  packageRoot?: string;
  relativePath: string;
}

interface WorkspacePackage {
  manifestName: string;
  name: string;
  relativeRoot: string;
  root: string;
}

interface FileIncludeParts {
  camelName: string;
  directory: string;
  dottedRelativePath: string;
  includeBroadFallback: boolean;
  name: string;
  relativeTestDirectory: string;
}

interface MutationProcessOptions {
  cwd: string;
  env: NodeJS.ProcessEnv;
}

interface CodeGraphyMutationDependencies {
  repoRoot: string;
  resolveQualityTarget: (repoRoot: string, input?: string) => QualityTarget;
  runQualityToolsMutate: (args: string[], options: MutationProcessOptions) => Promise<void>;
}

interface PreparedMutationRun {
  forwardedArgs: string[];
  target?: QualityTarget;
}

function cleanCliArgs(args: string[]): string[] {
  return args.filter((arg) => arg !== '--');
}

function flagValue(args: readonly string[], flag: string): string | undefined {
  const index = args.indexOf(flag);
  return index === -1 ? undefined : args[index + 1];
}

function unscopedPackageName(manifestName: string): string {
  return manifestName.split('/').at(-1) ?? manifestName;
}

function toPosixPath(pathValue: string): string {
  return pathValue.split('\\').join('/');
}

function toRepoRelativePath(repoRoot: string, input: string): string {
  const relativeInput = isAbsolute(input)
    ? relative(repoRoot, input)
    : input.replace(/^\.\//, '');

  return toPosixPath(relativeInput);
}

function readWorkspacePackages(repoRoot: string): WorkspacePackage[] {
  const packagesRoot = join(repoRoot, 'packages');
  if (!existsSync(packagesRoot)) {
    return [];
  }

  return readdirSync(packagesRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .flatMap((entry) => {
      const root = join(packagesRoot, entry.name);
      const manifestPath = join(root, 'package.json');
      if (!existsSync(manifestPath)) {
        return [];
      }
      const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as { name?: string };
      const manifestName = manifest.name ?? entry.name;
      return [{
        manifestName,
        name: unscopedPackageName(manifestName),
        relativeRoot: `packages/${entry.name}`,
        root,
      }];
    });
}

function findWorkspacePackage(repoRoot: string, input: string): { packageEntry: WorkspacePackage; relativePath: string } | undefined {
  const normalizedInput = toRepoRelativePath(repoRoot, input);
  return readWorkspacePackages(repoRoot)
    .map((packageEntry) => {
      if (
        normalizedInput === packageEntry.relativeRoot ||
        normalizedInput.startsWith(`${packageEntry.relativeRoot}/`)
      ) {
        return { packageEntry, relativePath: normalizedInput };
      }

      for (const alias of [packageEntry.name, packageEntry.manifestName]) {
        if (normalizedInput === alias) {
          return { packageEntry, relativePath: packageEntry.relativeRoot };
        }
        if (normalizedInput.startsWith(`${alias}/`)) {
          return {
            packageEntry,
            relativePath: `${packageEntry.relativeRoot}/${normalizedInput.slice(alias.length + 1)}`,
          };
        }
      }

      return undefined;
    })
    .find((match) => match !== undefined);
}

function targetKind(absolutePath: string, relativePath: string, packageEntry?: WorkspacePackage): QualityTarget['kind'] {
  if (relativePath === '.') {
    return 'repo';
  }

  if (packageEntry && relativePath === packageEntry.relativeRoot) {
    return 'package';
  }

  if (existsSync(absolutePath)) {
    return statSync(absolutePath).isDirectory() ? 'directory' : 'file';
  }

  return extname(relativePath) ? 'file' : 'directory';
}

export function resolveCodeGraphyQualityTarget(repoRoot: string, input = '.'): QualityTarget {
  if (input === '.') {
    return {
      absolutePath: repoRoot,
      kind: 'repo',
      relativePath: '.',
    };
  }

  const packageMatch = findWorkspacePackage(repoRoot, input);
  const relativePath = packageMatch?.relativePath ?? toRepoRelativePath(repoRoot, input);
  const absolutePath = resolve(repoRoot, relativePath);
  const packageRelativePath = packageMatch
    ? toPosixPath(relative(packageMatch.packageEntry.root, absolutePath)) || '.'
    : undefined;

  return {
    absolutePath,
    kind: targetKind(absolutePath, relativePath, packageMatch?.packageEntry),
    relativePath,
    ...(packageMatch
      ? {
          packageName: packageMatch.packageEntry.name,
          packageRelativePath,
          packageRoot: packageMatch.packageEntry.root,
        }
      : {}),
  };
}

function bareTargetArgs(args: readonly string[]): string[] {
  const targets: string[] = [];

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (VALUE_FLAGS.has(arg)) {
      index += 1;
      continue;
    }

    if (!arg.startsWith('--')) {
      targets.push(arg);
    }
  }

  return targets;
}

function removeBareTargets(args: readonly string[], count: number): string[] {
  const filtered: string[] = [];
  let removed = 0;

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (VALUE_FLAGS.has(arg)) {
      filtered.push(arg);
      if (index + 1 < args.length) {
        filtered.push(args[index + 1]);
        index += 1;
      }
      continue;
    }

    if (!arg.startsWith('--') && removed < count) {
      removed += 1;
      continue;
    }

    filtered.push(arg);
  }

  return filtered;
}

function normalizeScopedTargetInput(repoRoot: string, packageTarget: QualityTarget, scopedInput: string): string {
  if (isAbsolute(scopedInput) || scopedInput.startsWith('packages/') || existsSync(resolve(repoRoot, scopedInput))) {
    return scopedInput;
  }

  if (!packageTarget.packageName) {
    return scopedInput;
  }

  return join('packages', packageTarget.packageName, scopedInput);
}

function toCamelCase(value: string): string {
  return value.replace(/-([a-z])/g, (_match, letter: string) => letter.toUpperCase());
}

function normalizeSourcePathForTests(relativeSourcePath: string): string {
  return relativeSourcePath.replace(/^webview\/components\//, 'webview/');
}

function fileIncludeParts(relativeSourceFile: string): FileIncludeParts {
  const normalizedSourceFile = normalizeSourcePathForTests(relativeSourceFile);
  const directory = dirname(normalizedSourceFile);
  const extension = extname(normalizedSourceFile);
  const name = basename(normalizedSourceFile, extension);

  return {
    camelName: toCamelCase(name),
    directory,
    dottedRelativePath: normalizedSourceFile.slice(0, -extension.length).split('/').join('.'),
    includeBroadFallback: !BROAD_FALLBACK_DISABLED_BASENAMES.has(name),
    name,
    relativeTestDirectory: directory === '.' ? '' : `${directory}/`,
  };
}

function baseTestRoots(packageName: string): string[] {
  return [`packages/${packageName}/tests`];
}

function sharedDetectorTestIncludes(root: string, directory: string, recursive = false): string[] {
  if (directory !== 'sources') {
    return [];
  }

  const prefix = recursive ? `${root}/**/` : `${root}/`;
  return [
    `${prefix}ruleDetectors.test.ts`,
    `${prefix}ruleDetectors.test.tsx`,
    `${prefix}*Detectors.test.ts`,
    `${prefix}*Detectors.test.tsx`,
  ];
}

function ancestorFeatureIncludes(root: string, parts: FileIncludeParts): string[] {
  const segments = parts.directory.split('/').filter(Boolean);

  return segments.flatMap((_segment, index) => {
    const featureSegments = segments.slice(0, segments.length - index);
    const featureName = featureSegments.at(-1);
    if (!featureName) {
      return [];
    }

    const featureDirectory = featureSegments.slice(0, -1).join('/');
    const prefix = featureDirectory ? `${featureDirectory}/` : '';
    return [
      `${root}/${prefix}${featureName}.test.ts`,
      `${root}/${prefix}${featureName}.test.tsx`,
      `${root}/${prefix}${featureName}.mutations.test.ts`,
      `${root}/${prefix}${featureName}.mutations.test.tsx`,
    ];
  });
}

function directIncludes(root: string, parts: FileIncludeParts): string[] {
  const segments = parts.directory.split('/').filter(Boolean);
  const treeIncludes = segments.length < 2
    ? []
    : [
        `${root}/${parts.relativeTestDirectory}**/*.test.ts`,
        `${root}/${parts.relativeTestDirectory}**/*.test.tsx`,
        `${root}/${parts.relativeTestDirectory}**/*.mutations.test.ts`,
        `${root}/${parts.relativeTestDirectory}**/*.mutations.test.tsx`,
      ];

  return [
    ...treeIncludes,
    `${root}/${parts.relativeTestDirectory}${parts.name}.test.ts`,
    `${root}/${parts.relativeTestDirectory}${parts.name}.test.tsx`,
    `${root}/${parts.relativeTestDirectory}${parts.name}.mutations.test.ts`,
    `${root}/${parts.relativeTestDirectory}${parts.name}.mutations.test.tsx`,
    `${root}/${parts.relativeTestDirectory}${parts.name}*.test.ts`,
    `${root}/${parts.relativeTestDirectory}${parts.name}*.test.tsx`,
    `${root}/${parts.relativeTestDirectory}${parts.name}/**/*.test.ts`,
    `${root}/${parts.relativeTestDirectory}${parts.name}/**/*.test.tsx`,
    `${root}/${parts.dottedRelativePath}.test.ts`,
    `${root}/${parts.dottedRelativePath}.test.tsx`,
    `${root}/${parts.dottedRelativePath}.mutations.test.ts`,
    `${root}/${parts.dottedRelativePath}.mutations.test.tsx`,
    `${root}/${parts.relativeTestDirectory}${parts.camelName}Rule.test.ts`,
    `${root}/${parts.relativeTestDirectory}${parts.camelName}Rule.test.tsx`,
    ...ancestorFeatureIncludes(root, parts),
    ...sharedDetectorTestIncludes(root, parts.directory),
  ];
}

function fallbackIncludes(root: string, parts: FileIncludeParts): string[] {
  if (!parts.includeBroadFallback) {
    return [];
  }

  return [
    `${root}/**/${parts.name}.test.ts`,
    `${root}/**/${parts.name}.test.tsx`,
    `${root}/**/${parts.name}.mutations.test.ts`,
    `${root}/**/${parts.name}.mutations.test.tsx`,
    `${root}/**/${parts.name}*.test.ts`,
    `${root}/**/${parts.name}*.test.tsx`,
    `${root}/**/${parts.dottedRelativePath}.test.ts`,
    `${root}/**/${parts.dottedRelativePath}.test.tsx`,
    `${root}/**/${parts.dottedRelativePath}.mutations.test.ts`,
    `${root}/**/${parts.dottedRelativePath}.mutations.test.tsx`,
    `${root}/**/${parts.camelName}Rule.test.ts`,
    `${root}/**/${parts.camelName}Rule.test.tsx`,
    ...sharedDetectorTestIncludes(root, parts.directory, true),
    `${root}/**/${parts.name}/**/*.test.ts`,
    `${root}/**/${parts.name}/**/*.test.tsx`,
  ];
}

function fileIncludes(packageName: string, relativeSourceFile: string): string[] {
  const parts = fileIncludeParts(relativeSourceFile);
  return [...new Set(
    baseTestRoots(packageName).flatMap((root) => [
      ...directIncludes(root, parts),
      ...fallbackIncludes(root, parts),
    ]),
  )];
}

function packageIncludes(packageName: string): string[] {
  return [...new Set(
    baseTestRoots(packageName).flatMap((root) => [
      `${root}/**/*.test.ts`,
      `${root}/**/*.test.tsx`,
    ]),
  )];
}

function directoryIncludes(packageName: string, relativeSourceDirectory: string): string[] {
  const normalizedSourceDirectory = normalizeSourcePathForTests(relativeSourceDirectory);
  return [...new Set(
    baseTestRoots(packageName).flatMap((root) => [
      `${root}/${normalizedSourceDirectory}/**/*.test.ts`,
      `${root}/${normalizedSourceDirectory}/**/*.test.tsx`,
    ]),
  )];
}

export function resolveScopedVitestIncludes(target: QualityTarget): string[] | undefined {
  if (!target.packageName) {
    return undefined;
  }

  if (target.kind === 'package') {
    return packageIncludes(target.packageName);
  }

  if (!target.packageRelativePath?.startsWith('src/')) {
    return undefined;
  }

  const relativeSource = target.packageRelativePath.slice('src/'.length);
  return target.kind === 'file'
    ? fileIncludes(target.packageName, relativeSource)
    : directoryIncludes(target.packageName, relativeSource);
}

export function prepareCodeGraphyMutationRun(
  rawArgs: string[],
  dependencies: Pick<CodeGraphyMutationDependencies, 'repoRoot' | 'resolveQualityTarget'> = DEFAULT_DEPENDENCIES,
): PreparedMutationRun {
  const args = cleanCliArgs(rawArgs);
  const mutateInput = flagValue(args, '--mutate');
  if (mutateInput) {
    return {
      forwardedArgs: args,
      target: dependencies.resolveQualityTarget(dependencies.repoRoot, mutateInput),
    };
  }

  const bareTargets = bareTargetArgs(args);
  if (bareTargets.length < 2) {
    const target = bareTargets[0]
      ? dependencies.resolveQualityTarget(dependencies.repoRoot, bareTargets[0])
      : undefined;

    return {
      forwardedArgs: args,
      target,
    };
  }

  const packageTarget = dependencies.resolveQualityTarget(dependencies.repoRoot, bareTargets[0]);
  if (!packageTarget.packageName) {
    throw new Error(
      `Scoped mutation target "${bareTargets[0]}" must resolve to a workspace package before a file path can be applied.`,
    );
  }

  const scopedInput = normalizeScopedTargetInput(dependencies.repoRoot, packageTarget, bareTargets[1]);
  const target = dependencies.resolveQualityTarget(dependencies.repoRoot, scopedInput);
  if (target.packageName !== packageTarget.packageName) {
    throw new Error(
      `Scoped mutation target "${bareTargets[1]}" resolves to ${target.packageName ?? 'no package'}, not ${packageTarget.packageName}.`,
    );
  }

  return {
    forwardedArgs: [scopedInput, ...removeBareTargets(args, 2)],
    target,
  };
}

function mutationEnvironment(target: QualityTarget | undefined): NodeJS.ProcessEnv {
  const scopedVitestIncludes = target ? resolveScopedVitestIncludes(target) : undefined;

  return {
    ...process.env,
    CODEGRAPHY_MUTATION_RUN: '1',
    CODEGRAPHY_VITEST_SCOPE: target?.packageName === 'extension'
      ? 'extension'
      : process.env.CODEGRAPHY_VITEST_SCOPE ?? 'workspace',
    ...(scopedVitestIncludes
      ? {
          CODEGRAPHY_VITEST_INCLUDE_JSON: JSON.stringify(scopedVitestIncludes),
        }
      : {}),
  };
}

function applyForceFromEnvironment(args: string[]): string[] {
  if (args.includes('--force') || process.env.CODEGRAPHY_MUTATE_FORCE !== '1') {
    return args;
  }

  return [...args, '--force'];
}

function runQualityToolsMutate(args: string[], options: MutationProcessOptions): Promise<void> {
  return new Promise((resolveRun, rejectRun) => {
    const child = spawn('pnpm', ['exec', 'quality-tools', 'mutate', ...args], {
      cwd: options.cwd,
      env: options.env,
      stdio: 'inherit',
    });

    child.once('error', rejectRun);
    child.once('exit', (code, signal) => {
      if (code === 0) {
        resolveRun();
        return;
      }

      rejectRun(new Error(`quality-tools mutate exited with ${signal ? `signal ${signal}` : `code ${code ?? 'unknown'}`}.`));
    });
  });
}

const DEFAULT_DEPENDENCIES: CodeGraphyMutationDependencies = {
  repoRoot: DEFAULT_REPO_ROOT,
  resolveQualityTarget: resolveCodeGraphyQualityTarget,
  runQualityToolsMutate,
};

export async function runCodeGraphyMutationCli(
  rawArgs: string[],
  dependencies: CodeGraphyMutationDependencies = DEFAULT_DEPENDENCIES,
): Promise<void> {
  const preparedRun = prepareCodeGraphyMutationRun(rawArgs, dependencies);

  await dependencies.runQualityToolsMutate(
    applyForceFromEnvironment(preparedRun.forwardedArgs),
    {
      cwd: dependencies.repoRoot,
      env: mutationEnvironment(preparedRun.target),
    },
  );
}
