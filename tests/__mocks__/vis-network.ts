import { vi } from 'vitest';

// Mock Network class
export class Network {
  constructor() {
    // No-op constructor
  }
  on = vi.fn();
  off = vi.fn();
  destroy = vi.fn();
  getPositions = vi.fn(() => ({}));
  setOptions = vi.fn();
  fit = vi.fn();
}

// Mock Options type
export type Options = Record<string, unknown>;
