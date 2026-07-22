import { vi } from 'vitest';

export function createRuleRowHandlers() {
  return {
    onDragStart: vi.fn(),
    onDragOver: vi.fn(),
    onDrop: vi.fn(),
    onDragEnd: vi.fn(),
    onChange: vi.fn(),
    onRemove: vi.fn(),
    onToggleDefaultVisibility: vi.fn(),
  };
}
