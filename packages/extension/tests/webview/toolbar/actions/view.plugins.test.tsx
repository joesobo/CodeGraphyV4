import { mdiLinkVariant } from '@mdi/js';
import { fireEvent, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { graphStore } from '../../../../src/webview/store/state';
import { renderToolbar, resetToolbarState } from './viewFixture';

describe('ToolbarActions plugin actions', () => {
  beforeEach(resetToolbarState);
  afterEach(() => vi.useRealTimers());
  it('renders a toolbar action popup when plugin toolbar actions are available', () => {
    graphStore.setState({
      pluginToolbarActions: [
        {
          id: 'wikilinks',
          label: 'Docs',
          pluginId: 'plugin.docs',
          pluginName: 'Docs Plugin',
          index: 0,
          items: [
            {
              id: 'docs-summary',
              label: 'Docs Summary',
              index: 0,
            },
          ],
        },
      ],
    });

    renderToolbar();

    expect(screen.getByTitle('Docs')).toBeInTheDocument();
    expect(screen.getByText('Docs Summary')).toBeInTheDocument();
  });

  it('posts RUN_PLUGIN_TOOLBAR_ACTION through the host api when a toolbar action item is clicked', () => {
    graphStore.setState({
      pluginToolbarActions: [
        {
          id: 'wikilinks',
          label: 'Docs',
          pluginId: 'plugin.docs',
          pluginName: 'Docs Plugin',
          index: 0,
          items: [
            {
              id: 'docs-summary',
              label: 'Docs Summary',
              index: 0,
            },
          ],
        },
      ],
    });

    const postMessageSpy = vi.spyOn(window, 'postMessage');

    renderToolbar();
    fireEvent.click(screen.getByText('Docs Summary'));

    expect(postMessageSpy).toHaveBeenCalledWith({
      type: 'RUN_PLUGIN_TOOLBAR_ACTION',
      payload: {
        pluginId: 'plugin.docs',
        index: 0,
        itemIndex: 0,
      },
    }, '*');
    postMessageSpy.mockRestore();
  });

  it('renders the default link icon when a toolbar action has no custom icon', () => {
    graphStore.setState({
      pluginToolbarActions: [
        {
          id: 'wikilinks',
          label: 'Docs',
          pluginId: 'plugin.docs',
          pluginName: 'Docs Plugin',
          index: 0,
          items: [
            {
              id: 'docs-summary',
              label: 'Docs Summary',
              index: 0,
            },
          ],
        },
      ],
    });

    renderToolbar();

    expect(screen.getByTitle('Docs').querySelector('path')).toHaveAttribute(
      'd',
      mdiLinkVariant,
    );
  });
});
