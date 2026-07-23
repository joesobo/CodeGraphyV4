'use client';

import { DarkMode, LightMode } from '@material-symbols-svg/react/rounded';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';

export function ThemeToggle(): React.ReactElement {
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <Button
      aria-label="Toggle color theme"
      className="size-11 rounded-full px-0 text-white/80 hover:bg-white/8 hover:text-white"
      onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
      size="sm"
      variant="ghost"
    >
      {/* Both icons render; CSS shows the one matching the active theme to avoid hydration flicker. */}
      <LightMode aria-hidden="true" className="dark:hidden" />
      <DarkMode aria-hidden="true" className="hidden dark:block" />
    </Button>
  );
}
