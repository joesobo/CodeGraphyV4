import type { ComponentProps } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../../src/webview/components/ui/controls/slider', () => ({
  Slider: ({
    onValueChange,
    onValueCommit,
    step,
    value = [],
  }: {
    onValueChange?: (values: number[]) => void;
    onValueCommit?: (values: number[]) => void;
    step?: number;
    value?: number[];
  }) => {
    const id = step === 1 ? 'speed' : 'size';
    const currentValue = value[0] ?? 0;
    const nextValue = currentValue + (step ?? 1);

    return (
      <div data-testid={`${id}-slider`}>
        <button data-testid={`${id}-change`} onClick={() => onValueChange?.([nextValue])} />
        <button data-testid={`${id}-empty-change`} onClick={() => onValueChange?.([])} />
        <button data-testid={`${id}-commit`} onClick={() => onValueCommit?.([currentValue])} />
      </div>
    );
  },
}));

import { Particles } from '../../../../src/webview/components/settingsPanel/display/Particles';

function renderParticles(overrides: Partial<ComponentProps<typeof Particles>> = {}) {
  const props = {
    displayParticleSpeed: 4,
    onParticleSizeChange: vi.fn(),
    onParticleSizeCommit: vi.fn(),
    onParticleSpeedChange: vi.fn(),
    onParticleSpeedCommit: vi.fn(),
    particleSize: 4.5,
    ...overrides,
  } as ComponentProps<typeof Particles>;

  render(<Particles {...props} />);

  return props;
}

describe('display Particles', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders particle summaries', () => {
    renderParticles();

    expect(screen.getByText('Particle Speed')).toBeInTheDocument();
    expect(screen.getByText('Particle Size')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
    expect(screen.getByText('4.5')).toBeInTheDocument();
  });

  it('forwards particle speed changes', () => {
    const props = renderParticles();

    fireEvent.click(screen.getByTestId('speed-change'));

    expect(props.onParticleSpeedChange).toHaveBeenCalledWith(5);
  });

  it('uses the current speed when the slider omits a next value', () => {
    const props = renderParticles();

    fireEvent.click(screen.getByTestId('speed-empty-change'));

    expect(props.onParticleSpeedChange).toHaveBeenCalledWith(4);
  });

  it('forwards particle speed commits', () => {
    const props = renderParticles();

    fireEvent.click(screen.getByTestId('speed-commit'));

    expect(props.onParticleSpeedCommit).toHaveBeenCalledTimes(1);
  });

  it('ignores invalid particle speed change handlers at runtime', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    renderParticles({
      onParticleSpeedChange: undefined as unknown as (value: number) => void,
    });

    expect(() => fireEvent.click(screen.getByTestId('speed-change'))).not.toThrow();
    expect(consoleError).not.toHaveBeenCalled();
  });

  it('ignores invalid particle speed commit handlers at runtime', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    renderParticles({
      onParticleSpeedCommit: undefined as unknown as () => void,
    });

    expect(() => fireEvent.click(screen.getByTestId('speed-commit'))).not.toThrow();
    expect(consoleError).not.toHaveBeenCalled();
  });

  it('forwards particle size changes', () => {
    const props = renderParticles();

    fireEvent.click(screen.getByTestId('size-change'));

    expect(props.onParticleSizeChange).toHaveBeenCalledWith(5);
  });

  it('uses the current size when the slider omits a next value', () => {
    const props = renderParticles();

    fireEvent.click(screen.getByTestId('size-empty-change'));

    expect(props.onParticleSizeChange).toHaveBeenCalledWith(4.5);
  });

  it('forwards particle size commits', () => {
    const props = renderParticles();

    fireEvent.click(screen.getByTestId('size-commit'));

    expect(props.onParticleSizeCommit).toHaveBeenCalledTimes(1);
  });

  it('ignores invalid particle size change handlers at runtime', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    renderParticles({
      onParticleSizeChange: undefined as unknown as (value: number) => void,
    });

    expect(() => fireEvent.click(screen.getByTestId('size-change'))).not.toThrow();
    expect(consoleError).not.toHaveBeenCalled();
  });

  it('ignores invalid particle size commit handlers at runtime', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    renderParticles({
      onParticleSizeCommit: undefined as unknown as () => void,
    });

    expect(() => fireEvent.click(screen.getByTestId('size-commit'))).not.toThrow();
    expect(consoleError).not.toHaveBeenCalled();
  });
});
