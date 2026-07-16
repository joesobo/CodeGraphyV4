import {
  useEffect,
  useState,
  type Dispatch,
  type SetStateAction,
} from 'react';
import type { ThemeKind } from '../../../theme/useTheme';
import {
  CSS_COLORS_CHANGED_EVENT,
  markCssColorsChanged,
} from '../../../cssColors/resolver';
import { isThemeChangedMessage } from '../../../theme/brightness/detection';
import { resolveGraphAppearance } from './model';
import type { GraphAppearance } from './model';

const GRAPH_APPEARANCE_KEYS = [
  'focusBorder',
  'labelForeground',
  'labelMutedForeground',
  'linkHighlight',
  'linkMuted',
  'nodeSelectionBorder',
  'stageBackground',
  'transparent',
] as const satisfies readonly (keyof GraphAppearance)[];

function graphAppearancesMatch(first: GraphAppearance, second: GraphAppearance): boolean {
  return GRAPH_APPEARANCE_KEYS.every((key) => first[key] === second[key]);
}

type GraphAppearanceSetter = Dispatch<SetStateAction<GraphAppearance>>;

function selectedAppearance(
  current: GraphAppearance,
  next: GraphAppearance,
  forceStyleRefresh: boolean,
): GraphAppearance {
  if (!graphAppearancesMatch(current, next)) return next;
  return forceStyleRefresh ? { ...next } : current;
}

function refreshGraphAppearance(setAppearance: GraphAppearanceSetter, forceStyleRefresh: boolean): void {
  const nextAppearance = resolveGraphAppearance();
  setAppearance(current => selectedAppearance(current, nextAppearance, forceStyleRefresh));
}

function observeThemeAttributes(onChange: () => void): () => void {
  if (typeof MutationObserver === 'undefined' || typeof document === 'undefined' || !document.body) {
    return () => undefined;
  }
  const observer = new MutationObserver(onChange);
  observer.observe(document.body, {
    attributes: true,
    attributeFilter: ['style', 'class'],
  });
  return () => observer.disconnect();
}

function listenForWindowEvent(
  type: string,
  listener: EventListener,
): () => void {
  if (typeof window === 'undefined') return () => undefined;
  window.addEventListener(type, listener);
  return () => window.removeEventListener(type, listener);
}

function installAppearanceRefresh(setAppearance: GraphAppearanceSetter): () => void {
  const refreshThemeColors = (): void => markCssColorsChanged();
  const refreshStylesheetColors = (): void => refreshGraphAppearance(setAppearance, true);
  const handleMessage = (event: Event): void => {
    if (event instanceof MessageEvent && isThemeChangedMessage(event.data)) refreshThemeColors();
  };

  refreshGraphAppearance(setAppearance, false);
  const cleanups = [
    observeThemeAttributes(refreshThemeColors),
    listenForWindowEvent(CSS_COLORS_CHANGED_EVENT, refreshStylesheetColors),
    listenForWindowEvent('message', handleMessage),
  ];
  return () => cleanups.forEach(cleanup => cleanup());
}

export function useGraphAppearance(theme: ThemeKind): GraphAppearance {
  const [appearance, setAppearance] = useState<GraphAppearance>(() => resolveGraphAppearance());
  useEffect(() => installAppearanceRefresh(setAppearance), [theme]);
  return appearance;
}
