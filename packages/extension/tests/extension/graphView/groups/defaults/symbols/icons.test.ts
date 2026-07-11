import { describe, expect, it } from 'vitest';
import { createMaterialSymbolIconDataUrl } from '../../../../../../src/extension/graphView/groups/defaults/symbols/icons';

describe('graphView/defaults/symbols/icons', () => {
  it('encodes a white Material symbol SVG', () => {
    const value = createMaterialSymbolIconDataUrl('M1 2h3');
    expect(Buffer.from(value.split(',')[1]!, 'base64').toString('utf8')).toContain(
      '<path fill="#FFFFFF" d="M1 2h3"/>',
    );
  });
});
