import React from 'react';
import { postMessage } from '../../../vscodeApi';
import { useGraphStore } from '../../../store/state';
import { MaxFilesControl } from '../display/MaxFilesControl';
import { Label } from '../../ui/form/label';
import { Switch } from '../../ui/switch';
import {
  clampMaxFiles,
  decreaseMaxFiles,
  increaseMaxFiles,
  parseMaxFilesInput,
} from '../display/maxFiles';

export function PerformanceSection(): React.ReactElement {
  const maxFiles = useGraphStore((state) => state.maxFiles);
  const showFps = useGraphStore((state) => state.showFps);
  const verboseDiagnostics = useGraphStore((state) => state.verboseDiagnostics);
  const setMaxFiles = useGraphStore((state) => state.setMaxFiles);
  const setShowFps = useGraphStore((state) => state.setShowFps);
  const setVerboseDiagnostics = useGraphStore((state) => state.setVerboseDiagnostics);

  const commitMaxFiles = (value: number): void => {
    const clamped = clampMaxFiles(value);
    setMaxFiles(clamped);
    postMessage({ type: 'UPDATE_MAX_FILES', payload: { maxFiles: clamped } });
  };

  return (
    <section className="mb-2 space-y-3" data-codegraphy-section="settings-performance">
      <MaxFilesControl
        maxFiles={maxFiles}
        onBlur={(value) => commitMaxFiles(parseMaxFilesInput(value) ?? 1)}
        onChange={(value) => {
          const parsed = parseMaxFilesInput(value);
          if (parsed !== null) {
            setMaxFiles(parsed);
          }
        }}
        onDecrease={() => commitMaxFiles(decreaseMaxFiles(maxFiles))}
        onIncrease={() => commitMaxFiles(increaseMaxFiles(maxFiles))}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            commitMaxFiles(parseMaxFilesInput(event.currentTarget.value) ?? 1);
          }
        }}
      />
      <div className="flex items-center justify-between py-0.5">
        <Label htmlFor="verbose-diagnostics" className="text-xs">
          Verbose Diagnostics
        </Label>
        <Switch
          id="verbose-diagnostics"
          checked={verboseDiagnostics}
          onCheckedChange={(checked) => {
            setVerboseDiagnostics(checked);
            postMessage({
              type: 'UPDATE_VERBOSE_DIAGNOSTICS',
              payload: { verboseDiagnostics: checked },
            });
          }}
        />
      </div>
      <div className="flex items-center justify-between py-0.5">
        <Label htmlFor="show-fps" className="text-xs">
          Show FPS
        </Label>
        <Switch
          id="show-fps"
          checked={showFps}
          onCheckedChange={(checked) => {
            setShowFps(checked);
            postMessage({
              type: 'UPDATE_SHOW_FPS',
              payload: { showFps: checked },
            });
          }}
        />
      </div>
    </section>
  );
}
