import type { ThemeKind } from '../../theme/useTheme';

export function getGraphSurfaceColors(theme: ThemeKind): {
  backgroundColor: string;
  borderColor: string;
} {
  const isLight = theme === 'light';
  return {
    backgroundColor: isLight ? '#f5f5f5' : '#18181b',
    borderColor: isLight ? '#d4d4d4' : 'rgb(63, 63, 70)',
  };
}
