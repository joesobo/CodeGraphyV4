import { vi } from 'vitest';
import { CodeGraphyAPIImpl } from '@/core/plugins/api/instance';
import { EventBus } from '@/core/plugins/events/bus';
import { DecorationManager } from '@/core/plugins/decoration/manager';
import { ViewRegistry } from '@/core/views/registry';
import type { IGraphData } from '@/shared/graph/contracts';

export function createTestAPI(pluginId = 'test-plugin') {
  const eventBus = new EventBus();
  const decorationManager = new DecorationManager();
  const viewRegistry = new ViewRegistry();
  const graphData: IGraphData = {
    nodes: [
      { id: 'a.ts', label: 'a.ts', color: '#fff' },
      { id: 'b.ts', label: 'b.ts', color: '#fff' },
      { id: 'c.ts', label: 'c.ts', color: '#fff' },
    ],
    edges: [
      { id: 'a.ts->b.ts', from: 'a.ts', to: 'b.ts' , kind: 'import', sources: [] },
      { id: 'b.ts->c.ts', from: 'b.ts', to: 'c.ts' , kind: 'import', sources: [] },
    ],
  };
  const graphProvider = vi.fn(() => graphData);
  const commandRegistrar = vi.fn(() => ({ dispose: vi.fn() }));
  const webviewSender = vi.fn();
  const exportSaver = vi.fn(async () => undefined);
  const logFn = vi.fn();

  const api = new CodeGraphyAPIImpl(
    pluginId,
    eventBus,
    decorationManager,
    viewRegistry,
    graphProvider,
    commandRegistrar,
    webviewSender,
    exportSaver,
    '/workspace',
    logFn,
  );

  return {
    api,
    eventBus,
    decorationManager,
    viewRegistry,
    graphProvider,
    commandRegistrar,
    webviewSender,
    exportSaver,
    logFn,
    graphData,
  };
}
