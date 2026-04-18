import { useEffect, useRef } from 'react';
import { postMessage } from '../../../../vscodeApi';

const COLOR_PERSIST_DEBOUNCE_MS = 150;

type UseColorUpdatesProps = {
  setDirectionColor: (color: string) => void;
};

export function useColorUpdates({
  setDirectionColor,
}: UseColorUpdatesProps): {
  onDirectionColorChange: (value: string) => void;
} {
  const directionColorTimerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    return () => {
      clearTimeout(directionColorTimerRef.current);
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

  return {
    onDirectionColorChange,
  };
}
