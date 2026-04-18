import { describe, expect, it } from 'vitest';
import { buildNextFilterPatterns, buildNextLegendRules } from '../../../../src/webview/app/rulePrompt/rules';

describe('app/rulePrompt/rules', () => {
  it('adds trimmed filter patterns and skips blanks or duplicates', () => {
    expect(buildNextFilterPatterns(['src/**'], ' src/lib/** ')).toEqual(['src/**', 'src/lib/**']);
    expect(buildNextFilterPatterns(['src/**'], ' src/** ')).toBeNull();
    expect(buildNextFilterPatterns(['src/**'], '   ')).toBeNull();
  });

  it('adds trimmed legend rules and skips blank patterns', () => {
    expect(
      buildNextLegendRules(
        [{ id: 'existing', pattern: 'src/**', color: '#123456', target: 'node' }],
        { kind: 'legend', pattern: ' notes/** ', color: '#abcdef', target: 'edge' },
        () => 'generated-id',
      ),
    ).toEqual([
      { id: 'existing', pattern: 'src/**', color: '#123456', target: 'node' },
      { id: 'generated-id', pattern: 'notes/**', color: '#abcdef', target: 'edge' },
    ]);

    expect(
      buildNextLegendRules(
        [],
        { kind: 'legend', pattern: '   ', color: '#abcdef', target: 'node' },
        () => 'generated-id',
      ),
    ).toBeNull();
  });
});
