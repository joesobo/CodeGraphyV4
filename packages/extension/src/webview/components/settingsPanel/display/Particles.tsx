import React from 'react';
import { Label } from '../../ui/form/label';
import { Slider } from '../../ui/controls/slider';

type ParticlesProps = {
  displayParticleSpeed: number;
  onParticleSizeChange: (value: number) => void;
  onParticleSizeCommit: () => void;
  onParticleSpeedChange: (value: number) => void;
  onParticleSpeedCommit: () => void;
  particleSize: number;
};

export function Particles({
  displayParticleSpeed,
  onParticleSizeChange,
  onParticleSizeCommit,
  onParticleSpeedChange,
  onParticleSpeedCommit,
  particleSize,
}: ParticlesProps): React.ReactElement {
  const handleParticleSpeedChange = (value: number) => {
    if (typeof onParticleSpeedChange !== 'function') {
      return;
    }

    onParticleSpeedChange(value);
  };

  const handleParticleSizeChange = (value: number) => {
    if (typeof onParticleSizeChange !== 'function') {
      return;
    }

    onParticleSizeChange(value);
  };

  const handleParticleSpeedCommit = () => {
    if (typeof onParticleSpeedCommit !== 'function') {
      return;
    }

    onParticleSpeedCommit();
  };

  const handleParticleSizeCommit = () => {
    if (typeof onParticleSizeCommit !== 'function') {
      return;
    }

    onParticleSizeCommit();
  };

  return (
    <div className="space-y-3 pl-2 border-l border-border">
      <div>
        <div className="flex items-center justify-between mb-1">
          <Label className="text-xs">Particle Speed</Label>
          <span className="text-xs text-muted-foreground font-mono">
            {Math.round(displayParticleSpeed)}
          </span>
        </div>
        <Slider
          min={1}
          max={10}
          step={1}
          value={[displayParticleSpeed]}
          onValueChange={(values) => handleParticleSpeedChange(values[0] ?? displayParticleSpeed)}
          onValueCommit={handleParticleSpeedCommit}
        />
      </div>
      <div>
        <div className="flex items-center justify-between mb-1">
          <Label className="text-xs">Particle Size</Label>
          <span className="text-xs text-muted-foreground font-mono">{particleSize.toFixed(1)}</span>
        </div>
        <Slider
          min={1}
          max={10}
          step={0.5}
          value={[particleSize]}
          onValueChange={(values) => handleParticleSizeChange(values[0] ?? particleSize)}
          onValueCommit={handleParticleSizeCommit}
        />
      </div>
    </div>
  );
}
