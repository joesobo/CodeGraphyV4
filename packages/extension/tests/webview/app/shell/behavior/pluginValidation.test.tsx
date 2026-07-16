import { act, render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getAppBehaviorComponent, getAppBehaviorHarness, resetAppBehaviorHarness, sendAppMessage } from './fixture';

const App = getAppBehaviorComponent();

const harness = getAppBehaviorHarness();

describe('App plugin message validation', () => {
  beforeEach(() => resetAppBehaviorHarness());
  afterEach(() => vi.restoreAllMocks());

  it('ignores plugin injection payloads without a string plugin id', async () => {
        render(<App />);
  
        await act(async () => {
          sendAppMessage({
            type: 'PLUGIN_WEBVIEW_INJECT',
            payload: {
              pluginId: 42,
              scripts: ['data:text/javascript,export default {}'],
              styles: ['https://example.com/ignored.css'],
            },
          });
          await Promise.resolve();
        });
        await vi.dynamicImportSettled();
  
        expect(harness.createApiCalls).toEqual([]);
        expect(document.head.querySelectorAll('link')).toHaveLength(0);
        expect((globalThis as { __pluginActivations?: unknown[] }).__pluginActivations).toEqual([]);
      });

  it('normalizes non-array plugin asset payloads to empty lists', async () => {
        render(<App />);
  
        await act(async () => {
          sendAppMessage({
            type: 'PLUGIN_WEBVIEW_INJECT',
            payload: {
              pluginId: 'acme.plugin',
              scripts: 'not-an-array',
              styles: 'not-an-array',
            },
          });
          await Promise.resolve();
        });
        await vi.dynamicImportSettled();
  
        expect(harness.createApiCalls).toEqual([]);
        expect(document.head.querySelectorAll('link')).toHaveLength(0);
      });

  it('warns when an injected plugin script does not expose activate', async () => {
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        render(<App />);
  
        await act(async () => {
          sendAppMessage({
            type: 'PLUGIN_WEBVIEW_INJECT',
            payload: {
              pluginId: 'acme.plugin',
              scripts: ['data:text/javascript,export default {}'],
              styles: [],
            },
          });
          await Promise.resolve();
          await Promise.resolve();
        });
        await vi.dynamicImportSettled();
  
        await waitFor(() => {
          expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('has no activate(api) export'));
        });
        expect(harness.createApiCalls).toEqual([]);
      });
});
