import { describe, expect, it, vi } from 'vitest';
import type { CodeGraphyAPI, IGraphData } from '@codegraphy-vscode/plugin-api';
import { createWikilinkToolbarAction, registerWikilinkToolbarAction } from '../../src/toolbar/action';

describe('toolbar/action', () => {
  it('creates the wikilink toolbar action shape', () => {
    const api = {
      filterEdgesByKind: vi.fn(() => []),
      getGraph: vi.fn(() => ({ nodes: [], edges: [] })),
      saveExport: vi.fn(async () => undefined),
    } as unknown as CodeGraphyAPI;

    const action = createWikilinkToolbarAction(api);

    expect(action.id).toBe('wikilinks');
    expect(action.label).toBe('Wikilinks');
    expect(action.items).toHaveLength(1);
    expect(action.items[0]?.id).toBe('wikilink-summary');
  });

  it('exports a markdown summary from markdown reference edges only', async () => {
    const graph: IGraphData = {
      nodes: [
        { id: 'Home.md', label: 'Home.md', color: '#fff' },
        { id: 'Guide.md', label: 'Guide.md', color: '#fff' },
      ],
      edges: [],
    };
    const filterEdgesByKind = vi.fn(() => [
      {
        id: 'Home.md->Guide.md#reference',
        from: 'Home.md',
        to: 'Guide.md',
        kind: 'reference',
        sources: [
          { id: 'codegraphy.markdown:wikilink', pluginId: 'codegraphy.markdown', sourceId: 'wikilink', label: 'Wikilink' },
        ],
      },
      {
        id: 'Home.md->Guide.md#reference:other',
        from: 'Home.md',
        to: 'Guide.md',
        kind: 'reference',
        sources: [
          { id: 'other.plugin:reference', pluginId: 'other.plugin', sourceId: 'reference', label: 'Reference' },
        ],
      },
    ]);
    const saveExport = vi.fn(async () => undefined);
    const api = {
      filterEdgesByKind,
      getGraph: vi.fn(() => graph),
      saveExport,
    } as unknown as CodeGraphyAPI;

    const action = createWikilinkToolbarAction(api);
    await action.items[0]?.run();

    expect(filterEdgesByKind).toHaveBeenCalledWith('reference');
    expect(saveExport).toHaveBeenCalledWith(expect.objectContaining({
      filename: 'markdown-wikilink-summary.md',
      title: 'Export Markdown Wikilink Summary',
      successMessage: 'Markdown wikilink summary exported',
    }));
    expect(String(saveExport.mock.calls[0]?.[0]?.content ?? '')).toContain('Wikilinks: 1');
  });

  it('registers the toolbar action through the host api', () => {
    const disposable = { dispose: vi.fn() };
    const registerToolbarAction = vi.fn(() => disposable);
    const api = {
      registerToolbarAction,
    } as unknown as CodeGraphyAPI;

    const result = registerWikilinkToolbarAction(api);

    expect(registerToolbarAction).toHaveBeenCalledOnce();
    expect(result).toBe(disposable);
  });
});
