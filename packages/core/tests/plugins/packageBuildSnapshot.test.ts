import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { pathToFileURL } from 'node:url';
import { describe, expect, it } from 'vitest';
import { prepareCodeGraphyPackageBuildSnapshot } from '../../src/plugins/packageBuildSnapshot';
import {
  createPackageFixtureRoot,
  fs,
  os,
  path,
} from './packageRuntimeFixture';

describe('CodeGraphy package build snapshots', () => {
  it('does not evict snapshots that the current process can still use', async () => {
    const packageRoot = await createPackageFixtureRoot('codegraphy-build-snapshot-');
    await fs.writeFile(path.join(packageRoot, 'package.json'), '{}', 'utf8');
    const snapshotRoots: string[] = [];

    for (const version of ['one', 'two', 'three']) {
      await fs.writeFile(path.join(packageRoot, 'plugin.js'), `export default '${version}';`, 'utf8');
      const snapshot = await prepareCodeGraphyPackageBuildSnapshot(packageRoot);
      snapshotRoots.push(snapshot.snapshotPackageRoot);
    }

    await Promise.all(snapshotRoots.map(async snapshotRoot => {
      await expect(fs.access(snapshotRoot)).resolves.toBeUndefined();
    }));
    const retainedBuilds = (await fs.readdir(
      path.dirname(path.dirname(snapshotRoots.at(-1)!)),
      { withFileTypes: true },
    )).filter(entry => entry.isDirectory() && !entry.name.startsWith('.'));
    expect(retainedBuilds).toHaveLength(3);
  });

  it('refreshes a linked dependency when its package version stays unchanged', async () => {
    const packageRoot = await createPackageFixtureRoot('codegraphy-linked-dependency-');
    const dependencyRoot = await createPackageFixtureRoot('codegraphy-linked-runtime-');
    await fs.mkdir(path.join(packageRoot, 'node_modules', '@acme'), { recursive: true });
    await fs.writeFile(path.join(packageRoot, 'package.json'), JSON.stringify({ type: 'module' }), 'utf8');
    await fs.writeFile(
      path.join(packageRoot, 'plugin.js'),
      "export { marker as default } from '@acme/linked-runtime';",
      'utf8',
    );
    await fs.writeFile(
      path.join(dependencyRoot, 'package.json'),
      JSON.stringify({ name: '@acme/linked-runtime', type: 'module', exports: './index.js' }),
      'utf8',
    );
    await fs.writeFile(path.join(dependencyRoot, 'index.js'), "export const marker = 'v1';", 'utf8');
    await fs.symlink(
      dependencyRoot,
      path.join(packageRoot, 'node_modules', '@acme', 'linked-runtime'),
    );

    const first = await prepareCodeGraphyPackageBuildSnapshot(packageRoot);
    const firstRuntime = await import(pathToFileURL(path.join(first.snapshotPackageRoot, 'plugin.js')).href);
    await fs.writeFile(path.join(dependencyRoot, 'index.js'), "export const marker = 'v2';", 'utf8');
    const second = await prepareCodeGraphyPackageBuildSnapshot(packageRoot);
    const secondRuntime = await import(pathToFileURL(path.join(second.snapshotPackageRoot, 'plugin.js')).href);

    expect(second.buildIdentity).not.toBe(first.buildIdentity);
    expect(firstRuntime.default).toBe('v1');
    expect(secondRuntime.default).toBe('v2');
  });

  it('preserves and refreshes dependencies of a linked dependency', async () => {
    const packageRoot = await createPackageFixtureRoot('codegraphy-transitive-package-');
    const dependencyRoot = await createPackageFixtureRoot('codegraphy-transitive-runtime-');
    const nestedDependencyRoot = await createPackageFixtureRoot('codegraphy-nested-runtime-');
    await fs.mkdir(path.join(packageRoot, 'node_modules', '@acme'), { recursive: true });
    await fs.mkdir(path.join(dependencyRoot, 'node_modules', '@acme'), { recursive: true });
    await fs.writeFile(path.join(packageRoot, 'package.json'), JSON.stringify({ type: 'module' }), 'utf8');
    await fs.writeFile(
      path.join(packageRoot, 'plugin.js'),
      "export { marker as default } from '@acme/transitive-runtime';",
      'utf8',
    );
    await fs.writeFile(
      path.join(dependencyRoot, 'package.json'),
      JSON.stringify({ name: '@acme/transitive-runtime', type: 'module', exports: './index.js' }),
      'utf8',
    );
    await fs.writeFile(
      path.join(dependencyRoot, 'index.js'),
      "export { marker } from '@acme/nested-runtime';",
      'utf8',
    );
    await fs.writeFile(
      path.join(nestedDependencyRoot, 'package.json'),
      JSON.stringify({ name: '@acme/nested-runtime', type: 'module', exports: './index.js' }),
      'utf8',
    );
    await fs.writeFile(path.join(nestedDependencyRoot, 'index.js'), "export const marker = 'v1';", 'utf8');
    await fs.symlink(
      dependencyRoot,
      path.join(packageRoot, 'node_modules', '@acme', 'transitive-runtime'),
    );
    await fs.symlink(
      nestedDependencyRoot,
      path.join(dependencyRoot, 'node_modules', '@acme', 'nested-runtime'),
    );

    const first = await prepareCodeGraphyPackageBuildSnapshot(packageRoot);
    const firstRuntime = await import(pathToFileURL(path.join(first.snapshotPackageRoot, 'plugin.js')).href);
    await fs.writeFile(path.join(nestedDependencyRoot, 'index.js'), "export const marker = 'v2';", 'utf8');
    const second = await prepareCodeGraphyPackageBuildSnapshot(packageRoot);
    const secondRuntime = await import(pathToFileURL(path.join(second.snapshotPackageRoot, 'plugin.js')).href);

    expect(second.buildIdentity).not.toBe(first.buildIdentity);
    expect(firstRuntime.default).toBe('v1');
    expect(secondRuntime.default).toBe('v2');
  });

  it('preserves vendored runtime packages nested inside a distributable build', async () => {
    const packageRoot = await createPackageFixtureRoot('codegraphy-vendored-runtime-');
    const runtimePath = path.join(packageRoot, 'dist', 'node_modules', 'runtime', 'index.js');
    await fs.mkdir(path.dirname(runtimePath), { recursive: true });
    await fs.writeFile(path.join(packageRoot, 'package.json'), JSON.stringify({ type: 'module' }), 'utf8');
    await fs.writeFile(
      path.join(packageRoot, 'dist', 'plugin.js'),
      "export { marker as default } from 'runtime';",
      'utf8',
    );
    await fs.writeFile(
      path.join(packageRoot, 'dist', 'node_modules', 'runtime', 'package.json'),
      JSON.stringify({ name: 'runtime', type: 'module', exports: './index.js' }),
      'utf8',
    );
    await fs.writeFile(runtimePath, "export const marker = 'v1';", 'utf8');

    const first = await prepareCodeGraphyPackageBuildSnapshot(packageRoot);
    const firstRuntime = await import(pathToFileURL(
      path.join(first.snapshotPackageRoot, 'dist', 'plugin.js'),
    ).href);
    await fs.writeFile(runtimePath, "export const marker = 'v2';", 'utf8');
    const second = await prepareCodeGraphyPackageBuildSnapshot(packageRoot);
    const secondRuntime = await import(pathToFileURL(
      path.join(second.snapshotPackageRoot, 'dist', 'plugin.js'),
    ).href);

    expect(second.buildIdentity).not.toBe(first.buildIdentity);
    expect(firstRuntime.default).toBe('v1');
    expect(secondRuntime.default).toBe('v2');
  });

  it('does not evict a snapshot held by another CodeGraphy process', async () => {
    const packageRoot = await createPackageFixtureRoot('codegraphy-process-snapshot-');
    await fs.writeFile(path.join(packageRoot, 'package.json'), '{}', 'utf8');
    await fs.writeFile(path.join(packageRoot, 'plugin.js'), "export default 'one';", 'utf8');
    const sourceUrl = new URL('../../src/plugins/packageBuildSnapshot.ts', import.meta.url).href;
    const child = spawn(process.execPath, [
      '--experimental-strip-types',
      '--input-type=module',
      '--eval',
      `
        import { prepareCodeGraphyPackageBuildSnapshot } from ${JSON.stringify(sourceUrl)};
        const snapshot = await prepareCodeGraphyPackageBuildSnapshot(${JSON.stringify(packageRoot)});
        console.log(snapshot.snapshotPackageRoot);
        process.stdin.resume();
        await new Promise(resolve => process.stdin.once('end', resolve));
      `,
    ], {
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    const childExit = once(child, 'exit');

    try {
      const [snapshotOutput] = await once(child.stdout, 'data');
      const activeSnapshotRoot = String(snapshotOutput).trim();

      for (const version of ['two', 'three', 'four']) {
        await fs.writeFile(path.join(packageRoot, 'plugin.js'), `export default '${version}';`, 'utf8');
        await prepareCodeGraphyPackageBuildSnapshot(packageRoot);
      }

      await expect(fs.access(activeSnapshotRoot)).resolves.toBeUndefined();
    } finally {
      child.stdin.end();
      await childExit;
    }
  });

  it('removes snapshots left by a process that is no longer running', async () => {
    const deadProcessRoot = path.join(
      os.tmpdir(),
      'codegraphy-plugin-modules',
      '2147483647',
    );
    const packageRoot = await createPackageFixtureRoot('codegraphy-dead-process-snapshot-');
    await fs.mkdir(deadProcessRoot, { recursive: true });
    await fs.writeFile(path.join(deadProcessRoot, 'stale.txt'), 'stale', 'utf8');
    await fs.writeFile(path.join(packageRoot, 'package.json'), '{}', 'utf8');

    await prepareCodeGraphyPackageBuildSnapshot(packageRoot);

    await expect(fs.access(deadProcessRoot)).rejects.toMatchObject({ code: 'ENOENT' });
  });
});
