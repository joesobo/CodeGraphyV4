import { describe, expect, it } from 'vitest';
import { mdiLinkVariant } from '@mdi/js';
import {
  getToolbarActionIconPath,
  getToolbarActionItemKey,
  getToolbarActionKey,
  TOOLBAR_PANEL_BUTTONS,
} from '../../../../src/webview/components/toolbar/actions/model';

describe('webview/toolbar/model', () => {
  it('builds stable keys for toolbar actions and items', () => {
    expect(getToolbarActionKey({
      id: 'docs',
      label: 'Docs',
      pluginId: 'plugin.docs',
      pluginName: 'Docs Plugin',
      index: 0,
      items: [],
    })).toBe('plugin.docs:docs:0');

    expect(getToolbarActionItemKey(
      {
        id: 'docs',
        label: 'Docs',
        pluginId: 'plugin.docs',
        pluginName: 'Docs Plugin',
        index: 0,
        items: [],
      },
      {
        id: 'summary',
        label: 'Summary',
        index: 1,
      },
    )).toBe('plugin.docs:docs:1');
  });

  it('falls back to the link icon and exposes the core panel buttons', () => {
    expect(getToolbarActionIconPath({ icon: undefined })).toBe(mdiLinkVariant);
    expect(TOOLBAR_PANEL_BUTTONS.map((button) => button.title)).toEqual([
      'Export',
      'Nodes',
      'Edges',
      'Legends',
      'Plugins',
      'Settings',
    ]);
  });
});
