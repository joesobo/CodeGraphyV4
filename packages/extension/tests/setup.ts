import '@testing-library/jest-dom';
import { vi } from 'vitest';

// jsdom doesn't implement ResizeObserver
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock react-force-graph-2d / react-force-graph-3d (require canvas/WebGL which jsdom doesn't support)
vi.mock('react-force-graph-2d', () => import('./__mocks__/react-force-graph-2d'));
vi.mock('react-force-graph-3d', () => import('./__mocks__/react-force-graph-3d'));

// Track messages sent to extension - globally accessible for tests
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).__vscodeSentMessages = [] as unknown[];

// Mock acquireVsCodeApi with message tracking
vi.stubGlobal('acquireVsCodeApi', () => ({
  postMessage: (message: unknown) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).__vscodeSentMessages.push(message);
  },
  getState: vi.fn(),
  setState: vi.fn(),
}));
