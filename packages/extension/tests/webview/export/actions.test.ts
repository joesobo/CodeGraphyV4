import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  buildGraphItems,
  buildImageItems,
  runPluginExport,
} from '../../../src/webview/components/export/actions';

vi.mock('../../../src/webview/vscodeApi', () => ({
  postMessage: vi.fn(),
}));

import { postMessage } from '../../../src/webview/vscodeApi';

describe('webview/export/actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.postMessage = vi.fn();
  });

  it('builds image export items that post the correct window messages', () => {
    const items = buildImageItems();

    expect(items.map((item) => item.id)).toEqual(['image:png', 'image:svg', 'image:jpeg']);
    expect(items.map((item) => item.label)).toEqual([
      'Export as PNG',
      'Export as SVG',
      'Export as JPEG',
    ]);

    items[0]?.onSelect();
    items[1]?.onSelect();
    items[2]?.onSelect();

    expect(window.postMessage).toHaveBeenNthCalledWith(1, { type: 'REQUEST_EXPORT_PNG' }, '*');
    expect(window.postMessage).toHaveBeenNthCalledWith(2, { type: 'REQUEST_EXPORT_SVG' }, '*');
    expect(window.postMessage).toHaveBeenNthCalledWith(3, { type: 'REQUEST_EXPORT_JPEG' }, '*');
  });

  it('builds graph export items that post window and host messages from the matching entries', () => {
    const items = buildGraphItems();

    expect(items.map((item) => item.id)).toEqual([
      'graph:json',
      'graph:markdown',
      'graph:symbols',
    ]);

    items[0]?.onSelect();
    items[1]?.onSelect();
    items[2]?.onSelect();

    expect(window.postMessage).toHaveBeenNthCalledWith(1, { type: 'REQUEST_EXPORT_JSON' }, '*');
    expect(window.postMessage).toHaveBeenNthCalledWith(2, { type: 'REQUEST_EXPORT_MD' }, '*');
    expect(postMessage).toHaveBeenCalledWith({ type: 'EXPORT_SYMBOLS_JSON' });
  });

  it('posts plugin exports through the host API with plugin id and index', () => {
    runPluginExport('plugin.test', 2);

    expect(postMessage).toHaveBeenCalledWith({
      type: 'RUN_PLUGIN_EXPORT',
      payload: {
        pluginId: 'plugin.test',
        index: 2,
      },
    });
  });
});
