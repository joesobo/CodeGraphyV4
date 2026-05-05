import React from 'react';
import { postMessage } from '../../../vscodeApi';
import { useGraphStore } from '../../../store/state';
import { MaxFilesControl } from '../display/MaxFilesControl';
import {
  clampMaxFiles,
  decreaseMaxFiles,
  increaseMaxFiles,
  parseMaxFilesInput,
} from '../display/maxFiles';

export function PerformanceSection(): React.ReactElement {
  const maxFiles = useGraphStore((state) => state.maxFiles);
  const setMaxFiles = useGraphStore((state) => state.setMaxFiles);

  const commitMaxFiles = (value: number): void => {
    const clamped = clampMaxFiles(value);
    setMaxFiles(clamped);
    postMessage({ type: 'UPDATE_MAX_FILES', payload: { maxFiles: clamped } });
  };

  return (
    <div className="mb-2 space-y-3">
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
    </div>
  );
}
