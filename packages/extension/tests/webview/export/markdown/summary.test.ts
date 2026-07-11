import { describe, expect, it } from 'vitest';
import { appendSection } from '../../../../src/webview/export/markdown/summary';
describe('webview/export/markdown/summary', () => {
  it('appends section headings with blank-line spacing', () => {
    const lines = ['# CodeGraphy Export'];

    appendSection(lines, '## Nodes');

    expect(lines).toEqual(['# CodeGraphy Export', '', '## Nodes', '']);
  });
});
