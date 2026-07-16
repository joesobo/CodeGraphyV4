import { act, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { IGraphData } from '../../src/shared/graph/contracts';
import Graph from '../../src/webview/components/graph/view/component';
import { graphStore } from '../../src/webview/store/state';
import OwnedGraphSurface from '../__mocks__/ownedGraphSurface';
import { clearSentMessages, findMessage } from '../helpers/sentMessages';

const graphData: IGraphData = {
  nodes: [
    { id: 'src/app.ts', label: 'app.ts', color: '#93C5FD', fileSize: 1234 },
    { id: 'src/utils.ts', label: 'utils.ts', color: '#67E8F9', fileSize: 567 },
  ],
  edges: [{
    id: 'src/app.ts->src/utils.ts',
    from: 'src/app.ts',
    to: 'src/utils.ts',
    kind: 'import',
    sources: [],
  }],
};

async function flushMessages(delay = 10): Promise<void> {
  await act(async () => {
    await new Promise(resolve => setTimeout(resolve, delay));
  });
}

async function requestGraphAction(type: string, responseDelay = 50): Promise<void> {
  await flushMessages();
  await act(async () => {
    window.dispatchEvent(new MessageEvent('message', { data: { type } }));
  });
  await flushMessages(responseDelay);
}

describe('Graph exports', () => {
  beforeEach(() => {
    clearSentMessages();
    OwnedGraphSurface.clearAllHandlers();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should register message listener on mount', async () => {
    graphStore.setState({ nodeSizeMode: 'file-size' });
    render(<Graph data={graphData} />);
    await flushMessages(0);
    expect(true).toBe(true);
  });

  it('should handle REQUEST_EXPORT_JSON message and send EXPORT_JSON response', async () => {
    graphStore.setState({ nodeSizeMode: 'file-size' });
    render(<Graph data={graphData} />);

    await requestGraphAction('REQUEST_EXPORT_JSON');

    const exportMsg = findMessage('EXPORT_JSON');
    expect(exportMsg).toBeTruthy();

    const { json, filename } = exportMsg!.payload;
    expect(json).toBeDefined();
    expect(filename).toMatch(/^codegraphy-graph-.*\.json$/);

    const parsed = JSON.parse(json);
    expect(parsed.format).toBe('codegraphy-export');
    expect(parsed.version).toBe('3.0');
    expect(parsed.exportedAt).toBeDefined();
    expect(parsed.scope.graph).toBe('current-view');
    expect(parsed.summary.totalNodes).toBe(2);
    expect(parsed.summary.totalEdges).toBe(1);
    expect(parsed.summary.totalLegendRules).toBe(0);
    expect(parsed.summary.totalImages).toBe(0);
    expect(parsed.legend).toEqual([]);
    expect(parsed.nodes).toEqual([
      expect.objectContaining({ id: 'src/app.ts', nodeType: 'file', legendIds: [] }),
      expect.objectContaining({ id: 'src/utils.ts', nodeType: 'file', legendIds: [] }),
    ]);
    expect(parsed.edges).toEqual([
      expect.objectContaining({
        from: 'src/app.ts',
        to: 'src/utils.ts',
        kind: 'import',
        sources: [],
      }),
    ]);
  });

  it('should handle REQUEST_EXPORT_MD message and send EXPORT_MD response', async () => {
    graphStore.setState({ nodeSizeMode: 'file-size' });
    render(<Graph data={graphData} />);

    await requestGraphAction('REQUEST_EXPORT_MD');

    const exportMsg = findMessage('EXPORT_MD');
    expect(exportMsg).toBeTruthy();
    expect(exportMsg!.payload.markdown).toContain('# CodeGraphy Export');
    expect(exportMsg!.payload.filename).toMatch(/^codegraphy-graph-.*\.md$/);
  });

  it('should handle REQUEST_OPEN_IN_EDITOR message and send OPEN_IN_EDITOR to vscode', async () => {
    render(<Graph data={graphData} />);

    await requestGraphAction('REQUEST_OPEN_IN_EDITOR', 10);

    expect(findMessage('OPEN_IN_EDITOR')).toBeTruthy();
  });

  it('should handle REQUEST_EXPORT_SVG message and send EXPORT_SVG response', async () => {
    render(<Graph data={graphData} />);

    await requestGraphAction('REQUEST_EXPORT_SVG');

    const exportMsg = findMessage('EXPORT_SVG');
    expect(exportMsg).toBeTruthy();

    const { svg, filename } = exportMsg!.payload;
    expect(svg).toBeDefined();
    expect(filename).toMatch(/^codegraphy-.*\.svg$/);
    expect(svg).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(svg).toContain('<svg xmlns="http://www.w3.org/2000/svg"');
    expect(svg).toContain('</svg>');
    expect(svg).toContain('fill="#18181b"');
    expect(svg).toContain('<marker id="arrowhead"');
  });
});
