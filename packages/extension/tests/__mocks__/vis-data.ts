import { vi } from 'vitest';

// Mock DataSet class
export class DataSet {
  private items: unknown[] = [];

  constructor(data?: unknown[]) {
    this.items = data ?? [];
  }

  add = vi.fn((item: unknown) => {
    this.items.push(item);
  });

  remove = vi.fn();
  update = vi.fn();
  get = vi.fn(() => this.items);
  getIds = vi.fn(() => this.items.map((_, i) => i));
}
