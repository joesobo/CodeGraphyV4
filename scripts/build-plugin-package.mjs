import { existsSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { build } from 'esbuild';

const packageRoot = process.cwd();
const packageJson = JSON.parse(readFileSync(path.join(packageRoot, 'package.json'), 'utf8'));
const rootExport = packageJson.exports?.['.'];
const declarationPath = rootExport?.types ?? packageJson.types;
const runtimePath = rootExport?.default ?? packageJson.main;

if (!declarationPath || !runtimePath) {
  throw new Error('Plugin packages must declare root types and runtime entrypoints.');
}

execFileSync(
  process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm',
  ['exec', 'tsc', '-p', 'tsconfig.build.json', '--emitDeclarationOnly'],
  { stdio: 'inherit' },
);

const sourcePath = declarationPath
  .replace(/^\.\/dist\//, 'src/')
  .replace(/\.d\.ts$/, '.ts');
const workspaceBuilder = path.resolve(packageRoot, '../../scripts/build-workspace-package.mjs');
const buildConfiguration = packageJson.codegraphyBuild ?? {};
const runtimeArguments = [
  workspaceBuilder,
  sourcePath,
  runtimePath,
  '--bundle-dependencies',
];

for (const packageName of buildConfiguration.external ?? []) {
  runtimeArguments.push('--external', packageName);
}
for (const packageName of buildConfiguration.vendor ?? []) {
  runtimeArguments.push('--vendor-package', packageName);
}

execFileSync(process.execPath, runtimeArguments, { stdio: 'inherit' });

const browserEntries = new Map();
for (const [exportName, exportValue] of Object.entries(packageJson.exports ?? {})) {
  if (exportName === '.' || typeof exportValue !== 'object') continue;
  const exportedTypes = exportValue.types;
  const exportedRuntime = exportValue.default;
  if (typeof exportedTypes !== 'string' || typeof exportedRuntime !== 'string') continue;
  browserEntries.set(
    exportedTypes.replace(/^\.\/dist\//, 'src/').replace(/\.d\.ts$/, '.ts'),
    exportedRuntime,
  );
}

for (const extension of ['ts', 'tsx']) {
  const webviewSource = `src/webview.${extension}`;
  if (existsSync(path.join(packageRoot, webviewSource))) {
    browserEntries.set(webviewSource, 'dist/webview.js');
  }
}

for (const [entryPoint, outfile] of browserEntries) {
  await build({
    entryPoints: [entryPoint],
    outfile,
    bundle: true,
    platform: 'browser',
    format: 'esm',
    target: 'es2020',
    sourcemap: true,
    define: {
      'process.env.NODE_ENV': '"production"',
    },
  });
}
