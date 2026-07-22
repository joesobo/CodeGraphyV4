import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildWorkspaceGraphDataFromAnalysis } from '../../../src/graph/data';
import { analyzeFileWithTreeSitter } from '../../../src/treeSitter/runtime/analyze';
import { deriveVisibleGraph } from '../../../src/visibleGraph/derive';
import type { IFileAnalysisResult } from '@codegraphy-dev/plugin-api';

async function collectDartFiles(directory: string): Promise<string[]> {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const files = await Promise.all(entries.map(async (entry) => {
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      return collectDartFiles(absolutePath);
    }

    return entry.name.endsWith('.dart') ? [absolutePath] : [];
  }));

  return files.flat().sort();
}

describe('pipeline/plugins/treesitter/runtime/analyzeDart example graph', () => {
  it.each([false, true])(
    'projects supported Dart references to the file graph when only File nodes are visible with includeSymbols=%s',
    async (includeSymbols) => {
      const workspaceRoot = path.resolve(__dirname, '../../../../../examples/example-dart');
      const fileAnalysis = new Map<string, IFileAnalysisResult>();

      for (const filePath of await collectDartFiles(workspaceRoot)) {
        const source = await fs.readFile(filePath, 'utf8');
        const analysis = await analyzeFileWithTreeSitter(filePath, source, workspaceRoot, { includeSymbols });
        if (analysis) {
          fileAnalysis.set(filePath, analysis);
        }
      }

      const graphData = buildWorkspaceGraphDataFromAnalysis({
        workspaceRoot,
        fileAnalysis,
        cacheFiles: {},
        disabledPlugins: new Set(),
        getPluginForFile: () => undefined,
        showOrphans: true,
        nodeVisibility: {
          file: true,
          folder: false,
          package: false,
          symbol: false,
          variable: false,
        },
      });

      const visibleGraph = deriveVisibleGraph(graphData, {
        scope: {
          nodes: [
            { type: 'file', enabled: true },
            { type: 'folder', enabled: false },
            { type: 'package', enabled: false },
            { type: 'symbol', enabled: false },
            { type: 'variable', enabled: false },
          ],
          edges: [
            { type: 'import', enabled: false },
            { type: 'inherit', enabled: false },
            { type: 'call', enabled: false },
            { type: 'reference', enabled: true },
            { type: 'contains', enabled: false },
          ],
        },
      });

      const referencePairs = (visibleGraph.graphData?.edges ?? [])
        .filter(edge => edge.kind === 'reference')
        .map(edge => `${edge.from}->${edge.to}`)
        .sort();

      expect(referencePairs).toEqual([
        'bin/sample_app.dart->lib/model/profile.dart',
        'bin/sample_app.dart->lib/model/run_status.dart',
        'lib/app/format_run.dart->lib/model/profile.dart',
        'lib/app/format_run.dart->lib/model/run_status.dart',
        'lib/app/runnable.dart->lib/model/run_status.dart',
        'lib/app/runnable.dart->lib/model/user.dart',
        'lib/app/runner.dart->lib/app/format_run.dart',
        'lib/app/runner.dart->lib/model/profile.dart',
        'lib/app/runner.dart->lib/model/user.dart',
      ]);
    },
  );
});
