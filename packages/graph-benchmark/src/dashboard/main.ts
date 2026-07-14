import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  buildDashboardModel,
  type DashboardManifest,
} from './model';
import { renderDashboard } from './render';
import type { AggregateGraphBenchmarkReport } from '../report/model';

const defaultPackageRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../..',
);

export interface GenerateDashboardOptions {
  manifestPath: string;
  outputDir: string;
  packageRoot: string;
}

export async function generateDashboard({
  manifestPath,
  outputDir,
  packageRoot,
}: GenerateDashboardOptions): Promise<void> {
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8')) as DashboardManifest;
  if (manifest.schemaVersion !== 1) {
    throw new Error('Unsupported dashboard manifest schema');
  }
  const reports = new Map<string, AggregateGraphBenchmarkReport>();
  for (const entry of manifest.reports) {
    const reportPath = path.resolve(packageRoot, entry.path);
    reports.set(
      entry.path,
      JSON.parse(await readFile(reportPath, 'utf8')) as AggregateGraphBenchmarkReport,
    );
  }

  await mkdir(outputDir, { recursive: true });
  const imagesDir = path.join(outputDir, 'images');
  const visuals = [];
  if (manifest.visuals.length > 0) await mkdir(imagesDir, { recursive: true });
  for (const [index, visual] of manifest.visuals.entries()) {
    const destinationName = `${String(index).padStart(2, '0')}-${path.basename(visual.path)}`;
    await copyFile(path.resolve(packageRoot, visual.path), path.join(imagesDir, destinationName));
    visuals.push({ ...visual, path: `images/${destinationName}` });
  }

  const model = buildDashboardModel({ ...manifest, visuals }, reports);
  await Promise.all([
    writeFile(path.join(outputDir, 'data.json'), `${JSON.stringify(model, null, 2)}\n`),
    writeFile(path.join(outputDir, 'index.html'), renderDashboard(model)),
  ]);
}

async function main(): Promise<void> {
  const outputDir = process.env.CODEGRAPHY_DASHBOARD_DIR
    ?? path.join(homedir(), 'pi-status', 'codegraphy-pr308-perf');
  const manifestPath = process.env.CODEGRAPHY_DASHBOARD_MANIFEST
    ?? path.join(
      defaultPackageRoot,
      'references',
      'interaction-performance',
      'dashboard-manifest.json',
    );
  await generateDashboard({
    manifestPath,
    outputDir,
    packageRoot: defaultPackageRoot,
  });
  process.stdout.write(`${outputDir}\n`);
}

const executedPath = process.argv[1] ? path.resolve(process.argv[1]) : '';
if (executedPath === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
