import '@testing-library/jest-dom';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { vi } from 'vitest';
import { installGraphPhysicsModule } from '@codegraphy-dev/graph-renderer';
import type { WebviewToExtensionMessage } from '../src/shared/protocol/webviewToExtension';

const ownedGraphPhysicsBytes = readFileSync(resolve(
  __dirname,
  '../../graph-renderer/src/wasm/generated/physics.wasm',
));
installGraphPhysicsModule(new WebAssembly.Module(ownedGraphPhysicsBytes));

interface VscodeSentMessagesGlobal {
  __vscodeSentMessages: WebviewToExtensionMessage[];
}

// jsdom doesn't implement ResizeObserver
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Most graph interaction tests isolate the owned GPU surface behind its public props.
vi.mock(
  '../src/webview/components/graph/rendering/surface/owned2d/view',
  () => import('./__mocks__/ownedGraphSurface'),
);

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
