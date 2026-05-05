import React from 'react';
import type { BidirectionalEdgeMode, DirectionMode } from '../../../../shared/settings/modes';
import { postMessage } from '../../../vscodeApi';
import { ColorField } from './ColorField';
import { LabelsToggle } from './LabelsToggle';
import { ModeButtons } from './ModeButtons';
import { OrphansToggle } from './OrphansToggle';
import { Particles } from './Particles';
import { Label } from '../../ui/form/label';
import { Slider } from '../../ui/controls/slider';
import { Switch } from '../../ui/switch';
import { useColorUpdates } from './use/colorUpdates';
import { useDisplayStore } from './use/store';
import { useParticleSettings } from './use/particles';
import { getDisplayViewState } from './state/selectors';

export function DisplaySection(): React.ReactElement {
  const {
    bidirectionalMode,
    depthLimit,
    depthMode,
    directionColor,
    directionMode,
    graphHasIndex,
    graphMode,
    maxDepthLimit,
    particleSize,
    particleSpeed,
    setBidirectionalMode,
    setDepthMode,
    setDirectionColor,
    setDirectionMode,
    setGraphMode,
    setParticleSize,
    setParticleSpeed,
    setShowLabels,
    setShowOrphans,
    showLabels,
    showOrphans,
  } = useDisplayStore();
  const {
    bidirectionalOptions,
    directionOptions,
    displayParticleSpeed,
    resolvedDirectionColor,
    showParticleControls,
  } = getDisplayViewState({
    bidirectionalMode,
    directionColor,
    directionMode,
    particleSpeed,
  });
  const { onDirectionColorChange } = useColorUpdates({
    setDirectionColor,
  });
  const {
    onParticleSizeChange,
    onParticleSizeCommit,
    onParticleSpeedChange,
    onParticleSpeedCommit,
  } = useParticleSettings({
    setParticleSize,
    setParticleSpeed,
  });

  const onBidirectionalModeChange = (mode: BidirectionalEdgeMode) => {
    setBidirectionalMode(mode);
    postMessage({ type: 'UPDATE_BIDIRECTIONAL_MODE', payload: { bidirectionalMode: mode } });
  };

  const onDirectionModeChange = (mode: DirectionMode) => {
    setDirectionMode(mode);
    postMessage({ type: 'UPDATE_DIRECTION_MODE', payload: { directionMode: mode } });
  };

  const onGraphModeChange = (mode: '2d' | '3d') => {
    setGraphMode(mode);
  };

  const onDepthModeChange = (checked: boolean) => {
    setDepthMode(checked);
    postMessage({ type: 'UPDATE_DEPTH_MODE', payload: { depthMode: checked } });
  };

  const onShowLabelsChange = (checked: boolean) => {
    setShowLabels(checked);
    postMessage({ type: 'UPDATE_SHOW_LABELS', payload: { showLabels: checked } });
  };

  const onShowOrphansChange = (checked: boolean) => {
    setShowOrphans(checked);
    postMessage({ type: 'UPDATE_SHOW_ORPHANS', payload: { showOrphans: checked } });
  };

  return (
    <div className="mb-2 space-y-3">
      <ModeButtons
        label="Renderer"
        onSelect={onGraphModeChange}
        options={[
          {
            label: '2D',
            pressed: graphMode === '2d',
            value: '2d',
            variant: graphMode === '2d' ? 'secondary' : 'outline',
          },
          {
            label: '3D',
            pressed: graphMode === '3d',
            value: '3d',
            variant: graphMode === '3d' ? 'secondary' : 'outline',
          },
        ]}
      />

      <div className="space-y-2">
        <div className="flex items-center justify-between py-0.5">
          <Label htmlFor="depth-mode" className="text-xs">
            Depth Mode
          </Label>
          <Switch
            id="depth-mode"
            checked={depthMode}
            disabled={!graphHasIndex}
            onCheckedChange={onDepthModeChange}
          />
        </div>
        <div>
          <div className="mb-1 flex items-center justify-between">
            <Label className="text-xs text-muted-foreground">Depth Limit</Label>
            <span className="font-mono text-xs text-muted-foreground">{depthLimit}</span>
          </div>
          <Slider
            aria-label="Depth limit"
            disabled={!graphHasIndex || !depthMode}
            min={1}
            max={maxDepthLimit}
            step={1}
            value={[Math.min(depthLimit, maxDepthLimit)]}
            onValueChange={(values) => {
              const nextDepthLimit = values[0] ?? depthLimit;
              postMessage({ type: 'CHANGE_DEPTH_LIMIT', payload: { depthLimit: nextDepthLimit } });
            }}
          />
        </div>
      </div>

      <ModeButtons
        label="Direction"
        onSelect={onDirectionModeChange}
        options={directionOptions}
      />

      <ModeButtons
        label="Bidirectional Edges"
        onSelect={onBidirectionalModeChange}
        options={bidirectionalOptions}
      />

      <ColorField
        id="direction-color"
        label="Direction Color"
        onChange={onDirectionColorChange}
        value={resolvedDirectionColor}
      />

      <OrphansToggle
        onCheckedChange={onShowOrphansChange}
        showOrphans={showOrphans}
      />

      {showParticleControls && (
        <Particles
          displayParticleSpeed={displayParticleSpeed}
          onParticleSizeChange={onParticleSizeChange}
          onParticleSizeCommit={onParticleSizeCommit}
          onParticleSpeedChange={onParticleSpeedChange}
          onParticleSpeedCommit={onParticleSpeedCommit}
          particleSize={particleSize}
        />
      )}

      <LabelsToggle checked={showLabels} onCheckedChange={onShowLabelsChange} />
    </div>
  );
}
