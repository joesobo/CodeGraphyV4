import { describe, expect, it } from 'vitest';
import { EventBus } from '@/core/plugins/EventBus';
import { DecorationManager } from '@/core/plugins/DecorationManager';
import { ViewRegistry } from '@/core/views/ViewRegistry';
import { hasScopedApiConfiguration, IPluginApiConfiguration } from '@/core/plugins/pluginApiConfiguration';

function createCompleteConfiguration(): IPluginApiConfiguration {
  return {
    eventBus: new EventBus(),
    decorationManager: new DecorationManager(),
    viewRegistry: new ViewRegistry(),
    graphProvider: () => ({ nodes: [], edges: [] }),
    commandRegistrar: () => ({ dispose: () => {} }),
    webviewSender: () => {},
    workspaceRoot: '/workspace',
  };
}

describe('pluginApiConfiguration', () => {
  it('returns true only when every scoped API dependency is configured', () => {
    expect(hasScopedApiConfiguration(createCompleteConfiguration())).toBe(true);
  });

  it('returns false when the event bus is missing', () => {
    const configuration = createCompleteConfiguration();
    delete configuration.eventBus;

    expect(hasScopedApiConfiguration(configuration)).toBe(false);
  });

  it('returns false when the decoration manager is missing', () => {
    const configuration = createCompleteConfiguration();
    delete configuration.decorationManager;

    expect(hasScopedApiConfiguration(configuration)).toBe(false);
  });

  it('returns false when the view registry is missing', () => {
    const configuration = createCompleteConfiguration();
    delete configuration.viewRegistry;

    expect(hasScopedApiConfiguration(configuration)).toBe(false);
  });

  it('returns false when the command registrar is missing', () => {
    const configuration = createCompleteConfiguration();
    delete configuration.commandRegistrar;

    expect(hasScopedApiConfiguration(configuration)).toBe(false);
  });

  it('returns false when the graph provider is missing', () => {
    const configuration = createCompleteConfiguration();
    delete configuration.graphProvider;

    expect(hasScopedApiConfiguration(configuration)).toBe(false);
  });

  it('returns false when the webview sender is missing', () => {
    const configuration = createCompleteConfiguration();
    delete configuration.webviewSender;

    expect(hasScopedApiConfiguration(configuration)).toBe(false);
  });

  it('returns false when the workspace root is missing', () => {
    const configuration = createCompleteConfiguration();
    delete configuration.workspaceRoot;

    expect(hasScopedApiConfiguration(configuration)).toBe(false);
  });
});
