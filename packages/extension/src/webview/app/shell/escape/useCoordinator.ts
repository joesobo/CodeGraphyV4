import { useEffect, useRef } from 'react';
import {
  createEscapeCoordinatorHandlers,
  type EscapeCoordinatorOptions,
} from './coordinator';

export function useEscapeCoordinator(options: EscapeCoordinatorOptions): void {
  const optionsRef = useRef(options);
  optionsRef.current = options;

  useEffect(() => {
    const onKeyDownCapture = (event: KeyboardEvent): void => {
      createEscapeCoordinatorHandlers(optionsRef.current).onKeyDownCapture(event);
    };
    const onKeyDown = (event: KeyboardEvent): void => {
      createEscapeCoordinatorHandlers(optionsRef.current).onKeyDown(event);
    };

    window.addEventListener('keydown', onKeyDownCapture, true);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDownCapture, true);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, []);
}
