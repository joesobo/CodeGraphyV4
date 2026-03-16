import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Particles } from '../../../../src/webview/components/settingsPanel/display/Particles';

describe('display Particles', () => {
  it('renders particle summaries', () => {
    render(
      <Particles
        displayParticleSpeed={4}
        onParticleSizeChange={vi.fn()}
        onParticleSizeCommit={vi.fn()}
        onParticleSpeedChange={vi.fn()}
        onParticleSpeedCommit={vi.fn()}
        particleSize={4.5}
      />
    );

    expect(screen.getByText('Particle Speed')).toBeInTheDocument();
    expect(screen.getByText('Particle Size')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
    expect(screen.getByText('4.5')).toBeInTheDocument();
  });

  it('forwards slider changes and commits', () => {
    const onParticleSpeedChange = vi.fn();
    const onParticleSpeedCommit = vi.fn();
    render(
      <Particles
        displayParticleSpeed={4}
        onParticleSizeChange={vi.fn()}
        onParticleSizeCommit={vi.fn()}
        onParticleSpeedChange={onParticleSpeedChange}
        onParticleSpeedCommit={onParticleSpeedCommit}
        particleSize={4.5}
      />
    );

    const speedSlider = screen.getAllByRole('slider')[0];
    fireEvent.keyDown(speedSlider, { key: 'ArrowRight' });
    fireEvent.keyUp(speedSlider, { key: 'ArrowRight' });

    expect(onParticleSpeedChange).toHaveBeenCalled();
    expect(onParticleSpeedCommit).toHaveBeenCalled();
  });
});
