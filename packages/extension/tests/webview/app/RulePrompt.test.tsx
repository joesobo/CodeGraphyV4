import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { RulePrompt } from '../../../src/webview/app/RulePrompt';

describe('RulePrompt', () => {
  it('submits edited filter patterns', () => {
    const onSubmit = vi.fn();

    render(
      <RulePrompt
        state={{ kind: 'filter', pattern: 'README.md' }}
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />,
    );

    fireEvent.change(screen.getByLabelText('Add Filter pattern'), {
      target: { value: '**/README.md' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(onSubmit).toHaveBeenCalledWith({
      kind: 'filter',
      pattern: '**/README.md',
    });
  });

  it('renders color input and submits legend rules', () => {
    const onSubmit = vi.fn();

    render(
      <RulePrompt
        state={{ kind: 'legend', pattern: 'src/Helper.java', color: '#808080', target: 'node' }}
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />,
    );

    fireEvent.change(screen.getByLabelText('Add Legend Group pattern'), {
      target: { value: '*.java' },
    });
    fireEvent.change(screen.getByLabelText('Legend rule color'), {
      target: { value: '#3178c6' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(onSubmit).toHaveBeenCalledWith({
      kind: 'legend',
      pattern: '*.java',
      color: '#3178c6',
      target: 'node',
    });
  });
});
