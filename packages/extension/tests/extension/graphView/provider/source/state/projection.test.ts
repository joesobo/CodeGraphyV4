import { describe, expect, it } from 'vitest';
import { createGraphViewProviderMethodStateProjection } from '../../../../../../src/extension/graphView/provider/source/state/projection';
import { createMethodSourceOwnerStub } from '../fakes';

describe('source/state/projection', () => {
  it('exposes live mutable and readonly state through accessors', () => {
    const owner = createMethodSourceOwnerStub();
    const searchState = {
      query: 'App',
      options: { matchCase: true, wholeWord: false, regex: false },
    };
    (owner as unknown as { _searchState: unknown })._searchState = searchState;
    const source = createGraphViewProviderMethodStateProjection(owner);
    const nextRegistry = { id: 'next-registry' };
    const mutableOwner = owner as unknown as { _viewRegistry: unknown };
    const sourceSearchState = source as unknown as { _searchState?: unknown };

    expect(source._analysisRequestId).toBe(1);
    expect(source._viewRegistry).toBe(owner._viewRegistry);
    expect(sourceSearchState._searchState).toBe(searchState);

    source._analysisRequestId = 4;
    sourceSearchState._searchState = {
      query: 'main',
      options: { matchCase: false, wholeWord: true, regex: false },
    };
    mutableOwner._viewRegistry = nextRegistry;

    expect(owner._analysisRequestId).toBe(4);
    expect((owner as unknown as { _searchState: unknown })._searchState).toBe(sourceSearchState._searchState);
    expect(source._viewRegistry).toBe(nextRegistry);
  });
});
