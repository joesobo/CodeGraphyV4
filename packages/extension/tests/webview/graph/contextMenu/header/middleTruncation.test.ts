import { describe, expect, it } from 'vitest';
import { middleTruncateText } from '../../../../../src/webview/components/graph/viewport/contextMenu/middleTruncation';

const measureCharacters = (value: string): number => value.length;

describe('graph/contextMenu/header/middleTruncation', () => {
  it('keeps text unchanged when it fits', () => {
    expect(middleTruncateText('src/app.ts', 10, measureCharacters)).toBe('src/app.ts');
  });

  it('preserves both ends when text is too wide', () => {
    const result = middleTruncateText(
      'src/features/settings/AccountSecurityPanel.tsx',
      20,
      measureCharacters,
    );

    expect(result).toHaveLength(20);
    expect(result.startsWith('src/featur')).toBe(true);
    expect(result.endsWith('Panel.tsx')).toBe(true);
    expect(result).toContain('…');
  });

  it('keeps Unicode endpoint characters intact', () => {
    expect(middleTruncateText('🌳-workspace-🚀', 8, measureCharacters)).toMatch(/^🌳.*🚀$/u);
    expect(middleTruncateText('👨‍👩‍👧‍👦-workspace', 15, measureCharacters)).toMatch(/^👨‍👩‍👧‍👦.*e$/u);
  });

  it('uses only an ellipsis when no other text fits', () => {
    expect(middleTruncateText('target', 1, measureCharacters)).toBe('…');
  });
});
