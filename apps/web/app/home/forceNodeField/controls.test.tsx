import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ForceNodeControls } from './controls';
import { ForceNodeSettingsProvider } from './settings';

function renderControls(): void {
  render(
    <ForceNodeSettingsProvider>
      <ForceNodeControls />
    </ForceNodeSettingsProvider>,
  );
}

describe('ForceNodeControls', () => {
  it('lets visitors adjust and reset hero graph forces', () => {
    renderControls();

    const sizeSlider = screen.getByRole('slider', { name: 'Node size' });

    expect(sizeSlider).toHaveValue('50');

    fireEvent.change(sizeSlider, { target: { value: '88' } });

    expect(sizeSlider).toHaveValue('88');

    fireEvent.click(screen.getByRole('button', { name: 'Reset' }));

    expect(sizeSlider).toHaveValue('50');
  });
});
