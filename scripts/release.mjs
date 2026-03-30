import { spawnSync } from 'node:child_process';

const [, , mode, target] = process.argv;

const pluginTargets = ['typescript', 'python', 'csharp', 'godot'];
const publishTargets = ['core', ...pluginTargets, 'plugin-api', 'all'];
const packageTargets = ['core', ...pluginTargets, 'all'];

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    stdio: 'inherit',
    shell: true,
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function printUsage() {
  console.error(
    [
      'Usage:',
      '  pnpm run release:package <core|typescript|python|csharp|godot|all>',
      '  pnpm run release:publish <core|typescript|python|csharp|godot|plugin-api|all>',
    ].join('\n'),
  );
}

if (!mode || !target) {
  printUsage();
  process.exit(1);
}

if (mode === 'package') {
  if (!packageTargets.includes(target)) {
    printUsage();
    process.exit(1);
  }

  if (target === 'all') {
    run('pnpm', ['run', 'release:package', 'core']);
    for (const pluginTarget of pluginTargets) {
      run('pnpm', ['run', 'release:package', pluginTarget]);
    }
    process.exit(0);
  }

  if (target === 'core') {
    run('pnpm', ['run', 'package:vsix']);
    process.exit(0);
  }

  run('pnpm', ['--filter', `codegraphy-${target}`, 'run', 'package:vsix']);
  process.exit(0);
}

if (mode === 'publish') {
  if (!publishTargets.includes(target)) {
    printUsage();
    process.exit(1);
  }

  if (target === 'all') {
    run('pnpm', ['run', 'release:publish', 'plugin-api']);
    run('pnpm', ['run', 'release:publish', 'core']);
    for (const pluginTarget of pluginTargets) {
      run('pnpm', ['run', 'release:publish', pluginTarget]);
    }
    process.exit(0);
  }

  if (target === 'plugin-api') {
    run('pnpm', ['--filter', '@codegraphy-vscode/plugin-api', 'publish', '--access', 'public', '--no-git-checks']);
    process.exit(0);
  }

  if (target === 'core') {
    run('pnpm', ['run', 'publish:vsce']);
    process.exit(0);
  }

  run('pnpm', ['--filter', `codegraphy-${target}`, 'run', 'publish:vsce']);
  process.exit(0);
}

printUsage();
process.exit(1);
