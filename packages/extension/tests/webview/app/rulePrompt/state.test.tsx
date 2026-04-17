import React from 'react';
import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const dialogSpy = vi.fn();

vi.mock('../../../../src/webview/app/rulePrompt/Dialog', () => ({
  RulePromptDialog: (props: unknown) => {
    dialogSpy(props);
    return <div data-testid="rule-prompt-dialog" />;
  },
}));

import { RulePrompt } from '../../../../src/webview/app/rulePrompt/view';

describe('app/rulePrompt/view state', () => {
  it('passes the source pattern through to the dialog on the initial render', () => {
    dialogSpy.mockClear();

    render(
      <RulePrompt
        state={{ kind: 'filter', pattern: 'README.md' }}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );

    expect(dialogSpy).toHaveBeenCalled();
    expect(dialogSpy.mock.calls[0]?.[0]).toEqual(expect.objectContaining({
      isLegend: false,
      pattern: 'README.md',
    }));
  });

  it('reopens with an empty pattern after the prompt was cleared', () => {
    const { rerender } = render(
      <RulePrompt
        state={{ kind: 'legend', pattern: 'src/**/*.ts', color: '#123456', target: 'edge' }}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );

    dialogSpy.mockClear();

    rerender(
      <RulePrompt
        state={null}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );

    dialogSpy.mockClear();

    rerender(
      <RulePrompt
        state={{ kind: 'filter', pattern: '' }}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );

    expect(dialogSpy).toHaveBeenCalled();
    expect(dialogSpy.mock.calls[0]?.[0]).toEqual(expect.objectContaining({
      isLegend: false,
      pattern: '',
    }));
  });
});
