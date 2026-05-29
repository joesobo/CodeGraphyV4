import { describe, expect, it } from 'vitest';
import { createBuiltInEntries } from '../../../../../src/webview/components/legends/panel/state/builtInEntries';

describe('webview/legends/panel/state/builtInEntries', () => {
  it('uses explicit color overrides and falls back to defaults', () => {
    expect(createBuiltInEntries(
      [
        { id: 'file', label: 'File', defaultColor: '#111111' },
        { id: 'symbol', label: 'Symbol', defaultColor: '#7C3AED' },
      ],
      { file: '#abcdef' },
    )).toEqual([
      { id: 'file', label: 'File', color: '#abcdef', defaultColor: '#111111' },
      { id: 'symbol', label: 'Symbol', color: '#7C3AED', defaultColor: '#7C3AED' },
    ]);
  });
});
