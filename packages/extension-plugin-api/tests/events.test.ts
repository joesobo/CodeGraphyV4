import { describe, expectTypeOf, it } from 'vitest';
import type { EventName, EventPayloads } from '../src/events';

describe('Extension plugin events', () => {
  it('keeps Extension events in the Extension Plugin API', () => {
    expectTypeOf<'graph:zoom'>().toMatchTypeOf<EventName>();
    expectTypeOf<EventPayloads['graph:zoom']>().toHaveProperty('center');
  });
});
