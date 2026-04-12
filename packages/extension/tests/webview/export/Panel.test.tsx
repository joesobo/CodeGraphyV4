import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import ExportPanel from '../../../src/webview/components/export/Panel';
import {
  buildPluginExporterGroups,
  getPluginExporterKey,
} from '../../../src/webview/components/export/model';
import { graphStore } from '../../../src/webview/store/state';
import { postMessage } from '../../../src/webview/vscodeApi';

vi.mock('../../../src/webview/vscodeApi', () => ({
  postMessage: vi.fn(),
  vscode: { getState: () => undefined, setState: vi.fn() },
}));

describe('ExportPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(window, 'postMessage').mockImplementation(() => undefined);
    graphStore.setState({ pluginExporters: [] });
  });

  it('returns null when the panel is closed', () => {
    const { container } = render(<ExportPanel isOpen={false} onClose={vi.fn()} />);

    expect(container).toBeEmptyDOMElement();
  });

  it('renders export sections in the shared popup layout', () => {
    render(<ExportPanel isOpen={true} onClose={vi.fn()} />);

    expect(screen.getByText('Export')).toBeInTheDocument();
    expect(screen.getByText('Images')).toBeInTheDocument();
    expect(screen.getByText('Graph')).toBeInTheDocument();
    expect(screen.queryByText('Plugins')).not.toBeInTheDocument();
  });

  it('posts image and graph export messages from the shared list rows', () => {
    render(<ExportPanel isOpen={true} onClose={vi.fn()} />);

    fireEvent.click(screen.getByText('Export as PNG'));
    fireEvent.click(screen.getByText('Export as JSON'));
    fireEvent.click(screen.getByText('Export Symbols as JSON'));

    expect(window.postMessage).toHaveBeenCalledWith({ type: 'REQUEST_EXPORT_PNG' }, '*');
    expect(window.postMessage).toHaveBeenCalledWith({ type: 'REQUEST_EXPORT_JSON' }, '*');
    expect(postMessage).toHaveBeenCalledWith({ type: 'EXPORT_SYMBOLS_JSON' });
  });

  it('renders plugin exporter groups and posts plugin export messages', () => {
    graphStore.setState({
      pluginExporters: [
        {
          id: 'summary',
          label: 'Summary Export',
          pluginId: 'plugin.docs',
          pluginName: 'Docs Plugin',
          index: 0,
          group: 'Reports',
        },
      ],
    });

    render(<ExportPanel isOpen={true} onClose={vi.fn()} />);
    fireEvent.click(screen.getByText('Summary Export'));

    expect(screen.getByText('Plugins')).toBeInTheDocument();
    expect(screen.getByText('Docs Plugin / Reports')).toBeInTheDocument();
    expect(postMessage).toHaveBeenCalledWith({
      type: 'RUN_PLUGIN_EXPORT',
      payload: {
        pluginId: 'plugin.docs',
        index: 0,
      },
    });
  });

  it('calls onClose from the popup close button', () => {
    const onClose = vi.fn();

    render(<ExportPanel isOpen={true} onClose={onClose} />);
    fireEvent.click(screen.getByTitle('Close'));

    expect(onClose).toHaveBeenCalledOnce();
  });

  it('groups plugin exporters by plugin label and group label', () => {
    expect(
      buildPluginExporterGroups([
        {
          id: 'summary',
          label: 'Summary Export',
          pluginId: 'plugin.docs',
          pluginName: 'Docs Plugin',
          index: 0,
          group: 'Reports',
        },
        {
          id: 'details',
          label: 'Details Export',
          pluginId: 'plugin.docs',
          pluginName: 'Docs Plugin',
          index: 1,
          group: 'Reports',
        },
        {
          id: 'archive',
          label: 'Archive Export',
          pluginId: 'plugin.docs',
          pluginName: 'Docs Plugin',
          index: 2,
        },
      ]),
    ).toEqual([
      {
        key: 'Docs Plugin / Reports',
        label: 'Docs Plugin / Reports',
        items: [
          {
            id: 'summary',
            label: 'Summary Export',
            pluginId: 'plugin.docs',
            pluginName: 'Docs Plugin',
            index: 0,
            group: 'Reports',
          },
          {
            id: 'details',
            label: 'Details Export',
            pluginId: 'plugin.docs',
            pluginName: 'Docs Plugin',
            index: 1,
            group: 'Reports',
          },
        ],
      },
      {
        key: 'Docs Plugin',
        label: 'Docs Plugin',
        items: [
          {
            id: 'archive',
            label: 'Archive Export',
            pluginId: 'plugin.docs',
            pluginName: 'Docs Plugin',
            index: 2,
          },
        ],
      },
    ]);
  });

  it('builds stable keys for exporter items', () => {
    expect(
      getPluginExporterKey({
        id: 'summary',
        label: 'Summary Export',
        pluginId: 'plugin.docs',
        pluginName: 'Docs Plugin',
        index: 0,
      }),
    ).toBe('plugin.docs:summary:0');
  });
});
