import { describe, expect, it } from 'vitest';
import { createGraphViewProviderMethodStateSource } from '../../../../../src/extension/graphView/provider/source/state';
import { createMethodSourceOwnerStub } from './fakes';

describe('source/state', () => {
  it('exposes live mutable and readonly state through accessors', () => {
    const owner = createMethodSourceOwnerStub();
    const source = createGraphViewProviderMethodStateSource(owner);
    const nextRegistry = { id: 'next-registry' };
    const mutableOwner = owner as unknown as { _viewRegistry: unknown };

    expect(source._analysisRequestId).toBe(1);
    expect(source._viewRegistry).toBe(owner._viewRegistry);

    source._analysisRequestId = 4;
    mutableOwner._viewRegistry = nextRegistry;

    expect(owner._analysisRequestId).toBe(4);
    expect(source._viewRegistry).toBe(nextRegistry);
  });
});
