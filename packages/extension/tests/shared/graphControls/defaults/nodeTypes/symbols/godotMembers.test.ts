import { describe, expect, it } from 'vitest';
import { createGodotMemberNodeTypes } from '../../../../../../src/shared/graphControls/defaults/nodeTypes/symbols/godotMembers';

describe('shared/graphControls/defaults/nodeTypes/symbols/godotMembers', () => {
  it('creates the Godot member types', () => {
    expect(createGodotMemberNodeTypes().map(({ matchSymbolPluginKind }) => matchSymbolPluginKind))
      .toEqual(['scene-node', 'signal']);
  });
});
