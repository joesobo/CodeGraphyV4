import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { build } from 'esbuild';

const require = createRequire(import.meta.url);

execFileSync(
  process.execPath,
  [require.resolve('typescript/bin/tsc'), '-p', 'tsconfig.build.json'],
  { stdio: 'inherit' },
);

await build({
  entryPoints: ['src/plugin.ts'],
  outfile: 'dist/plugin.js',
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
  bundle: true,
  format: 'esm',
  platform: 'node',
  sourcemap: true,
  target: 'node20',
});
