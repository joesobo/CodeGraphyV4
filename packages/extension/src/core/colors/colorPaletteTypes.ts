/**
 * @fileoverview Types and constants for color palette management.
 * @module core/colors/colorPaletteTypes
 */

export type ColorSource = 'user' | 'plugin' | 'generated';

export interface IColorInfo {
  color: string;
  source: ColorSource;
}

export interface IColorGenerationOptions {
  lightMin?: number;
  lightMax?: number;
  chromaMin?: number;
  chromaMax?: number;
}

export const DEFAULT_FALLBACK_COLOR = '#A1A1AA';
