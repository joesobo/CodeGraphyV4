import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock vis-network (requires canvas which jsdom doesn't support)
vi.mock('vis-network', () => import('./__mocks__/vis-network'));
vi.mock('vis-data', () => import('./__mocks__/vis-data'));

// Mock acquireVsCodeApi
vi.stubGlobal('acquireVsCodeApi', () => ({
  postMessage: vi.fn(),
  getState: vi.fn(),
  setState: vi.fn(),
}));
