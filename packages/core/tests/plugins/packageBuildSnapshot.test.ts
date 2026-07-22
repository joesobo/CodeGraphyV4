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
});
