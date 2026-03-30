import { ViewRegistry } from '../../../src/core/views/registry';
import type { IView, IViewContext } from '../../../src/core/views/contracts';
import type { IGraphData } from '../../../src/shared/graph/types';

export function createMockView(overrides: Partial<IView> = {}): IView {
  return {
    id: 'test.view',
    name: 'Test View',
    icon: 'symbol-file',
    description: 'A test view',
    transform: (data: IGraphData) => data,
    ...overrides,
  };
}

export function createMockContext(overrides: Partial<IViewContext> = {}): IViewContext {
  return {
    activePlugins: new Set(),
    ...overrides,
  };
}

export function createRegistry(): ViewRegistry {
  return new ViewRegistry();
}
