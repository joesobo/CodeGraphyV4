import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { describe, expect, it } from 'vitest';
import { prepareCodeGraphyPackageBuildSnapshot } from '../../src/plugins/packageBuildSnapshot';
import {
  createPackageFixtureRoot,
  fs,
  path,
} from './packageRuntimeFixture';

describe('CodeGraphy package build snapshots', () => {
  it('keeps the current build and bounds retained snapshots', async () => {
    const packageRoot = await createPackageFixtureRoot('codegraphy-build-snapshot-');
    await fs.writeFile(path.join(packageRoot, 'package.json'), '{}', 'utf8');
    let currentSnapshotRoot = '';

    for (const version of ['one', 'two', 'three']) {
      await fs.writeFile(path.join(packageRoot, 'plugin.js'), `export default '${version}';`, 'utf8');
      const snapshot = await prepareCodeGraphyPackageBuildSnapshot(packageRoot);
      currentSnapshotRoot = snapshot.snapshotPackageRoot;
    }

    await expect(fs.access(currentSnapshotRoot)).resolves.toBeUndefined();
    const retainedBuilds = (await fs.readdir(
      path.dirname(path.dirname(currentSnapshotRoot)),
      { withFileTypes: true },
    )).filter(entry => entry.isDirectory() && !entry.name.startsWith('.'));
    expect(retainedBuilds).toHaveLength(2);
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
});
