import { describe, expect, it } from 'vitest';
import { updateAccessCount } from '../../../../../../src/webview/components/graph/interactionRuntime/handlers/view/accessCount';
import { createInteractionDependencies } from '../../testUtils';

describe('graph/interactionRuntime/accessCount', () => {
  it('updates the access count for the matching node only', () => {
    const dependencies = createInteractionDependencies();

    updateAccessCount(dependencies, 'src/app.ts', 7);

    expect(dependencies.dataRef.current.nodes[0]?.accessCount).toBe(7);
    expect(dependencies.dataRef.current.nodes[1]?.accessCount).toBeUndefined();
  });

  it('does nothing when updating the access count for a missing node', () => {
    const dependencies = createInteractionDependencies();
    const originalNodes = dependencies.dataRef.current.nodes.map((node) => ({ ...node }));

    updateAccessCount(dependencies, 'src/missing.ts', 7);

    expect(dependencies.dataRef.current.nodes).toEqual(originalNodes);
  });
});
