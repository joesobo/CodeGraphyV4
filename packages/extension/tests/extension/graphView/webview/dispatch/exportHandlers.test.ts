import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { WorkspaceAnalysisDatabaseSnapshot } from '../../../../../src/extension/pipeline/database/cache';

const exportHandlerMocks = vi.hoisted(() => ({
  buildSymbolsExportData: vi.fn(() => ({ kind: 'analysis-export' })),
  buildSymbolsExportDataFromSnapshot: vi.fn(() => ({ kind: 'snapshot-export' })),
  saveExportedSymbolsJson: vi.fn(() => Promise.resolve()),
}));

vi.mock('../../../../../src/extension/export/symbols/build', () => ({
  buildSymbolsExportData: exportHandlerMocks.buildSymbolsExportData,
  buildSymbolsExportDataFromSnapshot: exportHandlerMocks.buildSymbolsExportDataFromSnapshot,
}));

vi.mock('../../../../../src/extension/export/symbols/save', () => ({
  saveExportedSymbolsJson: exportHandlerMocks.saveExportedSymbolsJson,
}));

import { createGraphViewPrimaryExportHandlers } from '../../../../../src/extension/graphView/webview/dispatch/exportHandlers';

describe('createGraphViewPrimaryExportHandlers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-14T17:30:45.000Z'));
  });

  it('exports snapshot-backed symbol data when structured snapshot files exist', async () => {
    const snapshot: WorkspaceAnalysisDatabaseSnapshot = {
      files: [{
        filePath: 'src/app.ts',
        mtime: 1,
        analysis: { filePath: 'src/app.ts' },
      }],
      symbols: [],
      relations: [],
    };
    const handlers = createGraphViewPrimaryExportHandlers({
      getAnalyzer: () => ({
        readStructuredAnalysisSnapshot: () => snapshot,
        lastFileAnalysis: new Map([['src/app.ts', { filePath: 'src/app.ts' }]]),
      }),
    });

    await handlers.exportSymbolsJson();

    expect(exportHandlerMocks.buildSymbolsExportDataFromSnapshot).toHaveBeenCalledWith(snapshot);
    expect(exportHandlerMocks.buildSymbolsExportData).not.toHaveBeenCalled();
    expect(exportHandlerMocks.saveExportedSymbolsJson).toHaveBeenCalledWith(
      JSON.stringify({ kind: 'snapshot-export' }, null, 2),
      'codegraphy-symbols-2026-04-14T17-30-45.000Z.json',
    );
  });

  it('falls back to live file analysis when the snapshot is empty or missing', async () => {
    const lastFileAnalysis = new Map([['src/app.ts', { filePath: 'src/app.ts' }]]);
    const handlers = createGraphViewPrimaryExportHandlers({
      getAnalyzer: () => ({
        readStructuredAnalysisSnapshot: () => ({ files: [], symbols: [], relations: [] } satisfies WorkspaceAnalysisDatabaseSnapshot),
        lastFileAnalysis,
      }),
    });

    await handlers.exportSymbolsJson();

    expect(exportHandlerMocks.buildSymbolsExportData).toHaveBeenCalledWith(lastFileAnalysis);
    expect(exportHandlerMocks.buildSymbolsExportDataFromSnapshot).not.toHaveBeenCalled();
  });

  it('uses an empty analysis map when no analyzer is available', async () => {
    const handlers = createGraphViewPrimaryExportHandlers({
      getAnalyzer: () => undefined,
    });

    await handlers.exportSymbolsJson();

    expect(exportHandlerMocks.buildSymbolsExportData).toHaveBeenCalledWith(new Map());
  });
});
