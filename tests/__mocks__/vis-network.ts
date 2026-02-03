import { vi } from 'vitest';

// Store event handlers for testing - shared across all instances
type EventHandler = (...args: unknown[]) => void;
const globalEventHandlers: Map<string, EventHandler[]> = new Map();

// Keep track of all Network instances for event simulation
const networkInstances: Network[] = [];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let addedData: { nodes: any[]; edges: any[] } = { nodes: [], edges: [] };

// Store what getNodeAt should return (for testing context menu behavior)
let mockNodeAtPosition: string | undefined = undefined;

// Store position-to-node mappings for more realistic testing
const mockNodePositions: Map<string, string> = new Map();

// Helper to create position key
function posKey(x: number, y: number): string {
  return `${x},${y}`;
}

// Mock Network class with event simulation support
export class Network {
  private instanceHandlers: Map<string, EventHandler[]> = new Map();
  private selectedNodes: string[] = [];

  constructor() {
    networkInstances.push(this);
  }

  on = vi.fn((eventName: string, handler: EventHandler) => {
    // Store in instance handlers
    if (!this.instanceHandlers.has(eventName)) {
      this.instanceHandlers.set(eventName, []);
    }
    this.instanceHandlers.get(eventName)!.push(handler);
    
    // Also store in global map for static access
    if (!globalEventHandlers.has(eventName)) {
      globalEventHandlers.set(eventName, []);
    }
    globalEventHandlers.get(eventName)!.push(handler);
  });

  off = vi.fn((eventName: string, handler: EventHandler) => {
    const handlers = this.instanceHandlers.get(eventName);
    if (handlers) {
      const idx = handlers.indexOf(handler);
      if (idx >= 0) handlers.splice(idx, 1);
    }
    const globalHandlers = globalEventHandlers.get(eventName);
    if (globalHandlers) {
      const idx = globalHandlers.indexOf(handler);
      if (idx >= 0) globalHandlers.splice(idx, 1);
    }
  });

  destroy = vi.fn(() => {
    this.instanceHandlers.clear();
    const idx = networkInstances.indexOf(this);
    if (idx >= 0) networkInstances.splice(idx, 1);
  });

  getPositions = vi.fn(() => ({}));
  setOptions = vi.fn();
  fit = vi.fn();
  focus = vi.fn();
  moveTo = vi.fn();
  getScale = vi.fn(() => 1);
  unselectAll = vi.fn(() => {
    this.selectedNodes = [];
  });

  selectNodes = vi.fn((nodeIds: string[]) => {
    this.selectedNodes = nodeIds;
  });

  getSelectedNodes = vi.fn(() => [...this.selectedNodes]);

  // Returns the mocked node at position (set via setMockNodeAtPosition or mockGetNodeAt)
  getNodeAt = vi.fn((position: { x: number; y: number }) => {
    // First check position-based mapping
    const key = posKey(position.x, position.y);
    if (mockNodePositions.has(key)) {
      return mockNodePositions.get(key);
    }
    // Fall back to global mock
    return mockNodeAtPosition;
  });

  // Instance method to trigger events on this network
  triggerEvent(eventName: string, params: unknown) {
    const handlers = this.instanceHandlers.get(eventName);
    if (handlers) {
      handlers.forEach(handler => handler(params));
    }
  }

  // Static helper to simulate events on all instances (for testing)
  static simulateEvent(eventName: string, params: unknown) {
    // Trigger on all active network instances
    networkInstances.forEach(instance => {
      instance.triggerEvent(eventName, params);
    });
  }

  // Static helper to get registered event names from global handlers
  static getRegisteredEvents(): string[] {
    return Array.from(globalEventHandlers.keys());
  }

  // Static helper to clear all handlers (for test cleanup)
  static clearAllHandlers() {
    globalEventHandlers.clear();
    networkInstances.forEach(instance => {
      instance.instanceHandlers.clear();
    });
    networkInstances.length = 0;
    mockNodeAtPosition = undefined;
  }

  // Static helper to mock what getNodeAt returns (for context menu tests)
  static mockGetNodeAt(nodeId: string | undefined) {
    mockNodeAtPosition = nodeId;
  }

  // Static helper to set a node at a specific position
  static setMockNodeAtPosition(position: { x: number; y: number }, nodeId: string) {
    mockNodePositions.set(posKey(position.x, position.y), nodeId);
  }

  // Static helper to clear position mocks
  static clearMockPositions() {
    mockNodePositions.clear();
    mockNodeAtPosition = undefined;
  }

  // Static helper to get the handler for an event
  static getHandler(eventName: string): EventHandler | undefined {
    const handlers = globalEventHandlers.get(eventName);
    return handlers && handlers.length > 0 ? handlers[0] : undefined;
  }
}

// Mock Options type
export type Options = Record<string, unknown>;
