import { beforeEach, describe, expect, it } from 'vitest';
import { cssColorRevision } from '../../../src/webview/cssColors/resolver';
import { injectPluginStyle, resetPluginStyles } from '../../../src/webview/pluginRuntime/styles';

function createRefs() {
  return {
    loadedStyles: { current: new Map() },
    pluginStyles: { current: new Map() },
  };
}

describe('webview/pluginRuntime/styles', () => {
  beforeEach(() => {
    document.head.innerHTML = '';
  });

  it('invalidates computed graph colors when a plugin stylesheet is added, loaded, and removed', () => {
    const refs = createRefs();
    const initialRevision = cssColorRevision();

    injectPluginStyle(refs, 'plugin.theme', 'webview://theme.css');
    const link = refs.loadedStyles.current.get('webview://theme.css')?.link;

    expect(cssColorRevision()).toBeGreaterThan(initialRevision);
    const injectedRevision = cssColorRevision();
    link?.dispatchEvent(new Event('load'));
    expect(cssColorRevision()).toBeGreaterThan(injectedRevision);

    const loadedRevision = cssColorRevision();
    resetPluginStyles(refs, 'plugin.theme');
    expect(cssColorRevision()).toBeGreaterThan(loadedRevision);
  });

  it('keeps a shared stylesheet active until its final plugin owner is disabled', () => {
    const refs = createRefs();
    injectPluginStyle(refs, 'plugin.first', 'webview://shared.css');
    injectPluginStyle(refs, 'plugin.second', 'webview://shared.css');
    const sharedLink = refs.loadedStyles.current.get('webview://shared.css')?.link;

    resetPluginStyles(refs, 'plugin.first');
    expect(sharedLink?.isConnected).toBe(true);

    resetPluginStyles(refs, 'plugin.second');
    expect(sharedLink?.isConnected).toBe(false);
  });
});
