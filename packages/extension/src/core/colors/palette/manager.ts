/**
 * @fileoverview Dynamic color palette generation and management.
 * @module core/colors/palette/manager
 */

import distinctColors from 'distinct-colors';
import { normalizeExtension } from '../extension/path';
import { resolveColor } from '../resolution/color';
import { resolveColorInfo } from '../resolution/info';
import { classifyAndSetColors, mergeColors } from '../classification';
import type { IColorInfo, IColorGenerationOptions } from './colorTypes';

export { DEFAULT_FALLBACK_COLOR } from './colorTypes';
export type { ColorSource, IColorInfo, IColorGenerationOptions } from './colorTypes';

export class ColorPaletteManager {
  private generatedColors: Map<string, string> = new Map();
  private pluginExtensionColors: Map<string, string> = new Map();
  private pluginPatternColors: Map<string, string> = new Map();
  private userExtensionColors: Map<string, string> = new Map();
  private userPatternColors: Map<string, string> = new Map();
  private generationOptions: IColorGenerationOptions;

  constructor(options: IColorGenerationOptions = {}) {
    this.generationOptions = {
      lightMin: options.lightMin ?? 60,
      lightMax: options.lightMax ?? 85,
      chromaMin: options.chromaMin ?? 40,
      chromaMax: options.chromaMax ?? 70,
    };
  }

  setPluginColors(colors: Record<string, string>): void {
    classifyAndSetColors(colors, this.pluginExtensionColors, this.pluginPatternColors);
  }

  addPluginColors(colors: Record<string, string>): void {
    mergeColors(colors, this.pluginExtensionColors, this.pluginPatternColors);
  }

  setUserColors(colors: Record<string, string>): void {
    classifyAndSetColors(colors, this.userExtensionColors, this.userPatternColors);
  }

  generateForExtensions(extensions: string[]): void {
    const uniqueExtensions = [...new Set(
      extensions.map(ext => normalizeExtension(ext))
    )].sort();

    if (uniqueExtensions.length === 0) {
      return;
    }

    const palette = distinctColors({
      count: uniqueExtensions.length,
      lightMin: this.generationOptions.lightMin,
      lightMax: this.generationOptions.lightMax,
      chromaMin: this.generationOptions.chromaMin,
      chromaMax: this.generationOptions.chromaMax,
    });

    this.generatedColors.clear();
    uniqueExtensions.forEach((ext, index) => {
      this.generatedColors.set(ext, palette[index].hex());
    });
  }

  getColorForFile(filePath: string): string {
    return resolveColor(
      filePath,
      this.userPatternColors,
      this.pluginPatternColors,
      this.userExtensionColors,
      this.pluginExtensionColors,
      this.generatedColors,
    );
  }

  getColor(extension: string): string {
    const normalizedExt = normalizeExtension(extension);
    const userColor = this.userExtensionColors.get(normalizedExt);
    if (userColor) return userColor;
    const pluginColor = this.pluginExtensionColors.get(normalizedExt);
    if (pluginColor) return pluginColor;
    const generatedColor = this.generatedColors.get(normalizedExt);
    if (generatedColor) return generatedColor;
    return '#A1A1AA';
  }

  getColorInfoForFile(filePath: string): IColorInfo {
    return resolveColorInfo(
      filePath,
      this.userPatternColors,
      this.pluginPatternColors,
      this.userExtensionColors,
      this.pluginExtensionColors,
      this.generatedColors,
    );
  }

  getColorInfo(extension: string): IColorInfo {
    const normalizedExt = normalizeExtension(extension);
    const userColor = this.userExtensionColors.get(normalizedExt);
    if (userColor) return { color: userColor, source: 'user' };
    const pluginColor = this.pluginExtensionColors.get(normalizedExt);
    if (pluginColor) return { color: pluginColor, source: 'plugin' };
    const generatedColor = this.generatedColors.get(normalizedExt);
    if (generatedColor) return { color: generatedColor, source: 'generated' };
    return { color: '#A1A1AA', source: 'generated' };
  }

  getColorMap(): Record<string, string> {
    const map: Record<string, string> = {};
    for (const [ext, color] of this.generatedColors) map[ext] = color;
    for (const [ext, color] of this.pluginExtensionColors) map[ext] = color;
    for (const [pattern, color] of this.pluginPatternColors) map[pattern] = color;
    for (const [ext, color] of this.userExtensionColors) map[ext] = color;
    for (const [pattern, color] of this.userPatternColors) map[pattern] = color;
    return map;
  }

  clear(): void {
    this.generatedColors.clear();
    this.pluginExtensionColors.clear();
    this.pluginPatternColors.clear();
    this.userExtensionColors.clear();
    this.userPatternColors.clear();
  }
}
