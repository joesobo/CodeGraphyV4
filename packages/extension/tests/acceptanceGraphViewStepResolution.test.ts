import { describe, expect, it, vi } from 'vitest';
import type { GraphAcceptanceContext } from './acceptance/graphView/types';
import type { AcceptanceRuntimeStep } from './acceptance/graphView/types';

vi.mock('./acceptance/graphView/canvas', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./acceptance/graphView/canvas')>();

  return {
    ...actual,
    clickNode: vi.fn(),
    modifierClickNode: vi.fn(),
    rightClickEdge: vi.fn(),
    rightClickNode: vi.fn(),
  };
});

describe('acceptance graph view step resolution', () => {
  it('maps visible symbol node type labels to exact symbol kinds', async () => {
    const { getSymbolKindsForNodeTypeLabel } = await import('./acceptance/graphView/steps');

    expect(getSymbolKindsForNodeTypeLabel('Function')).toEqual(['function', 'method']);
    expect(getSymbolKindsForNodeTypeLabel('Interface')).toEqual(['interface']);
    expect(getSymbolKindsForNodeTypeLabel('Prototype')).toEqual(['prototype']);
    expect(getSymbolKindsForNodeTypeLabel('Struct')).toEqual(['struct']);
    expect(getSymbolKindsForNodeTypeLabel('Type')).toEqual(['type']);
    expect(getSymbolKindsForNodeTypeLabel('Union')).toEqual(['union']);
    expect(getSymbolKindsForNodeTypeLabel('Typedef')).toEqual(['typedef']);
    expect(getSymbolKindsForNodeTypeLabel('Variable')).toEqual(['variable']);
  });

  it('routes edge context menu phrases to edge interactions before node interactions', async () => {
    const { graphViewAcceptanceSteps } = await import('./acceptance/graphView/steps');
    const { rightClickEdge, rightClickNode } = await import('./acceptance/graphView/canvas');
    const text = 'I right click the edge going from src/index.ts node to src/types.ts node to open its Graph Context Menu';

    const implementation = graphViewAcceptanceSteps[text];

    await implementation({} as GraphAcceptanceContext, {
      keyword: 'When',
      line: 1,
      sourcePath: 'test.md',
      text,
    } satisfies AcceptanceRuntimeStep);

    expect(rightClickEdge).toHaveBeenCalledWith(expect.anything(), 'src/index.ts', 'src/types.ts');
    expect(rightClickNode).not.toHaveBeenCalled();
  });

  it('uses a modifier click when the acceptance phrase selects multiple nodes', async () => {
    const { graphViewAcceptanceSteps } = await import('./acceptance/graphView/steps');
    const { clickNode, modifierClickNode, rightClickNode } = await import('./acceptance/graphView/canvas');
    const text = 'I click and drag on the background I can select multiple nodes at once';

    const implementation = graphViewAcceptanceSteps[text];

    await implementation({} as GraphAcceptanceContext, {
      keyword: 'When',
      line: 1,
      sourcePath: 'test.md',
      text,
    } satisfies AcceptanceRuntimeStep);

    expect(rightClickNode).not.toHaveBeenCalled();
    expect(clickNode).toHaveBeenCalledWith(expect.anything(), 'src/index.ts');
    expect(modifierClickNode).toHaveBeenCalledWith(expect.anything(), 'src/palette.ts');
  });
});
