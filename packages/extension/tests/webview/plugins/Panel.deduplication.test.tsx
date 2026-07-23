import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../src/webview/vscodeApi', () => ({
  postMessage: vi.fn(),
  vscode: { getState: () => undefined, setState: vi.fn() },
}));

import { renderPanel, resetPanelState } from './panelFixture';

describe('PluginsPanel', () => {
  beforeEach(resetPanelState);

  it('keeps independent plugin IDs from one package as separate rows', () => {
    renderPanel([
      {
        id: 'acme.old-tools',
        name: 'Old Tools',
        version: '0.1.0',
        packageName: '@acme/plugin-tools',
        supportedExtensions: [],
        status: 'installed',
        enabled: true,
        connectionCount: 0,
      },
      {
        id: 'acme.tools',
        name: 'Tools',
        version: '0.1.0',
        packageName: '@acme/plugin-tools',
        supportedExtensions: [],
        status: 'installed',
        enabled: true,
        connectionCount: 0,
      },
    ]);

    expect(screen.getByText('Tools')).toBeInTheDocument();
    expect(screen.getByText('Old Tools')).toBeInTheDocument();
    expect(screen.queryAllByRole('switch')).toHaveLength(2);
  });

  it('keeps an active plugin row when a later duplicate ID is only installed', () => {
    renderPanel([
      {
        id: 'acme.tools',
        name: 'Tools',
        version: '0.1.0',
        packageName: '@acme/plugin-tools',
        supportedExtensions: [],
        status: 'active',
        enabled: true,
        connectionCount: 0,
      },
      {
        id: 'acme.tools',
        name: '@acme/plugin-tools',
        version: '0.1.0',
        packageName: '@acme/plugin-tools',
        supportedExtensions: [],
        status: 'installed',
        enabled: true,
        connectionCount: 0,
      },
    ]);

    expect(screen.getByText('Tools')).toBeInTheDocument();
    expect(screen.queryByText('@acme/plugin-tools')).not.toBeInTheDocument();
    expect(screen.queryAllByRole('switch')).toHaveLength(1);
  });
});
