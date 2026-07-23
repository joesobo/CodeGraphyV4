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
    buildContext.onLoad(
      { filter: /src\/documentRuntime\/main\.ts$/ },
      async ({ path }) => ({
        contents: (await readFile(path, 'utf8')).replace(
          placeholder,
          physicsBytes.toString('base64'),
        ),
        loader: 'ts',
      }),
    );
  },
};

await rm(new URL('../dist', import.meta.url), { force: true, recursive: true });
await Promise.all([
  build({
    entryPoints: ['src/main.ts'],
    outfile: 'dist/codegraphy-tldraw.js',
    bundle: true,
    platform: 'node',
    format: 'esm',
    target: 'node20',
    sourcemap: true,
    external,
    banner: { js: '#!/usr/bin/env node' },
  }),
  build({
    entryPoints: ['src/documentRuntime/main.ts'],
    outfile: 'dist/documentRuntime/main.js',
    bundle: true,
    platform: 'browser',
    format: 'esm',
    target: 'es2022',
    sourcemap: true,
    plugins: [embeddedPhysicsPlugin],
  }),
  build({
    entryPoints: ['src/documentRuntime/forceControls/view.ts'],
    outfile: 'dist/documentRuntime/config.js',
    bundle: true,
    platform: 'browser',
    format: 'esm',
    target: 'es2022',
    sourcemap: true,
    external: ['react', 'tldraw'],
  }),
]);
