import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { generateDashboard } from '../../src/dashboard/main';

describe('dashboard generator', () => {
  it('writes static HTML and JSON to the selected output directory', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'codegraphy-dashboard-'));
    const manifestPath = path.join(root, 'manifest.json');
    const outputDir = path.join(root, 'output');
    await writeFile(manifestPath, JSON.stringify({
      schemaVersion: 1,
      title: 'M1 status',
      updates: [],
      reports: [],
      attribution: [],
      visuals: [],
    }));

    await generateDashboard({ manifestPath, outputDir, packageRoot: root });

    expect(await readFile(path.join(outputDir, 'index.html'), 'utf8')).toContain('M1 status');
    expect(JSON.parse(await readFile(path.join(outputDir, 'data.json'), 'utf8')))
      .toMatchObject({ title: 'M1 status', fixtures: [] });
  });
});
