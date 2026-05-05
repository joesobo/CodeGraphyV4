import { useEffect, useState } from 'react';
import type { ThemeKind } from '../../../theme/useTheme';
import { isThemeChangedMessage } from '../../../theme/brightness/detection';
import { resolveGraphAppearance } from './model';
import type { GraphAppearance } from './model';

function graphAppearancesMatch(first: GraphAppearance, second: GraphAppearance): boolean {
  return (
    first.focusBorder === second.focusBorder
    && first.labelForeground === second.labelForeground
    && first.labelMutedForeground === second.labelMutedForeground
    && first.linkHighlight === second.linkHighlight
    && first.linkMuted === second.linkMuted
    && first.meshDimmed === second.meshDimmed
    && first.meshSelected === second.meshSelected
    && first.nodeSelectionBorder === second.nodeSelectionBorder
    && first.stageBackground === second.stageBackground
    && first.stageBorder === second.stageBorder
    && first.transparent === second.transparent
  );
}

export function useGraphAppearance(theme: ThemeKind): GraphAppearance {
  const [appearance, setAppearance] = useState<GraphAppearance>(() => resolveGraphAppearance());

  useEffect(() => {
    const refreshAppearance = (): void => {
      const nextAppearance = resolveGraphAppearance();
      setAppearance((currentAppearance) => (
        graphAppearancesMatch(currentAppearance, nextAppearance)
          ? currentAppearance
          : nextAppearance
      ));
    };

    refreshAppearance();

    const observer = typeof MutationObserver !== 'undefined' && typeof document !== 'undefined' && document.body
      ? new MutationObserver(refreshAppearance)
      : null;

    observer?.observe(document.body, {
      attributes: true,
      attributeFilter: ['style', 'class'],
    });

    const handleMessage = (event: MessageEvent<unknown>): void => {
      if (!isThemeChangedMessage(event.data)) return;
      refreshAppearance();
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('message', handleMessage);
    }

    return () => {
      observer?.disconnect();
      if (typeof window !== 'undefined') {
        window.removeEventListener('message', handleMessage);
      }
    };
  }, [theme]);

  return appearance;
}
