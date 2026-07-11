import '@testing-library/jest-dom';
import { vi } from 'vitest';
import type { WebviewToExtensionMessage } from '../src/shared/protocol/webviewToExtension';

interface VscodeSentMessagesGlobal {
  __vscodeSentMessages: WebviewToExtensionMessage[];
}

// jsdom doesn't implement ResizeObserver
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// react-force-graph requires Canvas APIs that jsdom does not support.
vi.mock('react-force-graph-2d', () => import('./__mocks__/react-force-graph-2d'));

// Track messages sent to extension — globally accessible for tests via helpers/sentMessages.ts
(globalThis as unknown as VscodeSentMessagesGlobal).__vscodeSentMessages = [];

// Mock acquireVsCodeApi with message tracking
vi.stubGlobal('acquireVsCodeApi', () => ({
  postMessage: (message: WebviewToExtensionMessage) => {
    (globalThis as unknown as VscodeSentMessagesGlobal).__vscodeSentMessages.push(message);
  },
  getState: vi.fn(),
  setState: vi.fn(),
}));
