import { describe, it, expect } from 'vitest';
import { removeHandler, removeAllHandlersForPlugin } from '../../../src/core/plugins/eventBusHandlers';
import type { EventHandler } from '../../../src/core/plugins/eventBusHandlers';
import type { EventName } from '../../../../plugin-api/src/events';

describe('removeHandler', () => {
  it('removes the handler from the event set', () => {
    const handler: EventHandler = (() => {}) as EventHandler;
    const handlers = new Map<EventName, Set<EventHandler>>();
    handlers.set('analysis:started', new Set([handler]));

    removeHandler('analysis:started', handler, handlers);

    expect(handlers.get('analysis:started')).toBeUndefined();
  });

  it('deletes the event key when the last handler is removed', () => {
    const handler: EventHandler = (() => {}) as EventHandler;
    const handlers = new Map<EventName, Set<EventHandler>>();
    handlers.set('analysis:started', new Set([handler]));

    removeHandler('analysis:started', handler, handlers);

    expect(handlers.has('analysis:started')).toBe(false);
  });

  it('keeps the event key when other handlers remain', () => {
    const handler1: EventHandler = (() => {}) as EventHandler;
    const handler2: EventHandler = (() => {}) as EventHandler;
    const handlers = new Map<EventName, Set<EventHandler>>();
    handlers.set('analysis:started', new Set([handler1, handler2]));

    removeHandler('analysis:started', handler1, handlers);

    expect(handlers.has('analysis:started')).toBe(true);
    expect(handlers.get('analysis:started')!.size).toBe(1);
    expect(handlers.get('analysis:started')!.has(handler2)).toBe(true);
  });

  it('does nothing when the event has no handlers registered', () => {
    const handler: EventHandler = (() => {}) as EventHandler;
    const handlers = new Map<EventName, Set<EventHandler>>();

    removeHandler('analysis:started', handler, handlers);

    expect(handlers.size).toBe(0);
  });

  it('does nothing when handler is not in the set for that event', () => {
    const handler1: EventHandler = (() => {}) as EventHandler;
    const handler2: EventHandler = (() => {}) as EventHandler;
    const handlers = new Map<EventName, Set<EventHandler>>();
    handlers.set('analysis:started', new Set([handler1]));

    removeHandler('analysis:started', handler2, handlers);

    expect(handlers.get('analysis:started')!.size).toBe(1);
    expect(handlers.get('analysis:started')!.has(handler1)).toBe(true);
  });

  it('removes handler from plugin tracking when pluginId and pluginHandlers are provided', () => {
    const handler: EventHandler = (() => {}) as EventHandler;
    const handlers = new Map<EventName, Set<EventHandler>>();
    handlers.set('analysis:started', new Set([handler]));
    const entry = { event: 'analysis:started' as EventName, handler };
    const pluginHandlers = new Map<string, Set<{ event: EventName; handler: EventHandler }>>();
    pluginHandlers.set('plugin-a', new Set([entry]));

    removeHandler('analysis:started', handler, handlers, 'plugin-a', pluginHandlers);

    expect(pluginHandlers.has('plugin-a')).toBe(false);
  });

  it('deletes plugin key from pluginHandlers when last handler is removed', () => {
    const handler: EventHandler = (() => {}) as EventHandler;
    const handlers = new Map<EventName, Set<EventHandler>>();
    handlers.set('analysis:started', new Set([handler]));
    const entry = { event: 'analysis:started' as EventName, handler };
    const pluginHandlers = new Map<string, Set<{ event: EventName; handler: EventHandler }>>();
    pluginHandlers.set('plugin-a', new Set([entry]));

    removeHandler('analysis:started', handler, handlers, 'plugin-a', pluginHandlers);

    expect(pluginHandlers.has('plugin-a')).toBe(false);
  });

  it('keeps plugin key when other handlers remain for that plugin', () => {
    const handler1: EventHandler = (() => {}) as EventHandler;
    const handler2: EventHandler = (() => {}) as EventHandler;
    const handlers = new Map<EventName, Set<EventHandler>>();
    handlers.set('analysis:started', new Set([handler1]));
    handlers.set('graph:nodeClick', new Set([handler2]));
    const entry1 = { event: 'analysis:started' as EventName, handler: handler1 };
    const entry2 = { event: 'graph:nodeClick' as EventName, handler: handler2 };
    const pluginHandlers = new Map<string, Set<{ event: EventName; handler: EventHandler }>>();
    pluginHandlers.set('plugin-a', new Set([entry1, entry2]));

    removeHandler('analysis:started', handler1, handlers, 'plugin-a', pluginHandlers);

    expect(pluginHandlers.has('plugin-a')).toBe(true);
    expect(pluginHandlers.get('plugin-a')!.size).toBe(1);
  });

  it('does nothing to pluginHandlers when pluginId is not in the map', () => {
    const handler: EventHandler = (() => {}) as EventHandler;
    const handlers = new Map<EventName, Set<EventHandler>>();
    handlers.set('analysis:started', new Set([handler]));
    const pluginHandlers = new Map<string, Set<{ event: EventName; handler: EventHandler }>>();

    removeHandler('analysis:started', handler, handlers, 'plugin-a', pluginHandlers);

    expect(pluginHandlers.size).toBe(0);
  });

  it('does not remove from pluginHandlers when pluginId is provided but pluginHandlers is undefined', () => {
    const handler: EventHandler = (() => {}) as EventHandler;
    const handlers = new Map<EventName, Set<EventHandler>>();
    handlers.set('analysis:started', new Set([handler]));

    removeHandler('analysis:started', handler, handlers, 'plugin-a', undefined);

    expect(handlers.has('analysis:started')).toBe(false);
  });

  it('does not remove from pluginHandlers when pluginId is undefined', () => {
    const handler: EventHandler = (() => {}) as EventHandler;
    const handlers = new Map<EventName, Set<EventHandler>>();
    handlers.set('analysis:started', new Set([handler]));
    const pluginHandlers = new Map<string, Set<{ event: EventName; handler: EventHandler }>>();
    const entry = { event: 'analysis:started' as EventName, handler };
    pluginHandlers.set('plugin-a', new Set([entry]));

    removeHandler('analysis:started', handler, handlers, undefined, pluginHandlers);

    expect(pluginHandlers.has('plugin-a')).toBe(true);
    expect(pluginHandlers.get('plugin-a')!.size).toBe(1);
  });

  it('only removes the matching entry from plugin set based on event and handler', () => {
    const handler1: EventHandler = (() => {}) as EventHandler;
    const handler2: EventHandler = (() => {}) as EventHandler;
    const handlers = new Map<EventName, Set<EventHandler>>();
    handlers.set('analysis:started', new Set([handler1]));
    const entry1 = { event: 'analysis:started' as EventName, handler: handler1 };
    const entry2 = { event: 'analysis:started' as EventName, handler: handler2 };
    const pluginHandlers = new Map<string, Set<{ event: EventName; handler: EventHandler }>>();
    pluginHandlers.set('plugin-a', new Set([entry1, entry2]));

    removeHandler('analysis:started', handler1, handlers, 'plugin-a', pluginHandlers);

    expect(pluginHandlers.get('plugin-a')!.size).toBe(1);
    expect(pluginHandlers.get('plugin-a')!.has(entry2)).toBe(true);
  });

  it('does not remove entry when event matches but handler does not', () => {
    const handler1: EventHandler = (() => {}) as EventHandler;
    const handler2: EventHandler = (() => {}) as EventHandler;
    const handlers = new Map<EventName, Set<EventHandler>>();
    handlers.set('analysis:started', new Set([handler1]));
    const entry = { event: 'analysis:started' as EventName, handler: handler2 };
    const pluginHandlers = new Map<string, Set<{ event: EventName; handler: EventHandler }>>();
    pluginHandlers.set('plugin-a', new Set([entry]));

    removeHandler('analysis:started', handler1, handlers, 'plugin-a', pluginHandlers);

    expect(pluginHandlers.get('plugin-a')!.size).toBe(1);
  });

  it('does not remove entry when handler matches but event does not', () => {
    const handler: EventHandler = (() => {}) as EventHandler;
    const handlers = new Map<EventName, Set<EventHandler>>();
    handlers.set('analysis:started', new Set([handler]));
    const entry = { event: 'graph:nodeClick' as EventName, handler };
    const pluginHandlers = new Map<string, Set<{ event: EventName; handler: EventHandler }>>();
    pluginHandlers.set('plugin-a', new Set([entry]));

    removeHandler('analysis:started', handler, handlers, 'plugin-a', pluginHandlers);

    expect(pluginHandlers.get('plugin-a')!.size).toBe(1);
  });

  it('breaks after removing the first matching entry', () => {
    const handler: EventHandler = (() => {}) as EventHandler;
    const handlers = new Map<EventName, Set<EventHandler>>();
    handlers.set('analysis:started', new Set([handler]));
    // Create two entries with the same event+handler (edge case)
    const entry1 = { event: 'analysis:started' as EventName, handler };
    const entry2 = { event: 'analysis:started' as EventName, handler };
    const pluginHandlers = new Map<string, Set<{ event: EventName; handler: EventHandler }>>();
    pluginHandlers.set('plugin-a', new Set([entry1, entry2]));

    removeHandler('analysis:started', handler, handlers, 'plugin-a', pluginHandlers);

    // Only one should be removed due to break
    expect(pluginHandlers.get('plugin-a')!.size).toBe(1);
  });
});

