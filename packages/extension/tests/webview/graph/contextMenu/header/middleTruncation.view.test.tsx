import { render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MiddleTruncatedText } from '../../../../../src/webview/components/graph/viewport/contextMenu/middleTruncation';

describe('graph/contextMenu/header/MiddleTruncatedText', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('shows the full identity as a title only when the visible name is truncated', () => {
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(10);
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      font: '',
      measureText: (value: string) => ({ width: value.length }),
    } as never);

    const { container, rerender } = render(
      <MiddleTruncatedText
        text="AccountSecurityPanel.tsx"
        tooltipText="AccountSecurityPanel.tsx — src/components/AccountSecurityPanel.tsx"
      />,
    );

    const truncated = container.querySelector('span');
    expect(truncated).not.toBeNull();
    expect(truncated).toHaveTextContent(/^Accou…\.tsx$/);
    expect(truncated).toHaveAttribute(
      'title',
      'AccountSecurityPanel.tsx — src/components/AccountSecurityPanel.tsx',
    );

    rerender(<MiddleTruncatedText text="App.ts" />);
    expect(container.querySelector('span')).not.toHaveAttribute('title');
  });
});
