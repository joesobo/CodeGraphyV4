import { build } from 'esbuild';
import {
  copyFileSync,
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  rmSync,
} from 'node:fs';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';

const args = process.argv.slice(2);

if (args[0] === '--clean') {
  const outputDirectory = args[1];
  if (!outputDirectory) throw new Error('Usage: build-workspace-package.mjs --clean <directory>');
  rmSync(path.resolve(outputDirectory), { force: true, recursive: true });
  process.exit(0);
}

const [entryPoint, outfile, ...buildArgs] = args;

if (!entryPoint || !outfile) {
  throw new Error(
    'Usage: build-workspace-package.mjs <entry> <outfile> [--copy <source> <destination>] [--replace <source> <search> <replacement>]',
  );
}

const copies = [];
const explicitExternalPackages = [];
const replacements = new Map();
const vendoredPackages = [];
let bundleDependencies = false;
for (let index = 0; index < buildArgs.length;) {
  const flag = buildArgs[index];
  if (flag === '--bundle-dependencies') {
    bundleDependencies = true;
    index += 1;
    continue;
  }
  if (flag === '--external') {
    const packageName = buildArgs[index + 1];
    if (!packageName) throw new Error('External packages must use --external <package>');
    explicitExternalPackages.push(packageName);
    index += 2;
    continue;
  }
  if (flag === '--vendor-package') {
    const packageName = buildArgs[index + 1];
    if (!packageName) throw new Error('Vendored packages must use --vendor-package <package>');
    vendoredPackages.push(packageName);
    index += 2;
    continue;
  }
  if (flag === '--copy') {
    const [, source, destination] = buildArgs.slice(index, index + 3);
    if (!source || !destination) throw new Error('Assets must use --copy <source> <destination>');
    copies.push({ source, destination });
    index += 3;
    continue;
  }
  if (flag === '--replace') {
    const [, source, search, replacement] = buildArgs.slice(index, index + 4);
    if (!source || !search || replacement === undefined) {
      throw new Error('Source replacements must use --replace <source> <search> <replacement>');
    }
    const sourcePath = path.resolve(source);
    const sourceReplacements = replacements.get(sourcePath) ?? [];
    sourceReplacements.push({ search, replacement });
    replacements.set(sourcePath, sourceReplacements);
    index += 4;
    continue;
  }
  throw new Error(`Unknown build option: ${flag}`);
}

const packageJson = JSON.parse(readFileSync(path.resolve('package.json'), 'utf8'));
const external = bundleDependencies
  ? explicitExternalPackages
  : [
      ...Object.keys(packageJson.dependencies ?? {}),
      ...Object.keys(packageJson.peerDependencies ?? {}),
      ...Object.keys(packageJson.optionalDependencies ?? {}),
    ];

const replaceSourceTextPlugin = {
  name: 'replace-source-text',
  setup(buildContext) {
    buildContext.onLoad({ filter: /\.[cm]?[jt]sx?$/ }, async ({ path: sourcePath }) => {
      const sourceReplacements = replacements.get(sourcePath);
      if (!sourceReplacements) return undefined;
      let contents = await readFile(sourcePath, 'utf8');
      for (const { search, replacement } of sourceReplacements) {
        if (!contents.includes(search)) {
          throw new Error(`Unable to replace missing text in ${sourcePath}: ${search}`);
        }
        contents = contents.replaceAll(search, replacement);
      }
      return { contents, loader: path.extname(sourcePath).includes('x') ? 'tsx' : 'ts' };
    });
  },
};

const externalizeUnresolvedPackagesPlugin = {
  name: 'externalize-unresolved-packages',
  setup(buildContext) {
    buildContext.onResolve({ filter: /^[^./]/ }, async (args) => {
      if (args.pluginData?.resolvingOptionalPackage) return undefined;
      const result = await buildContext.resolve(args.path, {
        importer: args.importer,
        kind: args.kind,
        namespace: args.namespace,
        pluginData: { resolvingOptionalPackage: true },
        resolveDir: args.resolveDir,
      });
      return result.errors.length === 0 ? result : { external: true };
    });
  },
};

const plugins = [];
if (replacements.size > 0) plugins.push(replaceSourceTextPlugin);
if (bundleDependencies) plugins.push(externalizeUnresolvedPackagesPlugin);

await build({
  ...(bundleDependencies
    ? {
        banner: {
          js: [
            'import { createRequire as __codegraphyCreateRequire } from "node:module";',
            'import { fileURLToPath as __codegraphyFileURLToPath } from "node:url";',
            'import __codegraphyPath from "node:path";',
            'const require = __codegraphyCreateRequire(import.meta.url);',
            'const __filename = __codegraphyFileURLToPath(import.meta.url);',
            'const __dirname = __codegraphyPath.dirname(__filename);',
          ].join(' '),
        },
      }
    : {}),
  entryPoints: [entryPoint],
  outfile,
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node22',
  sourcemap: true,
  external,
  plugins,
});

function resolvePackageRoot(packageName, fromPath) {
  const require = createRequire(path.join(fromPath, 'package.json'));
  try {
    let currentPath = path.dirname(require.resolve(packageName));
    while (!existsSync(path.join(currentPath, 'package.json'))) {
      const parentPath = path.dirname(currentPath);
      if (parentPath === currentPath) break;
      currentPath = parentPath;
    }
    if (existsSync(path.join(currentPath, 'package.json'))) return currentPath;
  } catch {
    // Some binary-only packages do not export a JavaScript entrypoint.
  }

  for (const searchRoot of require.resolve.paths(packageName) ?? []) {
    const candidateRoot = path.join(searchRoot, ...packageName.split('/'));
    if (existsSync(path.join(candidateRoot, 'package.json'))) return realpathSync(candidateRoot);
  }
  throw new Error(`Unable to find package root for ${packageName}`);
}

function vendorRuntimePackage(packageName, outputDirectory, fromPath, visitedPackages) {
  const packageRoot = resolvePackageRoot(packageName, fromPath);
  const packageManifest = JSON.parse(readFileSync(path.join(packageRoot, 'package.json'), 'utf8'));
  const packageIdentity = `${packageManifest.name ?? packageName}@${packageManifest.version ?? packageRoot}`;
  if (visitedPackages.has(packageIdentity)) return;
  visitedPackages.add(packageIdentity);

  const targetRoot = path.join(outputDirectory, 'node_modules', ...packageName.split('/'));
  mkdirSync(path.dirname(targetRoot), { recursive: true });
  cpSync(packageRoot, targetRoot, { recursive: true, force: true, dereference: true });

  const dependencies = {
    ...packageManifest.dependencies,
    ...packageManifest.optionalDependencies,
  };
  for (const dependencyName of Object.keys(dependencies)) {
    try {
      vendorRuntimePackage(dependencyName, outputDirectory, packageRoot, visitedPackages);
    } catch {
      if (dependencyName in (packageManifest.dependencies ?? {})) throw new Error(
        `Unable to vendor required runtime dependency ${dependencyName} for ${packageName}`,
      );
    }
  }
}

const visitedVendoredPackages = new Set();
for (const packageName of vendoredPackages) {
  vendorRuntimePackage(packageName, path.dirname(path.resolve(outfile)), process.cwd(), visitedVendoredPackages);
}

for (const { source, destination } of copies) {
  mkdirSync(path.dirname(path.resolve(destination)), { recursive: true });
  copyFileSync(path.resolve(source), path.resolve(destination));
}
