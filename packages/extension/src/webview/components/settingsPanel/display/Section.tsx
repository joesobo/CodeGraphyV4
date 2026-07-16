import React from 'react';
import type { BidirectionalEdgeMode, DirectionMode } from '../../../../shared/settings/modes';
import { postMessage } from '../../../vscodeApi';
import { LabelsToggle } from './LabelsToggle';
import { ModeButtons } from './ModeButtons';
import { OrphansToggle } from './OrphansToggle';
import { Particles } from './Particles';
import { Label } from '../../ui/form/label';
import { Slider } from '../../ui/controls/slider';
import { Switch } from '../../ui/switch';
import { useDisplayStore } from './use/store';
import { useParticleSettings } from './use/particles';
import { getDisplayViewState } from './state/selectors';
import { MinimapToggle } from './MinimapToggle';

export function DisplaySection(): React.ReactElement {
  const {
    bidirectionalMode,
    depthLimit,
    depthMode,
    directionMode,
    graphHasIndex,
    maxDepthLimit,
    particleSize,
    particleSpeed,
    setBidirectionalMode,
    setDepthMode,
    setDirectionMode,
    setParticleSize,
    setParticleSpeed,
    setShowLabels,
    setShowMinimap,
    setShowOrphans,
    showLabels,
    showMinimap,
    showOrphans,
  } = useDisplayStore();
  const {
    bidirectionalOptions,
    directionOptions,
    displayParticleSpeed,
    showParticleControls,
  } = getDisplayViewState({
    bidirectionalMode,
    directionMode,
    particleSpeed,
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

  const onShowMinimapChange = (checked: boolean) => {
    setShowMinimap(checked);
    postMessage({ type: 'UPDATE_SHOW_MINIMAP', payload: { showMinimap: checked } });
  };

  return (
    <section className="mb-2 space-y-3" data-codegraphy-section="settings-display">
      <div
        data-codegraphy-control="display-modes"
        data-testid="display-mode-controls"
        className="space-y-2"
      >
        <div data-codegraphy-row="display-direction" data-testid="display-direction-row">
          <ModeButtons
            label="Direction"
            onSelect={onDirectionModeChange}
            options={directionOptions}
          />
        </div>

        <div data-codegraphy-row="display-bidirectional" data-testid="display-bidirectional-row">
          <ModeButtons
            label="Bidirectional Edges"
            onSelect={onBidirectionalModeChange}
            options={bidirectionalOptions}
          />
        </div>
      </div>

      <div className="space-y-2" data-codegraphy-control="display-depth">
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
        {depthMode ? (
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
        ) : null}
      </div>

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
      <MinimapToggle checked={showMinimap} onCheckedChange={onShowMinimapChange} />
    </section>
  );
}
