import { describe, expect, it } from 'vitest';

import type { FGLink, FGNode } from '../../../../../src/webview/components/graph/model/build';
import {
  createGraphRenderBudget,
  MAX_DETAILED_RENDER_NODES,
  MAX_POINTER_RENDER_EDGES,
} from '../../../../../src/webview/components/graph/rendering/surface/renderBudget';

function node(id: string, nodeType?: FGNode['nodeType']): FGNode {
  return { id, nodeType } as FGNode;
}

function link(id: string, source: string, target: string): FGLink {
  return {
    bidirectional: false,
    from: source,
    id,
    source,
    target,
    to: target,
  };
}

describe('rendering/surface/renderBudget', () => {
  it('renders and hit-tests every item inside the detailed budget', () => {
    const file = node('src/app.ts', 'file');
    const symbol = node('src/app.ts#run', 'symbol');
    const contains = link('contains', file.id, symbol.id);

    const budget = createGraphRenderBudget({
      nodes: [file, symbol],
      links: [contains],
    });

    expect(budget.nodeVisibility(file)).toBe(true);
    expect(budget.nodeVisibility(symbol)).toBe(true);
    expect(budget.linkVisibility(contains)).toBe(true);
    expect(budget.enablePointerInteraction).toBe(true);
  });

  it('keeps the file graph interactive while hiding symbol detail above the budget', () => {
    const files = [
      node('src/app.ts', 'file'),
      node('src/lib.ts', 'file'),
    ];
    const symbols = Array.from(
      { length: MAX_DETAILED_RENDER_NODES },
      (_, index) => node(`src/app.ts#symbol-${index}`, 'symbol'),
    );
    const symbol = symbols[0]!;
    const fileLink = link('imports', files[0]!.id, files[1]!.id);
    const symbolLink = link('contains', files[0]!.id, symbol.id);

    const budget = createGraphRenderBudget({
      nodes: [...files, ...symbols],
      links: [fileLink, symbolLink],
    });

    expect(budget.nodeVisibility(files[0]!)).toBe(true);
    expect(budget.nodeVisibility(symbol)).toBe(false);
    expect(budget.linkVisibility(fileLink)).toBe(true);
    expect(budget.linkVisibility(symbolLink)).toBe(false);
    expect(budget.enablePointerInteraction).toBe(true);
  });

  it('bounds pointer work for edge-heavy graphs below the node limit', () => {
    const first = node('first', 'file');
    const second = node('second', 'file');
    const links = Array.from(
      { length: MAX_POINTER_RENDER_EDGES + 1 },
      (_, index) => link(`edge-${index}`, first.id, second.id),
    );

    const budget = createGraphRenderBudget({ nodes: [first, second], links });

    expect(budget.enablePointerInteraction).toBe(false);
  });
});
