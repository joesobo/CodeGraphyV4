import { readFile, rm } from 'node:fs/promises';

import { build, type Plugin } from 'esbuild';

interface PackageManifest {
  dependencies?: Readonly<Record<string, string>>;
  optionalDependencies?: Readonly<Record<string, string>>;
  peerDependencies?: Readonly<Record<string, string>>;
}

const packageJson = JSON.parse(
  await readFile(new URL('../package.json', import.meta.url), 'utf8'),
) as PackageManifest;
const external: string[] = [
  ...Object.keys(packageJson.dependencies ?? {}),
  ...Object.keys(packageJson.peerDependencies ?? {}),
  ...Object.keys(packageJson.optionalDependencies ?? {}),
];
const physicsBytes = await readFile(
  new URL(import.meta.resolve('@codegraphy-dev/graph-renderer/physics.wasm')),
);
const placeholder = 'Q09ERUdSQVBIWV9QSFlTSUNTX1dBU00=';
const embeddedPhysicsPlugin: Plugin = {
  name: 'embedded-codegraphy-physics',
  setup(buildContext): void {
    buildContext.onLoad({ filter: /src\/script\/main\.ts$/ }, async ({ path }) => ({
      contents: (await readFile(path, 'utf8')).replace(
        placeholder,
        physicsBytes.toString('base64'),
      ),
      loader: 'ts',
    }));
  },
};

await rm(new URL('../dist', import.meta.url), { force: true, recursive: true });
await Promise.all([
  build({
    entryPoints: ['src/cli.ts'],
    outfile: 'dist/index.js',
    bundle: true,
    platform: 'node',
    format: 'esm',
    target: 'node20',
    sourcemap: true,
    external,
  }),
  build({
    entryPoints: ['src/script/main.ts'],
    outfile: 'dist/script/main.js',
    bundle: true,
    platform: 'browser',
    format: 'esm',
    target: 'es2022',
    sourcemap: true,
    plugins: [embeddedPhysicsPlugin],
  }),
  build({
    entryPoints: ['src/script/forceControls/view.ts'],
    outfile: 'dist/script/config.js',
    bundle: true,
    platform: 'browser',
    format: 'esm',
    target: 'es2022',
    sourcemap: true,
    external: ['react', 'tldraw'],
  }),
]);
