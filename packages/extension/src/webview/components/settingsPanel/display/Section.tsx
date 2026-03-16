import React from 'react';
import type {
  BidirectionalEdgeMode,
  DirectionMode,
} from '../../../../shared/types';
import { postMessage } from '../../../vscodeApi';
import { ColorField } from './ColorField';
import { LabelsToggle } from './LabelsToggle';
import { ModeButtons } from './ModeButtons';
import { Particles } from './Particles';
import { useColorUpdates } from './useColorUpdates';
import { useDisplayStore } from './useDisplayStore';
import { useParticleSettings } from './useParticleSettings';
import { getDisplayViewState } from './viewState';

export function DisplaySection(): React.ReactElement {
  const {
    activeViewId,
    bidirectionalMode,
    directionColor,
    directionMode,
    folderNodeColor,
    particleSize,
    particleSpeed,
    setBidirectionalMode,
    setDirectionColor,
    setDirectionMode,
    setFolderNodeColor,
    setParticleSize,
    setParticleSpeed,
    setShowLabels,
    showLabels,
  } = useDisplayStore();
  const {
    bidirectionalOptions,
    directionOptions,
    displayParticleSpeed,
    resolvedDirectionColor,
    resolvedFolderNodeColor,
    showFolderNodeColor,
    showParticleControls,
  } = getDisplayViewState({
    activeViewId,
    bidirectionalMode,
    directionColor,
    directionMode,
    folderNodeColor,
    particleSpeed,
  });
  const { onDirectionColorChange, onFolderNodeColorChange } = useColorUpdates({
    setDirectionColor,
    setFolderNodeColor,
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

  const onShowLabelsChange = (checked: boolean) => {
    setShowLabels(checked);
    postMessage({ type: 'UPDATE_SHOW_LABELS', payload: { showLabels: checked } });
  };

  return (
    <div className="mb-2 space-y-3">
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

      {showFolderNodeColor && (
        <ColorField
          id="folder-node-color"
          label="Folder Node Color"
          onChange={onFolderNodeColorChange}
          value={resolvedFolderNodeColor}
        />
      )}

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
