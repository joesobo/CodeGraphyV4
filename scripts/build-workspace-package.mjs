import { build } from 'esbuild';
import { copyFileSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
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
const replacements = new Map();
for (let index = 0; index < buildArgs.length;) {
  const flag = buildArgs[index];
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
const external = [
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

await build({
  entryPoints: [entryPoint],
  outfile,
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node22',
  sourcemap: true,
  external,
  plugins: replacements.size === 0 ? [] : [replaceSourceTextPlugin],
});

for (const { source, destination } of copies) {
  mkdirSync(path.dirname(path.resolve(destination)), { recursive: true });
  copyFileSync(path.resolve(source), path.resolve(destination));
}
