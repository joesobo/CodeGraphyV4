import { act, render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getAppBehaviorComponent, getAppBehaviorHarness, resetAppBehaviorHarness, sendAppMessage } from './fixture';

const App = getAppBehaviorComponent();

const harness = getAppBehaviorHarness();

describe('App plugin asset behavior', () => {
  beforeEach(() => resetAppBehaviorHarness());
  afterEach(() => vi.restoreAllMocks());

  it('routes plugin-scoped messages to the plugin host', async () => {
        render(<App />);
  
        await act(async () => {
          sendAppMessage({ type: 'plugin:acme.plugin:node:click', data: { nodeId: 'src/App.ts' } });
        });
  
        expect(harness.deliveries).toEqual([
          {
            pluginId: 'acme.plugin',
            message: { type: 'node:click', data: { nodeId: 'src/App.ts' } },
          },
        ]);
      });

  it('ignores malformed extension messages and unscoped plugin messages', async () => {
        render(<App />);
  
        await act(async () => {
          sendAppMessage(42);
          sendAppMessage({ type: 'plugin:acme.plugin' });
        });
  
        expect(harness.deliveries).toEqual([]);
        expect(harness.createApiCalls).toEqual([]);
      });

  it('injects plugin assets, activates scripts once, and reuses cached styles', async () => {
        render(<App />);
  
        const scriptUrl = 'data:text/javascript,export default { activate(api) { globalThis.__pluginActivations.push({ hasPluginDataWrite: typeof api.setPluginData === "function", hasHelpers: typeof api.helpers.drawLabel === "function" }); } }';
  
        await act(async () => {
          sendAppMessage({
            type: 'PLUGIN_WEBVIEW_INJECT',
            payload: {
              pluginId: 'acme.plugin',
              scripts: [scriptUrl],
              styles: ['https://example.com/plugin.css'],
            },
          });
          await Promise.resolve();
          await Promise.resolve();
        });
        await vi.dynamicImportSettled();
  
        await act(async () => {
          sendAppMessage({
            type: 'PLUGIN_WEBVIEW_INJECT',
            payload: {
              pluginId: 'acme.plugin',
              scripts: [scriptUrl],
              styles: ['https://example.com/plugin.css'],
            },
          });
          await Promise.resolve();
          await Promise.resolve();
        });
        await vi.dynamicImportSettled();
  
        await waitFor(() => {
          expect(harness.createApiCalls).toEqual(['acme.plugin']);
        });
        expect(document.head.querySelectorAll('link[href="https://example.com/plugin.css"]')).toHaveLength(1);
        expect((globalThis as { __pluginActivations?: unknown[] }).__pluginActivations).toEqual([
          { hasPluginDataWrite: true, hasHelpers: true },
        ]);
      });
});
