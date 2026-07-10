import { describe, expect, it } from 'vitest';

import {
  createGraphScopeProjection,
  selectEffectiveProjection,
} from '../../../../../src/webview/app/shell/graphScopeVisibility/projection';

describe('webview/app/shell/graphScopeVisibility/projection', () => {
  it('selects a first node-only projection immediately', () => {
    const rendered = createGraphScopeProjection(0, {}, {});
    const incoming = createGraphScopeProjection(1, { file: true }, {});

    expect(selectEffectiveProjection(rendered, incoming)).toBe(incoming);
  });

  it('selects a first edge-only projection immediately', () => {
    const rendered = createGraphScopeProjection(0, {}, {});
    const incoming = createGraphScopeProjection(1, {}, { import: true });

    expect(selectEffectiveProjection(rendered, incoming)).toBe(incoming);
  });

  it('retains an empty rendered projection while the incoming projection is empty', () => {
    const rendered = createGraphScopeProjection(0, {}, {});
    const incoming = createGraphScopeProjection(1, {}, {});

    expect(selectEffectiveProjection(rendered, incoming)).toBe(rendered);
  });

  it('retains a populated rendered projection until scheduling publishes the next one', () => {
    const rendered = createGraphScopeProjection(0, { file: true }, {});
    const incoming = createGraphScopeProjection(1, {}, { import: true });

    expect(selectEffectiveProjection(rendered, incoming)).toBe(rendered);
  });
});
