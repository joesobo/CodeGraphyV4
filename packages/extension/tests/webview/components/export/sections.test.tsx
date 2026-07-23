import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ExportSection } from '../../../../src/webview/components/export/sections';

describe('webview/components/export/sections', () => {
  it('renders nothing when an export section has no items', () => {
    const { container } = render(<ExportSection title="Graph" items={[]} />);

    expect(container).toBeEmptyDOMElement();
  });

  it('renders export actions', () => {
    const onSelect = vi.fn();

    render(
      <ExportSection
        title="Graph"
        items={[{ id: 'json', label: 'JSON', onSelect }]}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'JSON' }));

    expect(onSelect).toHaveBeenCalledOnce();
  });
});
