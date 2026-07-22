import { describe, expect, it } from 'vitest';
import { getFileColor } from '../../src/fileColors';
import { createContainingFileNode } from '../../src/graph/containingFiles';

describe('core/graph/containingFiles', () => {
  it('uses the resolved file-extension color for a containing File Node', () => {
    expect(createContainingFileNode('src/player.gd', {
      'src/player.gd': { size: 20 },
    })).toEqual({
      id: 'src/player.gd',
      label: 'player.gd',
      color: getFileColor('.gd'),
      fileSize: 20,
    });
  });
});
