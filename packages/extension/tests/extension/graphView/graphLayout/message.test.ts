import * as vscode from 'vscode';
import { describe, expect, it, vi } from 'vitest';
import { createGraphLayoutUpdatedMessage } from '../../../../src/extension/graphView/graphLayout/message';
import { getCodeGraphyConfiguration } from '../../../../src/extension/repoSettings/current';

vi.mock('../../../../src/extension/repoSettings/current', () => ({
  getCodeGraphyConfiguration: vi.fn(),
}));

describe('createGraphLayoutUpdatedMessage', () => {
  it('reads the current CodeGraphy graph layout and normalizes it for the webview', () => {
    const graphLayout = {
      collapsedNodes: {},
      pinnedNodes: {
        'src/app.ts': {
          nodeId: 'src/app.ts',
          '2D': { x: 10, y: 20 },
        },
      },
      sections: {
        'section-1': {
          id: 'section-1',
          label: 'Section 1',
          color: '#60a5fa',
          x: 1,
          y: 2,
          width: 300,
          height: 200,
          collapsed: false,
          updatedAt: '2026-05-07T23:01:00.000Z',
        },
      },
      ownership: {
        'src/app.ts': {
          itemId: 'src/app.ts',
          itemKind: 'node',
          ownerSectionId: 'section-1',
          updatedAt: '2026-05-07T23:02:00.000Z',
        },
      },
    };
    const configuration = {
      get: vi.fn((_key: string, _fallback: unknown) => graphLayout),
    };
    vi.mocked(getCodeGraphyConfiguration).mockReturnValue(configuration as never);

    expect(createGraphLayoutUpdatedMessage()).toEqual({
      type: 'GRAPH_LAYOUT_UPDATED',
      payload: graphLayout,
    });
    expect(configuration.get).toHaveBeenCalledWith('graphLayout', {
      collapsedNodes: {},
      pinnedNodes: {},
      sections: {},
      ownership: {},
    });
  });

  it('adds a webview-safe icon URL for workspace Graph Section icons without changing the saved path', () => {
    const graphLayout = {
      collapsedNodes: {},
      pinnedNodes: {},
      sections: {
        'section-1': {
          id: 'section-1',
          label: 'Section 1',
          icon: '.codegraphy/icons/section-1.svg',
          color: '#60a5fa',
          x: 1,
          y: 2,
          width: 300,
          height: 200,
          collapsed: false,
          updatedAt: '2026-05-07T23:01:00.000Z',
        },
      },
      ownership: {},
    };
    vi.mocked(getCodeGraphyConfiguration).mockReturnValue({
      get: vi.fn((_key: string, _fallback: unknown) => graphLayout),
    } as never);

    const message = createGraphLayoutUpdatedMessage({
      workspaceFolder: { uri: vscode.Uri.file('/workspace') },
      asWebviewUri: uri => ({ toString: () => `webview:${uri.path}` }),
    });

    expect(message.payload.sections['section-1']).toMatchObject({
      icon: '.codegraphy/icons/section-1.svg',
      iconUrl: 'webview:/workspace/.codegraphy/icons/section-1.svg',
    });
  });
});
