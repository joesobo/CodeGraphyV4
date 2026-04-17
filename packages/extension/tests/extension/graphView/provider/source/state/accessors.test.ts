import { describe, expect, it } from 'vitest';
import { attachMutableAccessors, attachReadonlyAccessors } from '../../../../../../src/extension/graphView/provider/source/state/accessors';

describe('source/state/accessors', () => {
  it('mirrors mutable owner state through getters and setters', () => {
    const owner = { count: 1 };
    const target = {} as { count: number };

    attachMutableAccessors(target, owner, ['count']);
    const descriptor = Object.getOwnPropertyDescriptor(target, 'count');

    expect(target.count).toBe(1);
    expect(descriptor).toMatchObject({
      configurable: true,
      enumerable: true,
    });
    expect(descriptor?.get).toBeTypeOf('function');
    expect(descriptor?.set).toBeTypeOf('function');

    target.count = 2;

    expect(owner.count).toBe(2);

    owner.count = 3;

    expect(target.count).toBe(3);
  });

  it('mirrors readonly owner state through getters', () => {
    const owner = { label: 'initial' };
    const target = {} as { label: string };

    attachReadonlyAccessors(target, owner, ['label']);
    const descriptor = Object.getOwnPropertyDescriptor(target, 'label');

    expect(target.label).toBe('initial');
    expect(descriptor).toMatchObject({
      configurable: true,
      enumerable: true,
    });
    expect(descriptor?.get).toBeTypeOf('function');
    expect(descriptor?.set).toBeUndefined();

    owner.label = 'updated';

    expect(target.label).toBe('updated');
  });
});
