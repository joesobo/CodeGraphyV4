import { describe, expect, it } from 'vitest';
import {
  createSubmittedRulePromptState,
  getRulePromptColor,
  getRulePromptTitle,
} from '../../../../src/webview/app/rulePrompt/model';

describe('app/rulePrompt/model', () => {
  it('derives title and color defaults from the prompt state', () => {
    expect(getRulePromptTitle(null)).toBe('');
    expect(getRulePromptTitle({ kind: 'filter', pattern: 'README.md' })).toBe('Add Filter');
    expect(getRulePromptTitle({ kind: 'legend', pattern: '*.ts', color: '#123456', target: 'node' })).toBe('Add Legend Group');
    expect(getRulePromptColor(null)).toBe('#808080');
    expect(getRulePromptColor({ kind: 'filter', pattern: 'README.md' })).toBe('#808080');
    expect(getRulePromptColor({ kind: 'legend', pattern: '*.ts', color: '#123456', target: 'node' })).toBe('#123456');
  });

  it('creates submitted filter and legend prompt states', () => {
    expect(createSubmittedRulePromptState(
      { kind: 'filter', pattern: 'README.md' },
      '**/README.md',
      '#000000',
    )).toEqual({
      kind: 'filter',
      pattern: '**/README.md',
    });

    expect(createSubmittedRulePromptState(
      { kind: 'legend', pattern: '*.ts', color: '#111111', target: 'edge' },
      'src/**/*.ts',
      '#222222',
    )).toEqual({
      kind: 'legend',
      pattern: 'src/**/*.ts',
      color: '#222222',
      target: 'edge',
    });
  });
});
