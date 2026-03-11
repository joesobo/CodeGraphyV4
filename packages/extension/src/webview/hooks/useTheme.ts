/**
 * @fileoverview Hook for detecting and responding to VSCode theme changes.
 */

import { useState, useEffect } from 'react';

export type ThemeKind = 'light' | 'dark' | 'high-contrast';

/**
 * Detects the current VSCode theme from CSS variables.
 */
function detectTheme(): ThemeKind {
  // Check for high contrast first
  const bodyBg = getComputedStyle(document.body).getPropertyValue('--vscode-editor-background').trim();
  
  if (!bodyBg) return 'dark'; // Default
  
  // Parse the color and determine brightness
  const rgb = parseColor(bodyBg);
  if (!rgb) return 'dark';
  
  // Calculate perceived brightness
  const brightness = (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;
  
  // High contrast themes typically have very dark or very light backgrounds
  if (brightness < 30 || brightness > 240) {
    return 'high-contrast';
  }
  
  return brightness > 128 ? 'light' : 'dark';
}

/**
 * Parses a CSS color string to RGB values.
 */
function parseColor(color: string): { r: number; g: number; b: number } | null {
  // Handle hex colors
  const hexMatch = color.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
  if (hexMatch) {
    return {
      r: parseInt(hexMatch[1], 16),
      g: parseInt(hexMatch[2], 16),
      b: parseInt(hexMatch[3], 16),
    };
  }
  
  // Handle rgb/rgba
  const rgbMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (rgbMatch) {
    return {
      r: parseInt(rgbMatch[1]),
      g: parseInt(rgbMatch[2]),
      b: parseInt(rgbMatch[3]),
    };
  }
  
  return null;
}

/**
 * Adjusts a hex color for light theme (darker, more saturated).
 */
export function adjustColorForLightTheme(hexColor: string): string {
  const rgb = parseColor(hexColor);
  if (!rgb) return hexColor;
  
  // Darken and increase saturation for light theme
  const darkenFactor = 0.7;
  
  return `#${Math.round(rgb.r * darkenFactor).toString(16).padStart(2, '0')}${Math.round(rgb.g * darkenFactor).toString(16).padStart(2, '0')}${Math.round(rgb.b * darkenFactor).toString(16).padStart(2, '0')}`;
}

/**
 * Hook that returns the current VSCode theme and updates on changes.
 */
export function useTheme(): ThemeKind {
  const [theme, setTheme] = useState<ThemeKind>(() => detectTheme());

  useEffect(() => {
    // Re-detect theme when CSS variables change
    const observer = new MutationObserver(() => {
      setTheme(detectTheme());
    });

    // Observe changes to the body's style (VSCode updates CSS vars there)
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['style', 'class'],
    });

    // Also listen for messages from extension
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'THEME_CHANGED') {
        setTheme(event.data.payload.kind);
      }
    };
    
    window.addEventListener('message', handleMessage);

    return () => {
      observer.disconnect();
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  return theme;
}