describe('removeAllHandlersForPlugin', () => {
  it('removes all handlers registered by the specified plugin', () => {
    const handler1: EventHandler = (() => {}) as EventHandler;
    const handler2: EventHandler = (() => {}) as EventHandler;
    const handlers = new Map<EventName, Set<EventHandler>>();
    handlers.set('analysis:started', new Set([handler1]));
    handlers.set('graph:nodeClick', new Set([handler2]));
    const pluginHandlers = new Map<string, Set<{ event: EventName; handler: EventHandler }>>();
    pluginHandlers.set('plugin-a', new Set([
      { event: 'analysis:started' as EventName, handler: handler1 },
      { event: 'graph:nodeClick' as EventName, handler: handler2 },
    ]));

    removeAllHandlersForPlugin('plugin-a', handlers, pluginHandlers);

    expect(handlers.size).toBe(0);
    expect(pluginHandlers.has('plugin-a')).toBe(false);
  });

  it('does nothing when the plugin has no registered handlers', () => {
    const handlers = new Map<EventName, Set<EventHandler>>();
    const pluginHandlers = new Map<string, Set<{ event: EventName; handler: EventHandler }>>();

    removeAllHandlersForPlugin('nonexistent', handlers, pluginHandlers);

    expect(handlers.size).toBe(0);
    expect(pluginHandlers.size).toBe(0);
  });

  it('returns early when pluginId is not in pluginHandlers', () => {
    const handler: EventHandler = (() => {}) as EventHandler;
    const handlers = new Map<EventName, Set<EventHandler>>();
    handlers.set('analysis:started', new Set([handler]));
    const pluginHandlers = new Map<string, Set<{ event: EventName; handler: EventHandler }>>();

    removeAllHandlersForPlugin('plugin-a', handlers, pluginHandlers);

    // Handlers should be unchanged since plugin-a has no entries
    expect(handlers.get('analysis:started')!.size).toBe(1);
  });

  it('removes the plugin key from pluginHandlers', () => {
    const handler: EventHandler = (() => {}) as EventHandler;
    const handlers = new Map<EventName, Set<EventHandler>>();
    handlers.set('analysis:started', new Set([handler]));
    const pluginHandlers = new Map<string, Set<{ event: EventName; handler: EventHandler }>>();
    pluginHandlers.set('plugin-a', new Set([
      { event: 'analysis:started' as EventName, handler },
    ]));

    removeAllHandlersForPlugin('plugin-a', handlers, pluginHandlers);

    expect(pluginHandlers.has('plugin-a')).toBe(false);
  });

  it('leaves other plugins handlers intact', () => {
    const handlerA: EventHandler = (() => {}) as EventHandler;
    const handlerB: EventHandler = (() => {}) as EventHandler;
    const handlers = new Map<EventName, Set<EventHandler>>();
    handlers.set('analysis:started', new Set([handlerA, handlerB]));
    const pluginHandlers = new Map<string, Set<{ event: EventName; handler: EventHandler }>>();
    pluginHandlers.set('plugin-a', new Set([
      { event: 'analysis:started' as EventName, handler: handlerA },
    ]));
    pluginHandlers.set('plugin-b', new Set([
      { event: 'analysis:started' as EventName, handler: handlerB },
    ]));

    removeAllHandlersForPlugin('plugin-a', handlers, pluginHandlers);

    expect(handlers.get('analysis:started')!.has(handlerB)).toBe(true);
    expect(handlers.get('analysis:started')!.size).toBe(1);
    expect(pluginHandlers.has('plugin-b')).toBe(true);
  });

  it('deletes event key from handlers when the last handler for that event is removed', () => {
    const handler: EventHandler = (() => {}) as EventHandler;
    const handlers = new Map<EventName, Set<EventHandler>>();
    handlers.set('analysis:started', new Set([handler]));
    const pluginHandlers = new Map<string, Set<{ event: EventName; handler: EventHandler }>>();
    pluginHandlers.set('plugin-a', new Set([
      { event: 'analysis:started' as EventName, handler },
    ]));

    removeAllHandlersForPlugin('plugin-a', handlers, pluginHandlers);

    expect(handlers.has('analysis:started')).toBe(false);
  });

  it('keeps event key when other handlers from other plugins remain', () => {
    const handlerA: EventHandler = (() => {}) as EventHandler;
    const handlerOther: EventHandler = (() => {}) as EventHandler;
    const handlers = new Map<EventName, Set<EventHandler>>();
    handlers.set('analysis:started', new Set([handlerA, handlerOther]));
    const pluginHandlers = new Map<string, Set<{ event: EventName; handler: EventHandler }>>();
    pluginHandlers.set('plugin-a', new Set([
      { event: 'analysis:started' as EventName, handler: handlerA },
    ]));

    removeAllHandlersForPlugin('plugin-a', handlers, pluginHandlers);

    expect(handlers.has('analysis:started')).toBe(true);
    expect(handlers.get('analysis:started')!.size).toBe(1);
  });

  it('handles plugin with handler for event that has no entry in handlers map', () => {
    const handler: EventHandler = (() => {}) as EventHandler;
    const handlers = new Map<EventName, Set<EventHandler>>();
    // Note: no 'analysis:started' entry in handlers
    const pluginHandlers = new Map<string, Set<{ event: EventName; handler: EventHandler }>>();
    pluginHandlers.set('plugin-a', new Set([
      { event: 'analysis:started' as EventName, handler },
    ]));

    removeAllHandlersForPlugin('plugin-a', handlers, pluginHandlers);

    expect(pluginHandlers.has('plugin-a')).toBe(false);
  });

  it('removes multiple handlers for the same event from a single plugin', () => {
    const handler1: EventHandler = (() => {}) as EventHandler;
    const handler2: EventHandler = (() => {}) as EventHandler;
    const handlers = new Map<EventName, Set<EventHandler>>();
    handlers.set('analysis:started', new Set([handler1, handler2]));
    const pluginHandlers = new Map<string, Set<{ event: EventName; handler: EventHandler }>>();
    pluginHandlers.set('plugin-a', new Set([
      { event: 'analysis:started' as EventName, handler: handler1 },
      { event: 'analysis:started' as EventName, handler: handler2 },
    ]));

    removeAllHandlersForPlugin('plugin-a', handlers, pluginHandlers);

    expect(handlers.has('analysis:started')).toBe(false);
    expect(pluginHandlers.has('plugin-a')).toBe(false);
  });
});
