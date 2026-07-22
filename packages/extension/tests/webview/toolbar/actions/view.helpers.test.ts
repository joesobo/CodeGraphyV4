import { mdiLinkVariant } from '@mdi/js';
import { describe, expect, it } from 'vitest';
import {
  getToolbarActionIconPath,
  getToolbarActionItemKey,
  getToolbarActionKey,
} from '../../../../src/webview/components/toolbar/actions/view';
import {
  buildPluginExporterGroups,
  getPluginExporterKey,
} from '../../../../src/webview/components/export/model';

describe('ToolbarActions helpers', () => {
  it('builds stable keys for toolbar actions and exporter items', () => {
    expect(
      getToolbarActionKey({
        id: 'docs',
        label: 'Docs',
        pluginId: 'plugin.docs',
        pluginName: 'Docs Plugin',
        index: 0,
        items: [],
      }),
    ).toBe('plugin.docs:docs:0');

    expect(
      getToolbarActionItemKey(
        {
          id: 'docs',
          label: 'Docs',
          pluginId: 'plugin.docs',
          pluginName: 'Docs Plugin',
          index: 0,
          items: [],
        },
        {
          id: 'docs-summary',
          label: 'Docs Summary',
          index: 1,
        },
      ),
    ).toBe('plugin.docs:docs:1');

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

  it('uses the link icon fallback when a toolbar action has no icon', () => {
    expect(getToolbarActionIconPath({ icon: undefined })).toBe(mdiLinkVariant);
  });
});
