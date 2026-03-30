import { useEffect, useRef } from 'react';
import { postMessage } from '../../../../vscodeApi';

const COLOR_PERSIST_DEBOUNCE_MS = 150;

type UseColorUpdatesProps = {
  setDirectionColor: (color: string) => void;
  setFolderNodeColor: (color: string) => void;
};

export function useColorUpdates({
  setDirectionColor,
  setFolderNodeColor,
}: UseColorUpdatesProps): {
  onDirectionColorChange: (value: string) => void;
  onFolderNodeColorChange: (value: string) => void;
} {
  const directionColorTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const folderColorTimerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    return () => {
      clearTimeout(directionColorTimerRef.current);
      clearTimeout(folderColorTimerRef.current);
    };
  }, []);

  const onDirectionColorChange = (value: string) => {
    const normalized = value.toUpperCase();
    setDirectionColor(normalized);
    clearTimeout(directionColorTimerRef.current);
    directionColorTimerRef.current = setTimeout(() => {
      postMessage({ type: 'UPDATE_DIRECTION_COLOR', payload: { directionColor: normalized } });
    }, COLOR_PERSIST_DEBOUNCE_MS);
  };

  const onFolderNodeColorChange = (value: string) => {
    const normalized = value.toUpperCase();
    setFolderNodeColor(normalized);
    clearTimeout(folderColorTimerRef.current);
    folderColorTimerRef.current = setTimeout(() => {
      postMessage({ type: 'UPDATE_FOLDER_NODE_COLOR', payload: { folderNodeColor: normalized } });
    }, COLOR_PERSIST_DEBOUNCE_MS);
  };

  return {
    onDirectionColorChange,
    onFolderNodeColorChange,
  };
}
