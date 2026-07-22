import { build } from 'esbuild';
import { readFile } from 'node:fs/promises';

const packageJson = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
const external = [
  ...Object.keys(packageJson.dependencies ?? {}),
  ...Object.keys(packageJson.peerDependencies ?? {}),
  ...Object.keys(packageJson.optionalDependencies ?? {}),
];
const physicsBytes = await readFile(new URL(
  '../../graph-renderer/src/physics/wasm/generated/physics.wasm',
  import.meta.url,
));
const placeholder = 'Q09ERUdSQVBIWV9QSFlTSUNTX1dBU00=';
const embeddedPhysicsPlugin = {
  name: 'embedded-codegraphy-physics',
  setup(buildContext) {
    buildContext.onLoad({ filter: /src\/script\/main\.ts$/ }, async ({ path }) => ({
      contents: (await readFile(path, 'utf8')).replace(placeholder, physicsBytes.toString('base64')),
      loader: 'ts',
    }));
  },
};

await Promise.all([
  build({
    entryPoints: ['src/cli.ts'],
    outfile: 'dist/index.js',
    bundle: true,
    platform: 'node',
    format: 'esm',
    target: 'node22',
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
