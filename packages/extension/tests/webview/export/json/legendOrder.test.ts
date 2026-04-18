import { describe, expect, it } from 'vitest';
import { buildExportData } from '../../../../src/webview/export/json/export';
import type { IGraphData } from '../../../../src/shared/graph/contracts';

describe('webview/export/json legend order', () => {
  it('preserves legend rule order instead of resorting it', () => {
    const graphData: IGraphData = {
      nodes: [],
      edges: [],
    };

    const exportData = buildExportData(graphData, [
      { id: 'later', pattern: 'zzz/**', color: '#ff00ff' },
      { id: 'earlier', pattern: 'aaa/**', color: '#00ff00' },
    ]);

    expect(exportData.legend.map((legend) => legend.id)).toEqual([
      'later',
      'earlier',
    ]);
  });
});
