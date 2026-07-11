import { describe, expect, it } from 'vitest';
import { TYPESCRIPT_ALIAS_IMPORT_EDGE_TYPE } from '../../src/aliasImport/contribution';

describe('TypeScript alias import contribution', () => {
  it('declares a visible plugin-owned edge type', () => {
    expect(TYPESCRIPT_ALIAS_IMPORT_EDGE_TYPE).toEqual(expect.objectContaining({
      id: 'codegraphy.typescript:alias-import',
      defaultVisible: true,
    }));
  });
});
