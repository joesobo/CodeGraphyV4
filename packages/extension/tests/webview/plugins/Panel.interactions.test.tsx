import { fireEvent, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const sentMessages = vi.hoisted((): unknown[] => []);

vi.mock('../../../src/webview/vscodeApi', () => ({
  postMessage: (message: unknown) => sentMessages.push(message),
  vscode: { getState: () => undefined, setState: vi.fn() },
}));

import {
  graphStore,
  renderPanel,
  resetPanelState,
} from './panelFixture';

describe('PluginsPanel', () => {
  beforeEach(() => {
    sentMessages.length = 0;
    resetPanelState();
  });

  it('posts a plugin toggle message when the plugin switch changes', () => {
    renderPanel([
      {
        id: 'codegraphy.typescript',
        name: 'TypeScript',
        version: '1.0.0',
        packageName: '@codegraphy-dev/plugin-typescript',
        supportedExtensions: ['.ts'],
        status: 'active',
        enabled: true,
        connectionCount: 12,
      },
    ]);

    fireEvent.click(screen.getByRole('switch'));

    expect(sentMessages).toContainEqual({
      type: 'TOGGLE_PLUGIN',
      payload: {
        pluginId: 'codegraphy.typescript',
        enabled: false,
      },
    });
    expect(graphStore.getState().pluginStatuses).toEqual([
      expect.objectContaining({
        id: 'codegraphy.typescript',
        enabled: true,
      }),
    ]);
  });

  it('does not expose plugin rows as draggable reorder targets', () => {
    const { container } = renderPanel([
      {
        id: 'codegraphy.typescript',
        name: 'TypeScript',
        version: '1.0.0',
        packageName: '@codegraphy-dev/plugin-typescript',
        supportedExtensions: ['.ts'],
        status: 'active',
        enabled: true,
        connectionCount: 12,
      },
      {
        id: 'codegraphy.markdown',
        name: 'Markdown',
        version: '1.0.0',
        packageName: '@codegraphy-dev/plugin-markdown',
        supportedExtensions: ['.md'],
        status: 'active',
        enabled: true,
        connectionCount: 1,
      },
    ]);

    const pluginRows = container.querySelectorAll('[data-testid="plugin-row"]');
    expect(pluginRows).toHaveLength(2);
    expect(container.querySelectorAll('[draggable="true"]')).toHaveLength(0);

    fireEvent.dragStart(pluginRows[1]);
    fireEvent.dragOver(pluginRows[0]);
    fireEvent.drop(pluginRows[0]);

    expect(sentMessages).toEqual([]);
  });
});
